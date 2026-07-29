/**
 * Assistant Action Dispatcher
 * Server-side execution of actions triggered by the Voice AI Assistant
 */

import { createClient } from '@supabase/supabase-js';
import { createEvent, listEvents, isCalendarConnected } from './googleCalendar';
import { sendPushToUser } from './webpush';
import { demoSanitize } from '@/lib/brandConfig';
import { sendEmail } from '@/lib/emailSender';
import { prodentisTime, prodentisTypeName } from '@/lib/assistantGuards';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PRODENTIS_TUNNEL_URL = process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';
const PRODENTIS_FALLBACK_URL = process.env.PRODENTIS_API_URL || 'http://83.230.40.14:3000';

/** Fetch from Prodentis with automatic tunnel→direct-IP fallback */
async function prodentisFetch(path: string): Promise<Response> {
    try {
        const res = await fetch(`${PRODENTIS_TUNNEL_URL}${path}`);
        if (res.ok) return res;
        throw new Error(`Tunnel: ${res.status}`);
    } catch {
        return fetch(`${PRODENTIS_FALLBACK_URL}${path}`);
    }
}

// ─── Types ───────────────────────────────────────────────────

export interface ActionResult {
    success: boolean;
    action: string;
    message: string;           // Human-readable result for the AI to relay
    data?: Record<string, any>;
}

// ─── Action: Create Task ─────────────────────────────────────

