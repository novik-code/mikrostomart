/**
 * Employee Email AI Config API — admin-only CRUD for:
 * - Sender rules (include/exclude patterns)
 * - Training instructions (free-text AI instructions)
 * - Feedback/learning history (read-only)
 * 
 * GET:    Returns { rules[], instructions[], feedback[], stats }
 * POST:   Create rule or instruction ({ type: 'rule' | 'instruction', ... })
 * PUT:    Update rule or instruction ({ type: 'rule' | 'instruction', id, ... })
 * DELETE: Remove rule or instruction (?type=rule|instruction&id=UUID)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { buildContextPrompt, invalidateKBCache } from '@/lib/unifiedAI';
import { KNOWLEDGE_BASE } from '@/lib/knowledgeBase';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function requireAdmin(): Promise<{ userId: string; email: string } | null> {
    const user = await verifyAdmin();
    if (!user) return null;
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isAdmin) return null;
    return { userId: user.id, email: user.email || '' };
}

// ─── GET: Fetch all config ──────────────────────────────────────

export async function GET() {
    const admin = await requireAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 });
    }

    try {
        // Each query individually try/caught so KB loads even if training tables missing
        let rules: any[] = [];
        let instructions: any[] = [];
        let feedback: any[] = [];
        let allDrafts: any[] = [];

        try {
            const { data } = await supabase.from('email_ai_sender_rules').select('*').order('created_at', { ascending: false });
            rules = data || [];
        } catch { /* table may not exist yet */ }

        try {
            const { data } = await supabase.from('email_ai_instructions').select('*').order('created_at', { ascending: false });
            instructions = data || [];
        } catch { /* table may not exist yet */ }

        try {
            const { data } = await supabase.from('email_ai_feedback').select('*').order('created_at', { ascending: false }).limit(20);
            feedback = data || [];
        } catch { /* table may not exist yet */ }

        try {
            const { data } = await supabase.from('email_ai_drafts').select('status, admin_rating');
            allDrafts = data || [];
        } catch { /* table may not exist yet */ }

        // Compute stats
        const draftStats = {
            total: allDrafts.length,
            pending: allDrafts.filter((d: any) => d.status === 'pending').length,
            approved: allDrafts.filter((d: any) => d.status === 'approved').length,
            sent: allDrafts.filter((d: any) => d.status === 'sent').length,
            rejected: allDrafts.filter((d: any) => d.status === 'rejected').length,
            learned: allDrafts.filter((d: any) => d.status === 'learned').length,
            avgRating: (() => {
                const rated = allDrafts.filter((d: any) => d.admin_rating);
                if (rated.length === 0) return null;
                return Math.round(rated.reduce((sum: number, d: any) => sum + d.admin_rating, 0) / rated.length * 10) / 10;
            })(),
        };

        // Fetch knowledge base from unified AI system (Supabase sections)
        let knowledgeBase = '';
        try {
            knowledgeBase = await buildContextPrompt('email_draft');
        } catch {
            // Fallback to static KB
            knowledgeBase = KNOWLEDGE_BASE;
        }

        // ─── Edytowalne SEKCJE bazy wiedzy (dodane 2026-07-31) ───────────────
        // `knowledgeBase` wyżej to GOTOWY PROMPT: rola + posklejane sekcje. Da się go
        // czytać, ale NIE da się go zapisać z powrotem — nie ma jak rozdzielić, która
        // linia należy do której sekcji. Dokładnie stąd wziął się zapis do
        // `site_settings.ai_knowledge_base`, którego potem nikt nie czytał
        // (`getKnowledgeBase()` ma zero wywołań w repo). Edycja idzie więc PER SEKCJA,
        // czyli tak, jak dane naprawdę leżą w tabeli.
        //
        // Filtrujemy do sekcji, które realnie docierają do kontekstu `email_draft` —
        // pokazywanie admina sekcji, która i tak nie wpływa na maile, uczyłoby, że
        // edycja „nic nie daje".
        let knowledgeSections: Array<Record<string, unknown>> = [];
        try {
            const { data } = await supabase
                .from('ai_knowledge_base')
                .select('id, section, title, content, context_tags, priority, is_active, updated_at, updated_by')
                .order('priority', { ascending: true });
            knowledgeSections = (data || []).filter((s: any) => {
                const tags: string[] = s.context_tags || [];
                return tags.includes('*') || tags.includes('email_draft');
            });
        } catch { /* tabela może nie istnieć — zostaje sam podgląd promptu */ }

        return NextResponse.json({
            rules,
            instructions,
            feedback,
            stats: draftStats,
            knowledgeBase,
            knowledgeSections,
        });
    } catch (err: any) {
        console.error('[Email AI Config] GET error:', err);
        // Even on total failure, return KB
        return NextResponse.json({
            rules: [],
            instructions: [],
            feedback: [],
            stats: null,
            knowledgeBase: KNOWLEDGE_BASE,
        });
    }
}

