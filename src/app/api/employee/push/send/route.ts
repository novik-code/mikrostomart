import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { sendPushToSpecificUsers, resolveGroupUsers } from '@/lib/pushService';

export const dynamic = 'force-dynamic';

/**
 * POST /api/employee/push/send
 *
 * Send a manual one-time push notification.
 * Accessible to employees AND admins.
 *
 * Body:
 *   title: string         — notification title (required)
 *   body: string          — notification body text (required)
 *   url?: string          — optional click URL
 *   groups?: string[]     — target groups (patients/doctors/hygienists/reception/assistant/admin)
 *   userIds?: string[]    — target individual user IDs
 *
 * Deduplication: if a user matches both a group and an explicit userId,
 * they receive exactly ONE notification (not two).
 * This works by collecting all target user_ids into a Set first,
 * then sending via sendPushToSpecificUsers which deduplicates by endpoint.
 */
export async function POST(req: Request) {
    const user = await verifyAdmin();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isEmployee = await hasRole(user.id, 'employee');
    const isAdmin = await hasRole(user.id, 'admin');
    if (!isEmployee && !isAdmin) {
        return NextResponse.json({ error: 'Brak uprawnień pracownika' }, { status: 403 });
    }

    try {
        const { title, body: bodyText, url, groups, userIds } = await req.json();

        if (!title?.trim() || !bodyText?.trim()) {
            return NextResponse.json({ error: 'Wymagany tytuł i treść' }, { status: 400 });
        }

        const hasTargets = (groups && groups.length > 0) || (userIds && userIds.length > 0);
        if (!hasTargets) {
            return NextResponse.json({ error: 'Wybierz co najmniej jedną grupę lub odbiorcę' }, { status: 400 });
        }

        const payload = {
            title: title.trim(),
            body: bodyText.trim(),
            url: url || '/pracownik',
            tag: `manual-${Date.now()}`,
        };

        // ── Collect all target user IDs (groups + explicit), deduplicated ──
        // This prevents a user in both a group and the explicit list from
        // receiving duplicate notifications.
        const allUserIds = new Set<string>(userIds || []);

        if (groups && groups.length > 0) {
            for (const group of groups as string[]) {
                // 🔴 GRUPA „pacjenci" ODRZUCONA. Trasa stoi wyłącznie na roli pracownika
                // (linie 36-40), więc KAŻDY członek zespołu mógł nią wysłać powiadomienie
                // do wszystkich pacjentów w bazie. Dziś jest to bezzębne, bo odbiorcy
                // czytani są z porzuconej tabeli `push_subscriptions` — ale to przypadek,
                // nie zabezpieczenie: naprawa źródła odbiorców zamieniłaby tę gałąź
                // w przycisk masowej wysyłki. Interfejs (TasksTab) i tak oferuje wyłącznie
                // grupy personelu; masowa komunikacja do pacjentów ma własną, admin-only ścieżkę.
                if (group === 'patients' || group === 'patient') {
                    return NextResponse.json(
                        { error: 'Wysyłka do grupy pacjentów nie jest dostępna z tej trasy' },
                        { status: 400 }
                    );
                }

                // 🪤 ODBIORCY Z ŻYWEGO ŹRÓDŁA, nie z porzuconej tabeli.
                // `push_subscriptions` zostało zastąpione przez `fcm_tokens` w migracji 104
                // i od tego czasu NIC do niej nie pisze — jedyny klient rejestrujący tokeny
                // (`PushNotificationPrompt`) woła `/api/push/subscribe`, które pisze do
                // `fcm_tokens`. Rozwiązywanie grup z martwej tabeli dawało pustą listę
                // i komunikat „Brak subskrybentów w wybranych grupach" przy pełnym zespole.
                // `resolveGroupUsers` idzie po `user_roles` + `employees.push_groups`
                // i przyjmuje DOKŁADNIE te nazwy grup, które przychodzą
                // z panelu (doctors/hygienists/reception/assistant/admin), więc żadne
                // mapowanie nie jest potrzebne — i nie ma gdzie się rozjechać.
                const rozwiazani = await resolveGroupUsers(group as Parameters<typeof resolveGroupUsers>[0]);
                rozwiazani.forEach(r => allUserIds.add(r.user_id));
            }
        }

        if (allUserIds.size === 0) {
            return NextResponse.json({ sent: 0, failed: 0, message: 'Brak subskrybentów w wybranych grupach' });
        }

        // Single deduplicated send — sendPushToSpecificUsers keeps max 3 subs per user
        // (covers genuine multi-device users) and cleans up expired subscriptions.
        const result = await sendPushToSpecificUsers([...allUserIds], payload);

        console.log(`[PushSend] ${user.email} manual push → users=${allUserIds.size} sent=${result.sent} failed=${result.failed}`);
        return NextResponse.json({ sent: result.sent, failed: result.failed });
    } catch (err: any) {
        console.error('[PushSend] Error:', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