async function createTask(args: {
    title: string;
    description?: string;
    priority?: 'low' | 'normal' | 'urgent';
    task_type?: string;
    patient_name?: string;
    assigned_to_names?: string[];
    due_date?: string;
    due_time?: string;
    checklist_items?: string[];
    is_private?: boolean;
}, userId: string, userEmail: string): Promise<ActionResult> {
    try {
        // Resolve assigned_to names to staff IDs
        let assignedTo: { id: string; name: string }[] = [];
        if (args.assigned_to_names && args.assigned_to_names.length > 0) {
            const { data: staff } = await supabase
                .from('user_roles')
                .select('user_id, email')
                .eq('role', 'employee');

            if (staff) {
                // Try to match names to staff
                for (const name of args.assigned_to_names) {
                    const nameLower = name.toLowerCase();
                    const match = staff.find(s =>
                        (s.email || '').toLowerCase().includes(nameLower) ||
                        nameLower.includes((s.email || '').split('@')[0].toLowerCase())
                    );
                    if (match) {
                        assignedTo.push({ id: match.user_id, name: match.email || name });
                    } else {
                        assignedTo.push({ id: '', name });
                    }
                }
            }
        }

        // Auto-fetch checklist from task_type_templates if task_type is provided
        let checklistItems: { label: string; done: boolean }[] = [];

        if (args.task_type) {
            // Try to match task_type to a template by key or label
            const { data: templates } = await supabase
                .from('task_type_templates')
                .select('key, label, items')
                .eq('is_active', true);

            if (templates && templates.length > 0) {
                const typeLower = args.task_type.toLowerCase();
                const match = templates.find(t =>
                    t.key.toLowerCase() === typeLower ||
                    t.label.toLowerCase() === typeLower ||
                    t.label.toLowerCase().includes(typeLower) ||
                    typeLower.includes(t.label.toLowerCase()) ||
                    typeLower.includes(t.key.replace(/_/g, ' '))
                );

                if (match && match.items) {
                    const templateItems: string[] = typeof match.items === 'string'
                        ? JSON.parse(match.items)
                        : match.items;
                    checklistItems = templateItems.map(label => ({ label, done: false }));
                    // Also normalize the task_type to match the template label
                    args.task_type = match.label;
                }
            }
        }

        // If no template matched, use manually provided checklist_items
        if (checklistItems.length === 0 && args.checklist_items && args.checklist_items.length > 0) {
            checklistItems = args.checklist_items.map(label => ({ label, done: false }));
        }

        const isPrivate = args.is_private === true;

        const task = {
            title: args.title,
            description: args.description || (
                // Auto-generate description from context if none provided
                [
                    args.is_private ? 'Zadanie prywatne' : null,
                    args.patient_name ? `Pacjent: ${args.patient_name}` : null,
                    args.due_date
                        ? `Termin: ${new Date(args.due_date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}${args.due_time ? ` o ${args.due_time}` : ''}`
                        : null,
                ].filter(Boolean).join(' • ') || null
            ),
            status: 'todo',
            priority: args.priority || 'normal',
            task_type: args.task_type || null,
            patient_name: args.patient_name || null,
            due_date: args.due_date || null,
            due_time: args.due_time || null,
            assigned_to: assignedTo,
            checklist_items: checklistItems,
            is_private: isPrivate,
            owner_user_id: isPrivate ? userId : null,
            created_by: userId,
            created_by_email: userEmail,
        };

        const { data, error } = await supabase
            .from('employee_tasks')
            .insert(task)
            .select()
            .single();

        if (error) {
            console.error('[AssistantActions] Task creation error:', error);
            return { success: false, action: 'createTask', message: `Nie udało się utworzyć zadania: ${error.message}` };
        }

        if (isPrivate) {
            // Private task: push only to the owner (not the whole team)
            try {
                await sendPushToUser(userId, 'employee', {
                    title: '🔒 Zadanie prywatne',
                    body: `${args.title}${args.due_time ? ` — ${args.due_time}` : ''}${args.due_date ? ` (${new Date(args.due_date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })})` : ''}`,
                    url: `/pracownik?tab=zadania&taskId=${data.id}`,
                    tag: `task-private-${data.id}`,
                });
            } catch { /* push is optional */ }
        } else {
            // Clinical task: push to all employees
            try {
                const { sendPushToAllEmployees } = await import('./webpush');
                await sendPushToAllEmployees(
                    {
                        title: '📋 Nowe zadanie (Asystent)',
                        body: `${args.title}${args.patient_name ? ` — ${args.patient_name}` : ''}`,
                        url: `/pracownik?tab=zadania&taskId=${data.id}`,
                        tag: `task-new-${data.id}`,
                    },
                    userId
                );
            } catch { /* push is optional */ }
        }

        const dueDateStr = args.due_date
            ? new Date(args.due_date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
            : null;
        const timeStr = args.due_time ? ` o ${args.due_time}` : '';
        const dateInfo = dueDateStr ? ` na ${dueDateStr}${timeStr}` : '';

        // ── Auto-link Google Calendar ──────────────────────────────────────
        // If the task has a due_date and user has Google Calendar connected,
        // create a calendar event and save the eventId in the task row.
        // This allows the task DELETE route to also remove the calendar event.
        let calendarLinked = false;
        if (args.due_date) {
            try {
                const { connected } = await isCalendarConnected(userId);
                if (connected) {
                    const startStr = args.due_time
                        ? `${args.due_date}T${args.due_time}:00`
                        : `${args.due_date}T09:00:00`;
                    const calResult = await createEvent(userId, {
                        summary: `📋 ${args.title}`,
                        description: [
                            args.description || null,
                            args.patient_name ? `Pacjent: ${args.patient_name}` : null,
                            isPrivate ? '🔒 Zadanie prywatne' : null,
                        ].filter(Boolean).join('\n') || '',
                        start: startStr,
                        colorId: '5', // banana yellow for tasks
                    });
                    if (calResult.success && calResult.eventId) {
                        await supabase
                            .from('employee_tasks')
                            .update({ google_event_id: calResult.eventId })
                            .eq('id', data.id);
                        calendarLinked = true;
                        console.log(`[AssistantActions] Linked task ${data.id} → gcal event ${calResult.eventId}`);
                    }
                }
            } catch (calErr) {
                // Calendar link is optional — don't fail the whole action
                console.error('[AssistantActions] Calendar auto-link failed:', calErr);
            }
        }

        const calendarNote = calendarLinked ? ' Dodano do kalendarza Google.' : '';

        return {
            success: true,
            action: 'createTask',
            message: `Zapisano${isPrivate ? ' (prywatne)' : ''}: „${args.title}"${dateInfo}.${assignedTo.length > 0 ? ` Przypisano do: ${assignedTo.map(a => a.name).join(', ')}.` : ''}${calendarNote}`,
            data: { taskId: data.id, is_private: isPrivate, calendarLinked },
        };
    } catch (err: any) {
        return { success: false, action: 'createTask', message: `Błąd tworzenia zadania: ${err.message}` };
    }
}

// ─── Action: Add Calendar Event ──────────────────────────────

