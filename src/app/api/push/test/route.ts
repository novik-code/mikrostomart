import { NextRequest, NextResponse } from 'next/server';
import { pushToUser } from '@/lib/pushService';
import { verifyPatientSession } from '@/lib/jwt';
import { verifyAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/push/test
 *
 * Wysyła powiadomienie testowe do OSOBY, KTÓRA O NIE PROSI. Wołane przez
 * `PushNotificationPrompt` zaraz po zapisaniu subskrypcji, żeby człowiek zobaczył,
 * że powiadomienia realnie działają.
 *
 * 🔴 DO 06.09 TA TRASA NIE MIAŁA ŻADNEGO UWIERZYTELNIENIA — ani sesji, ani roli, ani
 * sekretu, ani limitu — a odbiorcę brała WPROST z ciała żądania (`userId`, `userType`).
 * Każdy z internetu, kto znał czyjś identyfikator, wysyłał powiadomienie na jego telefon
 * i dokładał wpis do jego historii alertów (`logPush` zapisuje przed wysyłką, niezależnie
 * od jej wyniku). Zmierzone na produkcji: trasa żywa, puste ciało oddawało
 * 400 „Missing userId or userType", czyli anonim dochodził do walidacji.
 *
 * 🔑 DZIŚ ODBIORCĘ USTALA SESJA. Pola z ciała są ignorowane — świadomie, nie przez
 * przeoczenie: kontrakt się nie zmienia (klient dalej może je przysyłać), a trasa
 * przestaje być bronią. To ta sama zasada, która stoi za P-001 i P-040: tożsamość
 * bierzemy z podpisanego tokenu, nigdy z pola, które przysyła klient.
 */
export async function POST(request: NextRequest) {
    try {
        /**
         * Kolejność: najpierw pacjent (cookie albo Bearer z apki), potem personel
         * (sesja Supabase). Obie ścieżki wołają tę trasę z tego samego komponentu.
         */
        const pacjent = await verifyPatientSession(request);
        const personel = pacjent ? null : await verifyAdmin();

        const userId = pacjent?.userId || personel?.id;
        const userType: 'patient' | 'employee' = pacjent ? 'patient' : 'employee';

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log(`[Push Test] Sending test push to ${userType} (z sesji)`);

        const result = await pushToUser(
            userId,
            userType,
            {
                title: '🔔 Test Push Notification',
                body: 'If you see this, push notifications are working! / Powiadomienia push działają!',
                tag: 'push-test',
                url: '/strefa-pacjenta/wiadomosci',
            }
        );

        return NextResponse.json({
            success: true,
            message: 'Test push sent',
            result,
        });
    } catch (error: unknown) {
        console.error('[Push Test] Error:', error);
        return NextResponse.json(
            { error: 'Failed to send test push' },
            { status: 500 }
        );
    }
}