// ─── POST: Create rule or instruction ───────────────────────────

export async function POST(req: NextRequest) {
    const admin = await requireAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { type } = body;

        if (type === 'rule') {
            const { email_pattern, rule_type, note } = body;
            if (!email_pattern) {
                return NextResponse.json({ error: 'Missing email_pattern' }, { status: 400 });
            }

            const { data, error } = await supabase
                .from('email_ai_sender_rules')
                .insert({
                    email_pattern: email_pattern.toLowerCase().trim(),
                    rule_type: rule_type || 'exclude',
                    note: note || null,
                    created_by: admin.email,
                })
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json({ rule: data });
        }

        if (type === 'instruction') {
            const { instruction, category } = body;
            if (!instruction) {
                return NextResponse.json({ error: 'Missing instruction' }, { status: 400 });
            }

            const { data, error } = await supabase
                .from('email_ai_instructions')
                .insert({
                    instruction: instruction.trim(),
                    category: category || 'other',
                    is_active: true,
                    created_by: admin.email,
                })
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json({ instruction: data });
        }

        return NextResponse.json({ error: 'Invalid type — use "rule" or "instruction"' }, { status: 400 });
    } catch (err: any) {
        console.error('[Email AI Config] POST error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ─── PUT: Update rule or instruction ────────────────────────────

export async function PUT(req: NextRequest) {
    const admin = await requireAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { type, id } = body;

        // 🔴 Wartownik dotyczy WYŁĄCZNIE gałęzi, które kluczują po `id`.
        // Sekcja bazy wiedzy kluczuje po `section` i `id` nie ma tam żadnego sensu —
        // a ten warunek stał kiedyś bezwarunkowo na wejściu PUT-a i odrzucał
        // KAŻDY zapis bazy wiedzy z „Missing id", zanim rozpoznano typ żądania.
        // Dlatego zapis bazy wiedzy nie działał NIGDY: ani nowy (do tabeli),
        // ani stary (do `site_settings`) — żądanie nie docierało nawet tam.
        if (type !== 'knowledge_base' && !id) {
            return NextResponse.json({ error: 'Missing id' }, { status: 400 });
        }

        if (type === 'rule') {
            const updates: Record<string, any> = {};
            if (body.email_pattern !== undefined) updates.email_pattern = body.email_pattern.toLowerCase().trim();
            if (body.rule_type !== undefined) updates.rule_type = body.rule_type;
            if (body.note !== undefined) updates.note = body.note;

            const { data, error } = await supabase
                .from('email_ai_sender_rules')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json({ rule: data });
        }

        if (type === 'instruction') {
            const updates: Record<string, any> = { updated_at: new Date().toISOString() };
            if (body.instruction !== undefined) updates.instruction = body.instruction.trim();
            if (body.category !== undefined) updates.category = body.category;
            if (body.is_active !== undefined) updates.is_active = body.is_active;

            const { data, error } = await supabase
                .from('email_ai_instructions')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return NextResponse.json({ instruction: data });
        }

        // ─── Zapis SEKCJI bazy wiedzy ────────────────────────────────────────
        // 🔴 NAPRAWIONE 2026-07-31. Edytor bazy wiedzy nie działał NIGDY, i to
        // z DWÓCH niezależnych powodów naraz:
        //
        // 1. Wartownik `if (!id)` na wejściu PUT-a (patrz wyżej) odrzucał żądanie
        //    z „Missing id", zanim ktokolwiek spojrzał na `type`. Żaden klient
        //    nie wysyłał `id`, bo baza wiedzy kluczuje po `section`.
        // 2. Nawet gdyby doszło dalej, zapis szedł do `site_settings.ai_knowledge_base`,
        //    a AI czyta z TABELI `ai_knowledge_base` (`loadKnowledgeBase` w `unifiedAI`).
        //    Jedynym czytelnikiem `site_settings` był `getKnowledgeBase()`, który
        //    NIE MA w repo ani jednego wywołania.
        //
        // Zapis trafia teraz tam, skąd model czyta, i dokłada wpis do historii.
        // ⚠️ `invalidateKBCache()` czyści cache TYLKO w tej instancji lambdy —
        // generowanie odpowiedzi biegnie w innej funkcji, więc w najgorszym razie
        // stara treść żyje jeszcze do 5 minut (TTL `kbCache`). Komunikat dla
        // użytkownika mówi „do kilku minut" właśnie dlatego, a nie „od następnej
        // odpowiedzi" — obietnica bez pokrycia byłaby kolejną odsłoną tego błędu.
        if (type === 'knowledge_base') {
            const { section, content, change_reason } = body;

            if (typeof content !== 'string' || !content.trim()) {
                return NextResponse.json({ error: 'Missing content' }, { status: 400 });
            }
            // Świadomie ODRZUCAMY zapis bez wskazanej sekcji zamiast zgadywać.
            // Stary klient wysyłał tu cały sklejony prompt — nie ma sposobu, żeby
            // rozłożyć go z powrotem na sekcje, więc każde „zgadnięcie" nadpisałoby
            // cudzą treść. Lepszy widoczny błąd niż cichy zapis w próżnię.
            if (!section || typeof section !== 'string') {
                return NextResponse.json(
                    {
                        error: 'Wskaż sekcję bazy wiedzy do zapisu (pole "section"). '
                            + 'Baza jest podzielona na sekcje i zapisuje się je pojedynczo.',
                        code: 'section_required',
                    },
                    { status: 400 },
                );
            }

            const { data: existing, error: findErr } = await supabase
                .from('ai_knowledge_base')
                .select('content')
                .eq('section', section)
                .maybeSingle();

            if (findErr) throw findErr;
            if (!existing) {
                return NextResponse.json(
                    { error: `Nie ma sekcji "${section}"`, code: 'section_not_found' },
                    { status: 404 },
                );
            }

            const { data, error } = await supabase
                .from('ai_knowledge_base')
                .update({
                    content,
                    updated_at: new Date().toISOString(),
                    updated_by: admin.email || 'admin',
                })
                .eq('section', section)
                .select('id, section, title, content, context_tags, priority, is_active, updated_at, updated_by')
                .single();

            if (error) throw error;

            if (existing.content !== content) {
                await supabase.from('ai_knowledge_base_history').insert({
                    section,
                    old_content: existing.content ?? null,
                    new_content: content,
                    change_reason: change_reason || 'Edycja z zakładki Poczta',
                    changed_by: admin.email || 'admin',
                });
            }

            invalidateKBCache();
            return NextResponse.json({ success: true, section: data });
        }

        return NextResponse.json({ error: 'Invalid type — use "rule", "instruction", or "knowledge_base"' }, { status: 400 });
    } catch (err: any) {
        console.error('[Email AI Config] PUT error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ─── DELETE: Remove rule or instruction ─────────────────────────

export async function DELETE(req: NextRequest) {
    const admin = await requireAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
        return NextResponse.json({ error: 'Missing type and id params' }, { status: 400 });
    }

    try {
        const table = type === 'rule' ? 'email_ai_sender_rules'
            : type === 'instruction' ? 'email_ai_instructions'
                : null;

        if (!table) {
            return NextResponse.json({ error: 'Invalid type — use "rule" or "instruction"' }, { status: 400 });
        }

        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('[Email AI Config] DELETE error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
