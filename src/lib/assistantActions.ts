/**
 * Assistant Action Dispatcher
 * Server-side execution of actions triggered by the Voice AI Assistant
 */

import { createClient } from '@supabase/supabase-js';
import { createEvent, listEvents, isCalendarConnected } from './googleCalendar';
import { sendPushToUser } from './webpush';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PRODENTIS_API_URL = process.env.PRODENTIS_API_URL || 'http://83.230.40.14:3000';

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
    checklist_items?: string[];
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

        const task = {
            title: args.title,
            description: args.description || null,
            status: 'todo',
            priority: args.priority || 'normal',
            task_type: args.task_type || null,
            patient_name: args.patient_name || null,
            due_date: args.due_date || null,
            assigned_to: assignedTo,
            checklist_items: checklistItems,
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

        // Send push notification to employees
        try {
            const { sendPushToAllEmployees } = await import('./webpush');
            await sendPushToAllEmployees(
                {
                    title: '📋 Nowe zadanie (Asystent)',
                    body: `${args.title}${args.patient_name ? ` — ${args.patient_name}` : ''}`,
                    url: '/pracownik',
                    tag: `task-new-${data.id}`,
                },
                userId
            );
        } catch { /* push is optional */ }

        const dueDateStr = args.due_date
            ? new Date(args.due_date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
            : 'brak terminu';

        return {
            success: true,
            action: 'createTask',
            message: `Utworzono zadanie "${args.title}"${args.patient_name ? ` dla pacjenta ${args.patient_name}` : ''}. Termin: ${dueDateStr}.${assignedTo.length > 0 ? ` Przypisano do: ${assignedTo.map(a => a.name).join(', ')}.` : ''}`,
            data: { taskId: data.id },
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

        // Send email with Resend
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);

        const recipientEmail = args.recipient_email || userEmail;
        const subject = args.subject || 'Dokumentacja — Asystent AI';

        await resend.emails.send({
            from: 'Mikrostomart <noreply@mikrostomart.pl>',
            to: recipientEmail,
            subject: `📝 ${subject}`,
            html: `
                <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: #1a1b1e; border-radius: 12px; padding: 24px; color: #f3f4f6;">
                        <h2 style="color: #dcb14a; margin-top: 0;">📝 ${subject}</h2>
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
        const res = await fetch(`${PRODENTIS_API_URL}/api/patients/search?q=${encodeURIComponent(args.query)}&limit=5`);

        if (!res.ok) {
            return { success: false, action: 'searchPatient', message: 'Nie udało się wyszukać pacjenta w systemie Prodentis.' };
        }

        const data = await res.json();
        const patients = data.patients || data || [];

        if (patients.length === 0) {
            return { success: true, action: 'searchPatient', message: `Nie znaleziono pacjenta o nazwisku "${args.query}".` };
        }

        const list = patients.slice(0, 5).map((p: any, i: number) => {
            const parts = [`${i + 1}. ${p.firstName || ''} ${p.lastName || p.name || ''}`];
            if (p.phone) parts.push(`tel: ${p.phone}`);
            if (p.email) parts.push(`email: ${p.email}`);
            if (p.pesel) parts.push(`PESEL: ${p.pesel}`);
            return parts.join(', ');
        }).join('\n');

        return {
            success: true,
            action: 'searchPatient',
            message: `Znaleziono ${patients.length} pacjent${patients.length === 1 ? 'a' : 'ów'}:\n${list}`,
            data: { patients: patients.slice(0, 5) },
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

        const res = await fetch(`${PRODENTIS_API_URL}/api/appointments/by-date?date=${targetDate}`);

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
                const time = apt.startTime || apt.time || '?';
                const patient = apt.patientName || apt.patient?.name || '?';
                const type = apt.appointmentType || apt.type || '';
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
        default:
            return { success: false, action: functionName, message: `Nieznana akcja: ${functionName}` };
    }
}