async function addCalendarEvent(args: {
    summary: string;
    description?: string;
    start: string;
    end?: string;
    all_day?: boolean;
    location?: string;
}, userId: string): Promise<ActionResult> {
    const { connected } = await isCalendarConnected(userId);
    if (!connected) {
        return {
            success: false,
            action: 'addCalendarEvent',
            message: 'Google Calendar nie jest połączony. Proszę najpierw połączyć konto Google w ustawieniach asystenta.',
        };
    }

    const result = await createEvent(userId, {
        summary: args.summary,
        description: args.description,
        start: args.start,
        end: args.end,
        allDay: args.all_day,
        location: args.location,
    });

    if (!result.success) {
        return {
            success: false,
            action: 'addCalendarEvent',
            message: `Nie udało się dodać wydarzenia: ${result.error}`,
        };
    }

    // Send push notification
    try {
        await sendPushToUser(userId, 'employee', {
            title: '📅 Wydarzenie dodane',
            body: args.summary,
            url: result.htmlLink || '/pracownik',
            tag: `cal-event-${result.eventId}`,
        });
    } catch { /* push is optional */ }

    const startDate = new Date(args.start).toLocaleDateString('pl-PL', {
        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
    });

    return {
        success: true,
        action: 'addCalendarEvent',
        message: `Dodano wydarzenie "${args.summary}" w kalendarzu Google na ${startDate}.`,
        data: { eventId: result.eventId, htmlLink: result.htmlLink },
    };
}

// ─── Action: Add Reminder ────────────────────────────────────

async function addReminder(args: {
    text: string;
    datetime: string;
}, userId: string): Promise<ActionResult> {
    const { connected } = await isCalendarConnected(userId);
    if (!connected) {
        return {
            success: false,
            action: 'addReminder',
            message: 'Google Calendar nie jest połączony. Proszę najpierw połączyć konto Google.',
        };
    }

    const reminderTime = new Date(args.datetime);
    const endTime = new Date(reminderTime.getTime() + 30 * 60 * 1000); // 30 min duration

    const result = await createEvent(userId, {
        summary: `⏰ ${args.text}`,
        description: `Przypomnienie utworzone przez Asystenta AI`,
        start: reminderTime.toISOString(),
        end: endTime.toISOString(),
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'popup', minutes: 15 },
                { method: 'popup', minutes: 0 },
            ],
        },
        colorId: '11', // Tomato red for reminders
    });

    if (!result.success) {
        return { success: false, action: 'addReminder', message: `Nie udało się ustawić przypomnienia: ${result.error}` };
    }

    const timeStr = reminderTime.toLocaleDateString('pl-PL', {
        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
    });

    return {
        success: true,
        action: 'addReminder',
        message: `Ustawiono przypomnienie: "${args.text}" na ${timeStr}. Otrzymasz powiadomienie 15 minut przed.`,
        data: { eventId: result.eventId },
    };
}

// ─── Action: Dictate Documentation ──────────────────────────

async function dictateDocumentation(args: {
    raw_text: string;
    subject?: string;
    recipient_email?: string;
}, userId: string, userEmail: string): Promise<ActionResult> {
    try {
        // Use OpenAI to process the raw dictation into polished documentation text
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `Jesteś profesjonalnym redaktorem dokumentacji medycznej/stomatologicznej.
Otrzymujesz surowy tekst podyktowany głosowo przez pracownika kliniki stomatologicznej.
Twoje zadanie:
1. Oczyść tekst z błędów wynikających z rozpoznawania mowy
2. Sformatuj go profesjonalnie z przejrzystą strukturą
3. Zachowaj merytoryczną treść bez zmian
4. Dodaj odpowiednie nagłówki jeśli tekst jest dłuższy
5. Użyj poprawnego języka polskiego
6. Nie dodawaj informacji od siebie — tylko redaguj to co podyktowano
Odpowiedz TYLKO gotowym, zredagowanym tekstem.`
                },
                {
                    role: 'user',
                    content: args.raw_text,
                },
            ],
            temperature: 0.3,
            max_tokens: 2000,
        });

        const processedText = completion.choices[0].message.content || args.raw_text;

        // Send email
        const recipientEmail = args.recipient_email || userEmail;
        const subject = args.subject || 'Dokumentacja — Asystent AI';

        await sendEmail({
            to: recipientEmail,
            subject: `📝 ${subject}`,
            html: `
                <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: #1a1b1e; border-radius: 12px; padding: 24px; color: #f3f4f6;">
                        <h2 style="color: var(--color-primary); margin-top: 0;">📝 ${subject}</h2>
                        <div style="white-space: pre-wrap; line-height: 1.7; font-size: 14px;">
${processedText}
                        </div>
                        <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 20px 0;" />
                        <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
                            Tekst przetworzony przez Asystenta AI • Mikrostomart<br />
                            Wygenerowano: ${new Date().toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
            `,
        });

        return {
            success: true,
            action: 'dictateDocumentation',
            message: `Tekst został przetworzony i wysłany na adres ${recipientEmail}. Sprawdź swoją skrzynkę e-mail.`,
            data: { processedText, recipientEmail },
        };
    } catch (err: any) {
        console.error('[AssistantActions] Documentation error:', err);
        return { success: false, action: 'dictateDocumentation', message: `Błąd przetwarzania dokumentacji: ${err.message}` };
    }
}

