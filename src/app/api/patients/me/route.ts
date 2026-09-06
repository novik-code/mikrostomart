import { NextResponse, NextRequest } from 'next/server';
import { verifyPatientSession } from '@/lib/jwt';
import { prodentisFetch } from '@/lib/prodentisFetch';
import { createClient } from '@supabase/supabase-js';
import { isDemoMode } from '@/lib/demoMode';
import { widokProfiluPacjenta } from '@/lib/patientProfileView';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
    try {
        // Verify JWT (from httpOnly cookie or Authorization header)
        const payload = await verifyPatientSession(request);

        if (!payload) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        /**
         * Kartoteka z Prodentisa/Supabase. 🔴 Do 06.09 CAŁA szła do klienta przez spread,
         * razem z `pesel`, `birthDate`, `gender`, `middleName`, `maidenName`, `notes`
         * i `warnings[]` — czyli z danymi szczególnymi i wewnętrznymi uwagami personelu
         * (zmierzone na produkcji: 17 kluczy w odpowiedzi, `pesel` niepusty). Dziś do
         * klienta idzie wyłącznie allow-lista z `@/lib/patientProfileView` (P-023).
         */
        let patientData: Record<string, unknown> & { email?: string | null; phone?: string | null };

        if (isDemoMode) {
            // In demo mode, fetch patient data from Supabase directly
            console.log('[Me] DEMO MODE: Using Supabase patient data');
            const { data: patient, error: patientError } = await supabase
                .from('patients')
                .select('*')
                .eq('prodentis_id', payload.prodentisId)
                .single();

            if (patientError || !patient) {
                // Try by userId
                const { data: patientById } = await supabase
                    .from('patients')
                    .select('*')
                    .eq('id', payload.userId)
                    .single();

                patientData = patientById ? {
                    id: patientById.prodentis_id || patientById.id,
                    supabaseId: payload.userId,
                    firstName: patientById.first_name || patientById.name?.split(' ')[0] || 'Demo',
                    lastName: patientById.last_name || patientById.name?.split(' ').slice(1).join(' ') || 'Pacjent',
                    phone: patientById.phone,
                    email: patientById.email,
                    dateOfBirth: patientById.date_of_birth || null,
                    appointments: [],
                    account_status: patientById.account_status || 'active',
                    locale: patientById.locale || 'pl',
                } : { id: payload.prodentisId, supabaseId: payload.userId, firstName: 'Demo', lastName: 'Pacjent', appointments: [] };
            } else {
                patientData = {
                    id: patient.prodentis_id || patient.id,
                    supabaseId: payload.userId,
                    firstName: patient.first_name || patient.name?.split(' ')[0] || 'Demo',
                    lastName: patient.last_name || patient.name?.split(' ').slice(1).join(' ') || 'Pacjent',
                    phone: patient.phone,
                    email: patient.email,
                    dateOfBirth: patient.date_of_birth || null,
                    appointments: [],
                    account_status: patient.account_status || 'active',
                    locale: patient.locale || 'pl',
                };
            }

            return NextResponse.json(patientData);
        }

        // Fetch patient details from Prodentis
        const response = await prodentisFetch(`/api/patient/${payload.prodentisId}/details`);

        if (!response.ok) {
            console.error('[Me] Prodentis API error:', response.status);
            return NextResponse.json(
                { error: 'Failed to fetch patient data' },
                { status: 500 }
            );
        }

        patientData = await response.json();

        // Fetch email, phone, and account_status from Supabase
        const { data: supabasePatient, error: supabaseError } = await supabase
            .from('patients')
            .select('email, phone, account_status, locale, avatar')
            .eq('prodentis_id', payload.prodentisId)
            .single();

        if (supabaseError) {
            console.error('[Me] Supabase error:', supabaseError);
            // Continue without email if Supabase fails (graceful degradation)
        }

        // Merge Supabase data (email, phone, account_status) with Prodentis data.
        // 🔑 Spread idzie z WIDOKU kartoteki, nie z kartoteki — patrz komentarz wyżej.
        // Fallbacki niżej czytają surowy rekord celowo: dają tę samą wartość, a widok
        // nie ma być jedynym źródłem e-maila, gdy Supabase go nie zna.
        const mergedData = {
            ...widokProfiluPacjenta(patientData),
            supabaseId: payload.userId,
            email: supabasePatient?.email || patientData.email || null,
            phone: supabasePatient?.phone || patientData.phone || null,
            account_status: supabasePatient?.account_status || null,
            locale: supabasePatient?.locale || 'pl',
            avatar: supabasePatient?.avatar || null,
        };

        return NextResponse.json(mergedData);

    } catch (error) {
        console.error('[Me] Error:', error);
        return NextResponse.json(
            { error: 'Server error' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        // Verify JWT (from httpOnly cookie or Authorization header)
        const payload = await verifyPatientSession(request);

        if (!payload) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { email, phone, locale, notification_preferences, avatar } = body;

        // Build update object (only update provided fields)
        const updates: Record<string, unknown> = {};

        if (email !== undefined) {
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (email && !emailRegex.test(email)) {
                return NextResponse.json(
                    { error: 'Nieprawidłowy format adresu email' },
                    { status: 400 }
                );
            }
            updates.email = email;
        }

        if (phone !== undefined) {
            const znormalizowany = phone.replace(/[\s-]/g, ''); // Normalize phone
            /**
             * 🔴 P-005: do 05.09 to pole szło do bazy BEZ ŻADNEJ walidacji, a stamtąd
             * prosto do sklejanego stringiem filtra PostgREST w paczce RODO. Numer
             * `x,reason.gte.` zamieniał eksport własnych danych w eksport cudzych.
             * 🔑 Odrzucamy śmieci, ale NIE zmieniamy formatu zapisu: normalizacja do E.164
             * przepisałaby zapamiętane numery i rozjechała `.eq('patient_phone')`
             * w `appointment_actions` oraz `sms_reminders` dla tego pacjenta.
             * ⚪ Zmierzone na produkcji 05.09: 149 ze 149 kont pasuje do tego wzorca,
             * więc nikt legalny nie zostaje odrzucony.
             */
            if (!/^\+?\d{6,15}$/.test(znormalizowany)) {
                return NextResponse.json(
                    { error: 'Nieprawidłowy numer telefonu' },
                    { status: 400 }
                );
            }
            updates.phone = znormalizowany;
        }

        if (locale !== undefined) {
            const validLocales = ['pl', 'en', 'de', 'ua'];
            if (!validLocales.includes(locale)) {
                return NextResponse.json(
                    { error: 'Nieprawidłowy język' },
                    { status: 400 }
                );
            }
            updates.locale = locale;
        }

        if (notification_preferences !== undefined) {
            // Kształt: PŁASKI obiekt wartości logicznych. Cokolwiek innego odrzucamy,
            // żeby do JSONB nie wpadła zagnieżdżona struktura ani śmieciowe klucze.
            const isFlatBooleanMap =
                notification_preferences !== null &&
                typeof notification_preferences === 'object' &&
                !Array.isArray(notification_preferences) &&
                Object.keys(notification_preferences).length <= 40 &&
                Object.entries(notification_preferences).every(
                    ([key, value]) => /^[a-z0-9_]{1,40}$/.test(key) && typeof value === 'boolean'
                );

            if (!isFlatBooleanMap) {
                return NextResponse.json(
                    { error: 'Nieprawidłowe preferencje powiadomień' },
                    { status: 400 }
                );
            }

            // MERGE, nie podmiana. Web wysyła tylko swoje 5 kluczy, a apka swoje —
            // przy podmianie całego obiektu zapis preferencji na webie kasował wyciszenie
            // CareFlow ustawione w apce (D6) i przypomnienia wracały bez zgody pacjenta.
            const { data: currentRow, error: currentErr } = await supabase
                .from('patients')
                .select('notification_preferences')
                .eq('prodentis_id', payload.prodentisId)
                .maybeSingle();

            // FAIL-CLOSED: bez znajomości stanu bieżącego merge zamienia się w PODMIANĘ
            // całego obiektu i kasuje np. wyciszenie CareFlow ustawione w apce. Przy błędzie
            // odczytu nie zapisujemy NICZEGO — pacjent ponowi, zamiast stracić ustawienia.
            if (currentErr) {
                console.error('[Me PATCH] Preferences read error:', currentErr);
                return NextResponse.json(
                    { error: 'Nie udało się zaktualizować profilu' },
                    { status: 500 }
                );
            }

            const current = currentRow?.notification_preferences;
            const base = current && typeof current === 'object' && !Array.isArray(current) ? current : {};
            updates.notification_preferences = { ...base, ...notification_preferences };
        }

        if (avatar !== undefined) {
            // Id presetu avatara wybranego w apce. Walidacja odsprzęgnięta od
            // konkretnej listy presetów: bezpieczny charset + limit długości.
            if (avatar !== null && (typeof avatar !== 'string' || !/^[a-z0-9_-]{1,40}$/.test(avatar))) {
                return NextResponse.json(
                    { error: 'Nieprawidłowy avatar' },
                    { status: 400 }
                );
            }
            updates.avatar = avatar;
        }

        // Update in Supabase
        const { data, error } = await supabase
            .from('patients')
            .update(updates)
            .eq('prodentis_id', payload.prodentisId)
            .select()
            .single();

        if (error) {
            console.error('[Me PATCH] Supabase error:', error);
            return NextResponse.json(
                { error: 'Nie udało się zaktualizować profilu' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            patient: {
                email: data.email,
                phone: data.phone,
                locale: data.locale,
                avatar: data.avatar,
                // Dokładany klucz (nie zmienia istniejących) — po merge'u klient musi
                // zobaczyć STAN PO scaleniu, a nie to, co sam wysłał.
                notification_preferences: data.notification_preferences ?? null,
            }
        });

    } catch (error) {
        console.error('[Me PATCH] Error:', error);
        return NextResponse.json(
            { error: 'Server error' },
            { status: 500 }
        );
    }
}
