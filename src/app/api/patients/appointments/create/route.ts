import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPatientSession } from '@/lib/jwt';
import { listaWizytPacjenta, znajdzWizyteNaLiscie, type PozycjaListyWizyt } from '@/lib/prodentisAppointment';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TERMINAL_STATUSES = ['cancelled', 'rescheduled', 'cancellation_pending', 'reschedule_pending'];

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { prodentis_id, appointment_date, appointment_end_date, doctor_id, doctor_name, schedule_appointment_id } = body;

        
        const payload = await verifyPatientSession(request);

        if (!payload) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: patient, error: patientError } = await supabase
            .from('patients')
            .select('id, prodentis_id')
            .eq('prodentis_id', payload.prodentisId)
            .single();

        if (patientError || !patient) {
            return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
        }

        /**
         * 🔴 PIĘTRO A BRAMKI WŁASNOŚCI (P-001). Do 05.09 `schedule_appointment_id` jechał
         * z ciała żądania WPROST do kolumny `prodentis_id`, a ta kolumna idzie potem
         * dosłownie do adresu `/api/schedule/appointment/<id>` przy odwołaniu, przełożeniu
         * i potwierdzeniu obecności. Wystarczyło podać cudzy numer wizyty, żeby założyć
         * sobie wiersz wskazujący na cudzą wizytę — i operować na niej kluczem gabinetowym.
         *
         * 🔑 Dlaczego LISTA, a nie porównanie pól: adres `/api/patient/<id>/future-appointments`
         * jest budowany z `prodentisId` wziętego z PODPISANEGO TOKENU, więc własność wynika
         * z konstrukcji zapytania, a nie z pola, które PMS może kiedyś przestać oddawać.
         *
         * 🪤 Datę i lekarza bierzemy z POZYCJI LISTY, nie z ciała żądania — ale DOSŁOWNIE,
         * bez odtwarzania. Lista oddaje `2026-09-11T14:30:00.000Z` tam, gdzie widok szczegółu
         * pokazuje `16:30` czasu ściennego; to ta sama godzina, ale składanie jej z części
         * przesunęłoby zapis o offset strefy. Klient i tak dostał tę samą wartość z
         * `upcoming-appointments`, więc format się nie zmienia i nie powstają duplikaty.
         */
        let pozycjaZPMS: PozycjaListyWizyt | null = null;
        if (schedule_appointment_id) {
            const lista = await listaWizytPacjenta(payload.prodentisId);
            if (!lista.ok) {
                // 🪤 „Nie wiemy” NIE może znaczyć „to cudza wizyta”, ale też nie wolno na tej
                // niewiedzy zakładać nowego wiersza wskazującego na PMS. 503 jest uczciwe:
                // przy leżącym PMS pacjent i tak nie ma skąd wziąć listy wizyt.
                console.warn('[Create] PMS niedostępny — nie mogę potwierdzić własności wizyty');
                return NextResponse.json(
                    { error: 'Nie możemy teraz potwierdzić Twoich wizyt. Spróbuj za chwilę.' },
                    { status: 503 },
                );
            }
            pozycjaZPMS = znajdzWizyteNaLiscie(lista.lista, schedule_appointment_id);
            if (!pozycjaZPMS) {
                console.error(
                    `[OBCA-WIZYTA] CREATE: pacjent ${payload.prodentisId} podał wizytę`
                    + ` ${schedule_appointment_id}, której nie ma na jego liście — ODMOWA`,
                );
                return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
            }
        }

        // 🔑 Od tej chwili termin i lekarz pochodzą z PMS, nie z ciała żądania.
        const dataWizyty = pozycjaZPMS ? pozycjaZPMS.date : appointment_date;
        const dataKonca = pozycjaZPMS
            ? new Date(new Date(pozycjaZPMS.date).getTime() + (pozycjaZPMS.duration || 30) * 60_000).toISOString()
            : appointment_end_date;
        const lekarzId = pozycjaZPMS?.doctor?.id ?? doctor_id;
        /**
         * 🪤 Prodentis dokleja do nazwiska znacznik gabinetu „(I)". Dotąd czyścił go KLIENT
         * (dashboard robił to regexem na „(I)"), ale od P-001 źródłem nazwy jest
         * SERWER — więc czyszczenie musi stać tutaj, inaczej surowa nazwa idzie dosłownie
         * w mail do gabinetu, Telegram, push i tabele panelu.
         * 🔑 `typeof` nie jest ozdobą: `.replace` na nie-stringu z PMS wywala CAŁE `create`
         * na 500, a pacjent traci przyciski akcji. Lekarstwo groźniejsze od choroby.
         */
        const surowaNazwa = pozycjaZPMS?.doctor?.name ?? doctor_name;
        const lekarzNazwa = typeof surowaNazwa === 'string'
            ? surowaNazwa.replace(/\s*\(I\)\s*/g, ' ').trim()
            : surowaNazwa;

        // Search for existing record: by schedule_appointment_id (prodentis_id field) OR by date range
        const searchDate = new Date(dataWizyty);
        const rangeStart = new Date(searchDate.getTime() - 120000);
        const rangeEnd = new Date(searchDate.getTime() + 120000);

        // Strategy 1: Find by schedule appointment ID
        let existing: any = null;
        if (schedule_appointment_id) {
            const { data } = await supabase
                .from('appointment_actions')
                .select('*')
                .eq('patient_id', patient.id)
                .eq('prodentis_id', schedule_appointment_id)
                .maybeSingle();
            existing = data;
        }

        // Strategy 2: Find by date range
        if (!existing) {
            const { data } = await supabase
                .from('appointment_actions')
                .select('*')
                .eq('patient_id', patient.id)
                .gte('appointment_date', rangeStart.toISOString())
                .lt('appointment_date', rangeEnd.toISOString())
                .limit(1)
                .maybeSingle();
            existing = data;
        }

        if (existing) {
            if (TERMINAL_STATUSES.includes(existing.status)) {
                // Delete the stale record
                console.log('[Create] Deleting stale record', existing.id, 'status:', existing.status, 'date:', existing.appointment_date);
                await supabase.from('appointment_actions').delete().eq('id', existing.id);

                // Create fresh record
                const { data: fresh, error: freshError } = await supabase
                    .from('appointment_actions')
                    .insert({
                        patient_id: patient.id,
                        // 🪤 NIE schodzimy na `patient.prodentis_id`: ta kolumna trzyma identyfikator WIZYTY
                        // i idzie WPROST do adresu `/api/schedule/appointment/<id>`. Identyfikator
                        // pacjenta ma ten sam kształt (10 cyfr), więc w najgorszym razie skasowałby
                        // CUDZĄ wizytę o zbieżnym numerze. `null` jest uczciwe — ścieżki zapisu
                        // sprawdzają jego brak i pomijają operację na PMS zamiast zgadywać.
                        // 🔑 P-001: identyfikator przeszedł już weryfikację wobec listy wizyt
                        // TEGO pacjenta; `prodentis_id` z ciała (id PACJENTA z dashboardu weba)
                        // NIE jest już awaryjnym źródłem — wpisywał tu numer niewłaściwej klasy.
                        prodentis_id: pozycjaZPMS?.id ?? schedule_appointment_id ?? null,
                        appointment_date: dataWizyty,
                        appointment_end_date: dataKonca,
                        doctor_id: lekarzId,
                        doctor_name: lekarzNazwa,
                        status: 'unpaid_reservation',
                        deposit_paid: false,
                        attendance_confirmed: false,
                        cancellation_requested: false,
                        reschedule_requested: false
                    })
                    .select()
                    .single();

                if (freshError) {
                    console.error('[Create] Re-create error:', JSON.stringify(freshError));
                    // If insert fails, the old record was already deleted.
                    // Try to return what we can — the insert might fail due to another stale record
                    // for the same patient. Clean ALL terminal records for this patient and try again.
                    console.log('[Create] Cleaning ALL terminal records for patient', patient.id);
                    await supabase
                        .from('appointment_actions')
                        .delete()
                        .eq('patient_id', patient.id)
                        .in('status', TERMINAL_STATUSES);

                    // Retry insert
                    const { data: retryFresh, error: retryError } = await supabase
                        .from('appointment_actions')
                        .insert({
                            patient_id: patient.id,
                            // 🪤 NIE schodzimy na `patient.prodentis_id`: ta kolumna trzyma identyfikator WIZYTY
                        // i idzie WPROST do adresu `/api/schedule/appointment/<id>`. Identyfikator
                        // pacjenta ma ten sam kształt (10 cyfr), więc w najgorszym razie skasowałby
                        // CUDZĄ wizytę o zbieżnym numerze. `null` jest uczciwe — ścieżki zapisu
                        // sprawdzają jego brak i pomijają operację na PMS zamiast zgadywać.
                        prodentis_id: pozycjaZPMS?.id ?? schedule_appointment_id ?? null,
                            appointment_date: dataWizyty,
                            appointment_end_date: dataKonca,
                            doctor_id: lekarzId,
                            doctor_name: lekarzNazwa,
                            status: 'unpaid_reservation',
                            deposit_paid: false,
                            attendance_confirmed: false,
                            cancellation_requested: false,
                            reschedule_requested: false
                        })
                        .select()
                        .single();

                    if (retryError) {
                        console.error('[Create] Retry also failed:', JSON.stringify(retryError));
                        return NextResponse.json({ error: 'Failed to reset appointment', detail: retryError.message }, { status: 500 });
                    }

                    return NextResponse.json({ id: retryFresh.id, status: retryFresh.status, wasReset: true });
                }

                console.log('[Create] Fresh record created:', fresh.id);
                return NextResponse.json({ id: fresh.id, status: fresh.status, wasReset: true });
            }

            // 🔴 NIE „as-is" — najpierw ODŚWIEŻ IDENTYFIKATOR WIZYTY.
            // Recepcja przesuwająca wizytę RĘCZNIE na pulpicie Prodentisa soft-deletuje wiersz
            // i tworzy nowy, z NOWYM `id_schedule` (potwierdzone przez dostawcę PMS 04.09 —
            // ich własne `PUT /reschedule` identyfikatora NIE zmienia, więc to jedyne źródło
            // rozjazdu). Klient przysyła tu świeże id prosto z PMS-u, ale Strategia 2 znajduje
            // nasz wiersz po DACIE i dotąd zwracała go razem ze starym identyfikatorem —
            // przez co każde późniejsze odwołanie, przełożenie i potwierdzenie leciało na
            // adres, którego już nie ma. To jest mechanizm otwartej od maja sprawy „ICON 404".
            if (schedule_appointment_id && existing.prodentis_id !== schedule_appointment_id) {
                console.warn(
                    `[Create] Nieaktualny prodentis_id dla wizyty ${existing.id}:`
                    + ` ${existing.prodentis_id} → ${schedule_appointment_id} (wizyta przesunięta w Prodentisie)`,
                );
                const { error: odswiezenieError } = await supabase
                    .from('appointment_actions')
                    .update({
                        prodentis_id: pozycjaZPMS?.id ?? schedule_appointment_id,
                        // Lekarz dryfuje razem z terminem — stąd obserwacja „14 z 50 rezerwacji
                        // stoi u innego lekarza, niż wysłaliśmy". Odświeżamy oba albo żadnego.
                        // 🔑 P-001: wartości z PMS, nie z ciała żądania.
                        ...(lekarzId ? { doctor_id: lekarzId } : {}),
                        ...(lekarzNazwa ? { doctor_name: lekarzNazwa } : {}),
                    })
                    .eq('id', existing.id);
                if (odswiezenieError) {
                    // 🪤 Nie przerywamy: pacjent ma zobaczyć swoją wizytę. Ale NIE wolno milczeć —
                    // od tego identyfikatora zależą wszystkie operacje zapisu.
                    console.error('[Create] Odświeżenie prodentis_id NIEUDANE:', odswiezenieError.message);
                } else {
                    existing.prodentis_id = schedule_appointment_id;
                }
            }

            return NextResponse.json({ id: existing.id, status: existing.status });
        }

        // No existing record → create new
        const { data: action, error: createError } = await supabase
            .from('appointment_actions')
            .insert({
                patient_id: patient.id,
                // 🪤 NIE schodzimy na `patient.prodentis_id`: ta kolumna trzyma identyfikator WIZYTY
                        // i idzie WPROST do adresu `/api/schedule/appointment/<id>`. Identyfikator
                        // pacjenta ma ten sam kształt (10 cyfr), więc w najgorszym razie skasowałby
                        // CUDZĄ wizytę o zbieżnym numerze. `null` jest uczciwe — ścieżki zapisu
                        // sprawdzają jego brak i pomijają operację na PMS zamiast zgadywać.
                        prodentis_id: pozycjaZPMS?.id ?? schedule_appointment_id ?? null,
                appointment_date: dataWizyty,
                appointment_end_date: dataKonca,
                doctor_id: lekarzId,
                doctor_name: lekarzNazwa,
                status: 'unpaid_reservation',
                deposit_paid: false,
                attendance_confirmed: false,
                cancellation_requested: false,
                reschedule_requested: false
            })
            .select()
            .single();

        if (createError) {
            console.error('[Create] Insert error:', JSON.stringify(createError));
            if (createError.code === '23505') {
                // Race condition — try to find and return
                const { data: raceExisting } = await supabase
                    .from('appointment_actions')
                    .select('id, status')
                    .eq('patient_id', patient.id)
                    .gte('appointment_date', rangeStart.toISOString())
                    .lt('appointment_date', rangeEnd.toISOString())
                    .limit(1)
                    .maybeSingle();
                if (raceExisting) {
                    return NextResponse.json({ id: raceExisting.id, status: raceExisting.status });
                }
            }
            throw createError;
        }

        return NextResponse.json({ id: action.id, status: action.status });

    } catch (error: any) {
        console.error('[Create] Error:', error);
        return NextResponse.json({ error: 'Internal server error', detail: error?.message }, { status: 500 });
    }
}