// ─── Action: Search Patient ──────────────────────────────────

async function searchPatient(args: {
    query: string;
}): Promise<ActionResult> {
    try {
        const res = await prodentisFetch(`/api/patients/search?q=${encodeURIComponent(args.query)}&limit=5`);

        if (!res.ok) {
            return { success: false, action: 'searchPatient', message: 'Nie udało się wyszukać pacjenta w systemie Prodentis.' };
        }

        const data = await res.json();
        const patients = data.patients || data || [];

        if (patients.length === 0) {
            return { success: true, action: 'searchPatient', message: `Nie znaleziono pacjenta o nazwisku "${args.query}".` };
        }

        /**
         * 🔒 PESEL NIE WYCHODZI DO OpenAI. Numer identyfikuje osobę jednoznacznie,
         * niesie datę urodzenia i płeć, i nie jest potrzebny do NICZEGO, co asystent
         * realnie robi (założenie zadania, notatka, oddzwonienie). Telefon skracamy
         * do czterech ostatnich cyfr — wystarcza do rozpoznania właściwego pacjenta
         * na liście, a nie tworzy z odpowiedzi modelu wyciągu z kartoteki.
         *
         * Pełne dane zostają w `data.patients` (to NIE idzie do modelu, tylko do UI),
         * więc interfejs nadal może pokazać komplet zalogowanemu pracownikowi.
         */
        const list = patients.slice(0, 5).map((p: any, i: number) => {
            const parts = [`${i + 1}. ${p.firstName || ''} ${p.lastName || p.name || ''}`.trim()];
            if (p.phone) parts.push(`tel: …${String(p.phone).replace(/\D/g, '').slice(-4)}`);
            return parts.join(', ');
        }).join('\n');

        /**
         * ⚠️ `data` TEŻ IDZIE DO MODELU — wynik narzędzia jest serializowany
         * (`JSON.stringify(actionResult)`) i doklejany do rozmowy jako `role: 'tool'`.
         * Odsianie PESEL-u wyłącznie z `message` byłoby więc pozorne: surowe wiersze
         * z kartoteki i tak wylądowałyby w prompcie.
         */
        const safe = patients.slice(0, 5).map((p: any) => ({
            id: p.id ?? p.patientId ?? null,
            name: `${p.firstName || ''} ${p.lastName || p.name || ''}`.trim(),
            phoneLast4: p.phone ? String(p.phone).replace(/\D/g, '').slice(-4) : null,
        }));

        return {
            success: true,
            action: 'searchPatient',
            message: `Znaleziono ${patients.length} pacjent${patients.length === 1 ? 'a' : 'ów'}:\n${list}`,
            data: { patients: safe },
        };
    } catch (err: any) {
        return { success: false, action: 'searchPatient', message: `Błąd wyszukiwania: ${err.message}` };
    }
}

// ─── Action: Check Schedule ──────────────────────────────────

async function checkSchedule(args: {
    date?: string;
}): Promise<ActionResult> {
    try {
        const targetDate = args.date || new Date().toISOString().split('T')[0];

        const res = await prodentisFetch(`/api/appointments/by-date?date=${targetDate}`);

        if (!res.ok) {
            return { success: false, action: 'checkSchedule', message: 'Nie udało się pobrać grafiku z Prodentis.' };
        }

        const data = await res.json();
        const appointments = data.appointments || data || [];

        if (appointments.length === 0) {
            const dateStr = new Date(targetDate).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
            return { success: true, action: 'checkSchedule', message: `Brak wizyt na ${dateStr}.` };
        }

        // Group by doctor
        const byDoctor: Record<string, any[]> = {};
        for (const apt of appointments) {
            const doctor = apt.doctorName || apt.doctor?.name || 'Nieprzypisany';
            if (!byDoctor[doctor]) byDoctor[doctor] = [];
            byDoctor[doctor].push(apt);
        }

        let summary = '';
        const dateStr = new Date(targetDate).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
        summary += `Grafik na ${dateStr} — łącznie ${appointments.length} wizyt:\n\n`;

        for (const [doctor, apts] of Object.entries(byDoctor)) {
            summary += `🩺 ${doctor} (${apts.length} wizyt):\n`;
            for (const apt of apts.slice(0, 5)) {
                const time = prodentisTime(apt);
                const patient = apt.patientName || apt.patient?.name || '?';
                const type = prodentisTypeName(apt);
                summary += `  • ${time} — ${patient}${type ? ` (${type})` : ''}\n`;
            }
            if (apts.length > 5) summary += `  ... i ${apts.length - 5} więcej\n`;
            summary += '\n';
        }

        return {
            success: true,
            action: 'checkSchedule',
            message: summary.trim(),
            data: { date: targetDate, totalAppointments: appointments.length },
        };
    } catch (err: any) {
        return { success: false, action: 'checkSchedule', message: `Błąd pobierania grafiku: ${err.message}` };
    }
}

