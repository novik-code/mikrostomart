import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPatientSession } from '@/lib/jwt';

/**
 * GET /api/patients/chat/unread → `{ unread: number }`
 *
 * Licznik nieprzeczytanych wiadomości od recepcji — do plakietki na kafelku
 * „Porozmawiaj z nami" na pulpicie pacjenta.
 *
 * 🔑 **DLACZEGO OSOBNA TRASA, A NIE `GET /api/patients/chat`:** tamta przy KAŻDYM
 * wywołaniu oznacza wiadomości jako przeczytane (`chat_messages.read = true`
 * i `chat_conversations.unread_by_patient = false`). Pulpit wołający ją po to,
 * żeby pokazać licznik, skasowałby dokładnie to, co miał pokazać — plakietka
 * gasłaby, zanim pacjent zdążyłby ją zobaczyć. Ta sama pułapka, przez którą
 * wątku czatu nie pollujemy po stronie personelu.
 *
 * Trasa jest CZYSTO ODCZYTOWA: zero zapisów, zero powiadomień, zero audytu —
 * i dlatego jest bezpieczna do wołania przy każdym wejściu na pulpit.
 *
 * ⚪ Zwraca liczbę wiadomości, nie wątków: pacjent ma najwyżej jedną otwartą
 * rozmowę z recepcją, więc „3 nowe" czyta się naturalnie.
 */
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const payload = await verifyPatientSession(request);
    if (!payload) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { data: patient } = await supabase
            .from('patients')
            .select('id')
            .eq('prodentis_id', payload.prodentisId)
            .single();

        // Brak konta w tabeli albo brak otwartej rozmowy to NIE jest błąd —
        // to najczęstszy stan. Oddajemy zero, żeby klient nie musiał rozróżniać.
        if (!patient) return NextResponse.json({ unread: 0 });

        const { data: conversation } = await supabase
            .from('chat_conversations')
            .select('id')
            .eq('patient_id', patient.id)
            .eq('status', 'open')
            .maybeSingle();

        if (!conversation) return NextResponse.json({ unread: 0 });

        // Liczymy WYŁĄCZNIE wiadomości od recepcji — własne z definicji są przeczytane.
        // `head: true` → sam licznik, bez treści; do apki nie wychodzi ani jedno zdanie.
        const { count, error } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conversation.id)
            .eq('sender_role', 'reception')
            .eq('read', false);

        if (error) throw error;

        return NextResponse.json({ unread: count ?? 0 });
    } catch (error) {
        console.error('[PatientChat] Unread count error:', error);
        // 🔑 Plakietka to dodatek — jej awaria nie może wywrócić pulpitu pacjenta.
        // Rozróżnienie „błąd" od „zero" i tak nie zmienia tego, co widzi człowiek.
        return NextResponse.json({ unread: 0 });
    }
}
