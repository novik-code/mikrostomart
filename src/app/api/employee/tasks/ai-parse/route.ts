import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/** Parse natural-language text into structured tasks using GPT-4o */
async function parseTextToTasks(text: string, nowIso: string, timezone: string): Promise<ParsedTask[]> {
    const systemPrompt = `Jesteś asystentem który analizuje krótkie notatki głosowe lub tekstowe i wyciąga z nich zadania do wykonania.

Dzisiaj jest: ${nowIso} (strefa czasowa: ${timezone})

Zwróć WYŁĄCZNIE tablicę JSON (bez markdown, bez komentarzy) z obiektami o strukturze:
{
  "title": "Krótki tytuł zadania",
  "description": "Opcjonalny opis lub lista (np. lista zakupów)",
  "due_date": "YYYY-MM-DD lub null",
  "due_time": "HH:MM lub null",
  "checklist_items": ["item1","item2"] lub [],
  "reminders": ["48h","24h","1h"] // które przypomnienia wygenerować
}

Zasady:
- "jutro" = data jutrzejsza, "pojutrze" = za 2 dni, "w środę" = najbliższa środa itp.
- Jeśli tekst zawiera listę rzeczy do kupienia/zrobienia → wstaw je do "checklist_items" i ustaw "description"
- Domyślne przypomnienia: jeśli zadanie ma godzinę → ["1h"]; jeśli ma tylko datę → ["2h"]; jeśli brak daty → []
- Użytkownik może podać własne preferencje przypomnień w tekście (np. "przypomnij mi dzień wcześniej" → ["24h"])
- Jedno zdanie = jedno zadanie; jeśli jest lista → pogrupuj sensownie
- Zawsze odpowiadaj po polsku`;

    const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text },
        ],
    });

    const raw = resp.choices[0].message.content?.trim() || '[]';
    // Strip optional markdown fences
    const json = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(json) as ParsedTask[];
}

interface ParsedTask {
    title: string;
    description?: string;
    due_date?: string | null;
    due_time?: string | null;
    checklist_items?: string[];
    reminders?: string[]; // '48h' | '24h' | '2h' | '1h' | '30min'
}

/** Calculate reminder timestamps from a task's due date/time */
function buildReminderTimestamps(
    dueDate: string | null | undefined,
    dueTime: string | null | undefined,
    reminders: string[]
): Date[] {
    if (!dueDate || reminders.length === 0) return [];

    const baseIso = dueTime
        ? `${dueDate}T${dueTime}:00`
        : `${dueDate}T09:00:00`; // morning default for date-only tasks

    const base = new Date(baseIso);
    const offsets: Record<string, number> = {
        '48h': 48 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '2h': 2 * 60 * 60 * 1000,
        '1h': 1 * 60 * 60 * 1000,
        '30min': 30 * 60 * 1000,
    };

    const now = Date.now();
    return reminders
        .filter(r => offsets[r])
        .map(r => new Date(base.getTime() - offsets[r]))
        .filter(d => d.getTime() > now); // only future reminders
}

/**
 * POST /api/employee/tasks/ai-parse
 *
 * Parses natural-language input into tasks, saves them as private tasks,
 * and schedules push reminders.
 *
 * Body: { text: string, timezone?: string }
 * Returns: { tasks: CreatedTask[] }
 */
export async function POST(req: Request) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień' }, { status: 403 });
    }

    const { text, timezone = 'Europe/Warsaw' } = await req.json();

    if (!text?.trim()) {
        return NextResponse.json({ error: 'Brak tekstu do analizy' }, { status: 400 });
    }

    // Parse with GPT
    let parsed: ParsedTask[];
    try {
        parsed = await parseTextToTasks(text.trim(), new Date().toISOString(), timezone);
    } catch (e: any) {
        console.error('[AI-Parse] GPT error:', e);
        return NextResponse.json({ error: 'Błąd AI: ' + e.message }, { status: 500 });
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
        return NextResponse.json({ tasks: [] });
    }

    const createdTasks: any[] = [];

    for (const p of parsed) {
        // Build checklist items
        const checklistItems = (p.checklist_items || []).map((label: string) => ({
            label,
            done: false,
        }));

        // Insert task
        const { data: task, error: taskErr } = await supabase
            .from('employee_tasks')
            .insert({
                title: p.title,
                description: p.description || null,
                status: 'todo',
                priority: 'medium',
                due_date: p.due_date || null,
                due_time: p.due_time || null,
                checklist_items: checklistItems,
                is_private: true,
                owner_user_id: user.id,
                created_by: user.id,
                created_by_email: user.email,
                assigned_to: [],
            })
            .select()
            .single();

        if (taskErr || !task) {
            console.error('[AI-Parse] Task insert error:', taskErr);
            continue;
        }

        // Schedule reminders
        const reminders = p.reminders || (p.due_time ? ['1h'] : p.due_date ? ['2h'] : []);
        const reminderDates = buildReminderTimestamps(p.due_date, p.due_time, reminders);

        if (reminderDates.length > 0) {
            await supabase.from('task_reminders').insert(
                reminderDates.map(d => ({
                    task_id: task.id,
                    user_id: user.id,
                    remind_at: d.toISOString(),
                    reminded: false,
                }))
            );
        }

        createdTasks.push({ ...task, remindersScheduled: reminderDates.length });
    }

    console.log(`[AI-Parse] ${user.email} created ${createdTasks.length} private tasks from voice input`);
    return NextResponse.json({ tasks: createdTasks });
}