// ─── Action: Update Task ──────────────────────────────────────

/** Pozycja checklisty tak, jak leży w `employee_tasks.checklist_items`. */
interface ChecklistItem {
    id?: number;
    label: string;
    done?: boolean;
}

/** Wiersz zadania w zakresie, jakiego potrzebuje `updateTask` (bramka + scalanie listy). */
interface TaskRowForUpdate {
    id: string;
    checklist_items?: ChecklistItem[] | null;
    created_by?: string | null;
    owner_user_id?: string | null;
    is_private?: boolean | null;
}

async function updateTask(args: {
    task_id?: string;            // Preferred: direct UUID
    title_query?: string;        // Alternative: search by title (finds most recent match)
    new_title?: string;
    description?: string;
    priority?: 'low' | 'normal' | 'urgent';
    status?: 'todo' | 'in_progress' | 'done' | 'archived';
    due_date?: string;
    due_time?: string;
    checklist_items?: string[];  // Full replacement of checklist
    merge_checklist?: string[];  // Add items to existing checklist (don't replace)
}, userId: string): Promise<ActionResult> {
    try {
        /**
         * 🔑 ZADANIE WCZYTUJEMY ZAWSZE, niezależnie od tego, czy przyszło `task_id`,
         * czy `title_query`. Poprzednia wersja robiła to WYŁĄCZNIE w gałęzi wyszukiwania,
         * przez co przy podanym `task_id`:
         *  · scalanie listy (`merge_checklist`) było po cichu ignorowane — `updates`
         *    zostawał pusty i akcja kończyła się „Brak danych do aktualizacji",
         *    mimo że prompt wprost każe modelowi używać `task_id`, gdy go zna;
         *  · UPDATE leciał po samym `id`, BEZ sprawdzenia właściciela — dało się
         *    zmodyfikować cudze zadanie, w tym PRYWATNE.
         */
        let taskId = args.task_id;
        let existing: TaskRowForUpdate | null = null;

        const COLS = 'id, title, checklist_items, created_by, owner_user_id, is_private';

        if (taskId) {
            const { data } = await supabase.from('employee_tasks').select(COLS).eq('id', taskId).maybeSingle();
            existing = (data as unknown as TaskRowForUpdate | null) ?? null;
            if (!existing) {
                return { success: false, action: 'updateTask', message: 'Nie znalazłem takiego zadania.' };
            }
        } else if (args.title_query) {
            const { data: found, error: searchErr } = await supabase
                .from('employee_tasks')
                .select(COLS)
                .or(`created_by.eq.${userId},owner_user_id.eq.${userId}`)
                .ilike('title', `%${args.title_query}%`)
                .order('created_at', { ascending: false })
                .limit(1);

            if (searchErr || !found || found.length === 0) {
                return { success: false, action: 'updateTask', message: `Nie znalazłem zadania pasującego do: "${args.title_query}"` };
            }
            existing = found[0] as unknown as TaskRowForUpdate;
            taskId = existing.id;
        }

        if (!taskId || !existing) {
            return { success: false, action: 'updateTask', message: 'Podaj ID zadania lub tytuł do wyszukania.' };
        }

        /**
         * 🔒 BRAMKA WŁASNOŚCI. Zadanie PRYWATNE może zmienić wyłącznie jego właściciel —
         * inaczej znajomość UUID-a (a ten wraca w odpowiedzi asystenta) wystarczała, żeby
         * ruszyć cudzy prywatny wpis. Zadania zespołowe zostają edytowalne dla wszystkich,
         * bo tak samo działa tablica zadań w interfejsie — asystent nie może być bardziej
         * restrykcyjny niż ekran, z którego korzysta ten sam człowiek.
         */
        const isOwner = existing.created_by === userId || existing.owner_user_id === userId;
        if (existing.is_private && !isOwner) {
            return { success: false, action: 'updateTask', message: 'To zadanie jest prywatne i należy do kogoś innego.' };
        }

        // Build update payload — only include provided fields
        const updates: Record<string, any> = {};
        if (args.new_title !== undefined) updates.title = args.new_title;
        if (args.description !== undefined) updates.description = args.description;
        if (args.priority !== undefined) updates.priority = args.priority;
        if (args.status !== undefined) updates.status = args.status;
        if (args.due_date !== undefined) updates.due_date = args.due_date;
        if (args.due_time !== undefined) updates.due_time = args.due_time;

        /**
         * 🔑 SCALANIE ZACHOWUJE ODHACZENIA. Poprzednia wersja mapowała istniejące pozycje
         * na same etykiety, a przy zapisie ustawiała `done: false` dla wszystkich — więc
         * „dopisz mleko do listy zakupów" kasowało wszystko, co już było kupione.
         */
        if (args.merge_checklist?.length) {
            const current: ChecklistItem[] = existing.checklist_items ?? [];
            const have = new Set(current.map(i => String(i.label).toLowerCase()));
            const added = args.merge_checklist
                .filter(label => !have.has(String(label).toLowerCase()))
                .map(label => ({ label, done: false }));
            updates.checklist_items = [...current, ...added].map((item, i) => ({
                id: i,
                label: item.label,
                done: item.done ?? false,
            }));
        } else if (args.checklist_items !== undefined) {
            // Pełne zastąpienie listy — ale stan „zrobione" przenosimy po ETYKIECIE,
            // żeby przepisanie listy nie odznaczało pozycji, które zostały bez zmian.
            const doneByLabel = new Map(
                (existing.checklist_items ?? []).map(i => [String(i.label).toLowerCase(), !!i.done]),
            );
            updates.checklist_items = args.checklist_items.map((label, i) => ({
                id: i,
                label,
                done: doneByLabel.get(String(label).toLowerCase()) ?? false,
            }));
        }

        if (Object.keys(updates).length === 0) {
            return { success: false, action: 'updateTask', message: 'Brak danych do aktualizacji.' };
        }

        const { error } = await supabase
            .from('employee_tasks')
            .update(updates)
            .eq('id', taskId);

        if (error) {
            return { success: false, action: 'updateTask', message: `Błąd aktualizacji: ${error.message}` };
        }

        const updatedFields = Object.keys(updates).join(', ');
        return {
            success: true,
            action: 'updateTask',
            message: `Zadanie zaktualizowano (${updatedFields}).`,
            data: { taskId, updatedFields: Object.keys(updates) },
        };
    } catch (err: any) {
        return { success: false, action: 'updateTask', message: `Błąd: ${err.message}` };
    }
}

// ─── Akcje CZYTAJĄCE ──────────────────────────────────────────
//
// 🔑 DLACZEGO ONE ISTNIEJĄ. Do 2026-07-29 asystent miał wyłącznie narzędzia
// PISZĄCE (zakładanie zadań, kalendarz, dyktowanie) i ani jednego czytającego
// własne dane pracownika. Na najczęstsze pytanie — „co mam dziś do zrobienia" —
// nie umiał odpowiedzieć, mimo że prompt reklamował „sprawdzanie grafiku".
// To jest główna przyczyna wrażenia, że asystent jest bezużyteczny; sama zmiana
// modelu nic by tu nie dała.

/** Moje otwarte zadania: zaległe, na dziś, dalsze. */
async function listMyTasks(args: { scope?: 'today' | 'overdue' | 'open' }, userId: string): Promise<ActionResult> {
    try {
        const { data, error } = await supabase
            .from('employee_tasks')
            .select('id, title, status, priority, due_date, due_time, is_private, checklist_items')
            .or(`created_by.eq.${userId},owner_user_id.eq.${userId}`)
            .in('status', ['todo', 'in_progress'])
            .order('due_date', { ascending: true, nullsFirst: false })
            .limit(60);

        if (error) return { success: false, action: 'listMyTasks', message: `Nie udało się pobrać zadań: ${error.message}` };

        const today = new Date().toISOString().slice(0, 10);
        const rows = (data ?? []) as Array<{ id: string; title: string; status: string; priority: string; due_date: string | null; due_time: string | null; checklist_items?: ChecklistItem[] | null }>;

        const overdue = rows.filter(r => r.due_date && r.due_date < today);
        const todays = rows.filter(r => r.due_date === today);
        const later = rows.filter(r => !r.due_date || r.due_date > today);

        const scope = args.scope ?? 'open';
        const pick = scope === 'today' ? todays : scope === 'overdue' ? overdue : rows;

        if (pick.length === 0) {
            return { success: true, action: 'listMyTasks', message: scope === 'today' ? 'Na dziś nie masz żadnych zadań.' : 'Nie masz otwartych zadań.' };
        }

        const fmt = (r: (typeof rows)[number]) => {
            const when = r.due_date ? `${r.due_date.slice(8, 10)}.${r.due_date.slice(5, 7)}${r.due_time ? ` ${String(r.due_time).slice(0, 5)}` : ''}` : 'bez terminu';
            const items = r.checklist_items ?? [];
            const progress = items.length ? ` [${items.filter(i => i.done).length}/${items.length}]` : '';
            const prio = r.priority === 'urgent' ? '‼️ ' : '';
            return `• ${prio}${r.title} — ${when}${progress}`;
        };

        let msg = '';
        if (scope === 'open') {
            if (overdue.length) msg += `PO TERMINIE (${overdue.length}):\n${overdue.map(fmt).join('\n')}\n\n`;
            if (todays.length) msg += `NA DZIŚ (${todays.length}):\n${todays.map(fmt).join('\n')}\n\n`;
            if (later.length) msg += `DALEJ (${later.length}):\n${later.slice(0, 10).map(fmt).join('\n')}`;
        } else {
            msg = pick.map(fmt).join('\n');
        }

        return {
            success: true,
            action: 'listMyTasks',
            message: msg.trim(),
            data: { overdue: overdue.length, today: todays.length, later: later.length },
        };
    } catch (err: any) {
        return { success: false, action: 'listMyTasks', message: `Błąd: ${err.message}` };
    }
}

/** Mój czas pracy i nadgodziny w bieżącym miesiącu (KCP). */
async function myWorkTime(_args: Record<string, never>, userId: string): Promise<ActionResult> {
    try {
        const { data: emp } = await supabase.from('employees').select('id, name').eq('user_id', userId).maybeSingle();
        if (!emp?.id) {
            return { success: false, action: 'myWorkTime', message: 'Twoje konto nie jest powiązane z kartoteką pracownika.' };
        }

        const now = new Date();
        const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

        const { data: shifts } = await supabase
            .from('calculated_shifts')
            .select('worked_minutes, overtime_total_minutes, overtime_justified_minutes, late_minutes, absence_type')
            .eq('employee_id', emp.id)
            .gte('date', from)
            .lte('date', to);

        const rows = (shifts ?? []) as Array<{ worked_minutes: number; overtime_total_minutes: number; overtime_justified_minutes: number; late_minutes: number; absence_type: string | null }>;
        const sum = (k: keyof (typeof rows)[number]) => rows.reduce((n, r) => n + (Number(r[k]) || 0), 0);
        const h = (m: number) => `${Math.floor(m / 60)} h ${m % 60} min`;

        return {
            success: true,
            action: 'myWorkTime',
            message:
                `Bieżący miesiąc (${from} – ${to}):\n` +
                `• przepracowane: ${h(sum('worked_minutes'))}\n` +
                `• nadgodziny łącznie: ${h(sum('overtime_total_minutes'))} (uznane: ${h(sum('overtime_justified_minutes'))})\n` +
                `• spóźnienia: ${h(sum('late_minutes'))}\n` +
                `• dni nieobecności: ${rows.filter(r => r.absence_type).length}`,
            data: { from, to, days: rows.length },
        };
    } catch (err: any) {
        return { success: false, action: 'myWorkTime', message: `Błąd: ${err.message}` };
    }
}

/** Mój bilans urlopu na bieżący rok. */
async function myLeaveBalance(_args: Record<string, never>, userId: string): Promise<ActionResult> {
    try {
        const { data: emp } = await supabase.from('employees').select('id').eq('user_id', userId).maybeSingle();
        if (!emp?.id) {
            return { success: false, action: 'myLeaveBalance', message: 'Twoje konto nie jest powiązane z kartoteką pracownika.' };
        }
        const { getVacationBalance, listOwnRequests } = await import('./timeTracking/leaveService');
        const year = new Date().getFullYear();
        const [balance, requests] = await Promise.all([getVacationBalance(emp.id, year), listOwnRequests(emp.id)]);
        const pending = requests.filter(r => r.status === 'requested');

        return {
            success: true,
            action: 'myLeaveBalance',
            message:
                `Urlop ${year}: limit ${balance.annualEntitlement} dni, wykorzystane ${balance.daysUsed}, ` +
                `oczekujące ${balance.daysPending}, pozostało ${balance.daysRemaining}.` +
                (pending.length ? `\nWnioski czekające na decyzję: ${pending.map(r => `${r.date_from}–${r.date_to}`).join(', ')}` : ''),
            data: balance,
        };
    } catch (err: any) {
        return { success: false, action: 'myLeaveBalance', message: `Błąd: ${err.message}` };
    }
}

/** Otwarte awarie — co jest w gabinecie zepsute. */
async function openIncidents(_args: Record<string, never>): Promise<ActionResult> {
    try {
        const { data, error } = await supabase
            .from('incidents')
            .select('title, location, severity, status, reporter_name, taken_name, created_at')
            .neq('status', 'resolved')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) return { success: false, action: 'openIncidents', message: `Nie udało się pobrać awarii: ${error.message}` };
        const rows = (data ?? []) as Array<{ title: string; location: string | null; severity: string; status: string; reporter_name: string; taken_name: string | null }>;
        if (rows.length === 0) return { success: true, action: 'openIncidents', message: 'Nie ma otwartych awarii.' };

        const sevLabel: Record<string, string> = { blocking: 'BLOKUJE GABINET', hinders: 'utrudnia', minor: 'drobiazg' };
        const list = rows
            .map(r => `• [${sevLabel[r.severity] ?? r.severity}] ${r.title}${r.location ? ` (${r.location})` : ''}${r.taken_name ? ` — zajmuje się ${r.taken_name}` : ''}`)
            .join('\n');

        return {
            success: true,
            action: 'openIncidents',
            message: `Otwarte awarie (${rows.length}):\n${list}`,
            data: { count: rows.length, blocking: rows.filter(r => r.severity === 'blocking').length },
        };
    } catch (err: any) {
        return { success: false, action: 'openIncidents', message: `Błąd: ${err.message}` };
    }
}

// ─── Action: Update Memory ────────────────────────────────────

async function updateMemory(args: {
    facts: Record<string, string | null>;
    reason?: string;
}, userId: string): Promise<ActionResult> {
    try {
        const { data: existing } = await supabase
            .from('assistant_memory')
            .select('facts')
            .eq('user_id', userId)
            .single();

        const currentFacts: Record<string, any> = (existing as any)?.facts ?? {};
        const merged: Record<string, any> = { ...currentFacts };

        for (const [k, v] of Object.entries(args.facts)) {
            if (v === null) {
                delete merged[k];
            } else {
                merged[k] = v;
            }
        }

        const { error } = await supabase
            .from('assistant_memory')
            .upsert(
                { user_id: userId, facts: merged, updated_at: new Date().toISOString() },
                { onConflict: 'user_id' }
            );

        if (error) {
            console.error('[AssistantActions] Memory update error:', error);
            return { success: false, action: 'updateMemory', message: 'Nie udało się zapisać do pamięci.' };
        }

        const keys = Object.keys(args.facts).filter(k => args.facts[k] !== null);
        return {
            success: true,
            action: 'updateMemory',
            message: `Zapamiętałem: ${keys.join(', ')}.`,
            data: { updatedKeys: keys, totalFacts: Object.keys(merged).length },
        };
    } catch (err: any) {
        return { success: false, action: 'updateMemory', message: `Błąd zapisu pamięci: ${err.message}` };
    }
}

// ─── Main Dispatcher ─────────────────────────────────────────

export async function executeAction(
    functionName: string,
    args: Record<string, any>,
    userId: string,
    userEmail: string
): Promise<ActionResult> {
    console.log(`[AssistantActions] Executing ${functionName}:`, JSON.stringify(args).substring(0, 200));

    switch (functionName) {
        case 'createTask':
            return createTask(args as any, userId, userEmail);
        case 'addCalendarEvent':
            return addCalendarEvent(args as any, userId);
        case 'addReminder':
            return addReminder(args as any, userId);
        case 'dictateDocumentation':
            return dictateDocumentation(args as any, userId, userEmail);
        case 'searchPatient':
            return searchPatient(args as any);
        case 'checkSchedule':
            return checkSchedule(args as any);
        case 'updateTask':
            return updateTask(args as any, userId);
        case 'updateMemory':
            return updateMemory(args as any, userId);
        // Narzędzia CZYTAJĄCE — bez nich asystent nie odpowiadał na najczęstsze pytania.
        case 'listMyTasks':
            return listMyTasks(args as any, userId);
        case 'myWorkTime':
            return myWorkTime(args as any, userId);
        case 'myLeaveBalance':
            return myLeaveBalance(args as any, userId);
        case 'openIncidents':
            return openIncidents(args as any);
        default:
            return { success: false, action: functionName, message: `Nieznana akcja: ${functionName}` };
    }
}

