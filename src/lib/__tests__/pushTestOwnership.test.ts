/* eslint-disable @typescript-eslint/no-explicit-any --
 * Atrapy łańcucha PostgREST są z natury dynamiczne. Zawężenie do typów SDK wywala
 * kompilację na `TS2589`. Konwencja repo: jawne wyłączenie z powodem, nie ciche `any`.
 */
/**
 * STRAŻNIK TRASY TESTOWEGO PUSHA (znalezione 06.09 przy P-088, poza planem audytu).
 *
 * 🔴 CO BYŁO ZEPSUTE. `POST /api/push/test` nie miała ŻADNEGO uwierzytelnienia: ani sesji
 * pacjenta, ani roli, ani sekretu crona, ani limitu. Brała `userId` i `userType` WPROST
 * z ciała żądania i wysyłała powiadomienie na telefon wskazanej osoby — pacjenta albo
 * pracownika — dokładając przy tym wpis do jej historii alertów (`logPush` zapisuje przed
 * wysyłką i niezależnie od niej). Zmierzone na produkcji 06.09: trasa żywa, puste ciało
 * oddaje 400 „Missing userId or userType", czyli anonim dochodzi do walidacji.
 *
 * 🔑 DLACZEGO NIE USUNIĘCIE, jak przy `reset-status` (P-087): tę trasę wołają realni
 * użytkownicy. `PushNotificationPrompt` uderza w nią zaraz po zapisaniu subskrypcji,
 * żeby człowiek zobaczył, że powiadomienia działają — w strefie pacjenta i w panelu.
 *
 * 🔑 NAPRAWA: odbiorcę ustala SESJA, nie ciało żądania. Pole `userId` z ciała jest
 * ignorowane — trasa wysyła wyłącznie do tego, kto o to poprosił. Kontrakt się nie
 * zmienia: klient dalej może przysyłać co chce, po prostu nie ma to już wpływu.
 *
 * DOWÓD, ŻE GRYZIE (cofka): przywróć `const { userId, userType } = await request.json()`
 * i przekaż je do `pushToUser` → padają dwa pierwsze testy.
 *
 * Uruchomienie: `npx vitest run pushTestOwnership`
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const JA_PACJENT = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const OFIARA = 'ffffffff-9999-4999-8999-ffffffffffff';
const JA_PERSONEL = 'cccccccc-3333-4333-8333-cccccccccccc';

let pushe: { userId: string; userType: string }[] = [];
let sesjaPacjenta: { userId: string } | null = null;
let sesjaPersonelu: { id: string; email: string } | null = null;

vi.mock('@/lib/pushService', () => ({
    pushToUser: async (userId: string, userType: string) => {
        pushe.push({ userId, userType });
        return { sent: 1, failed: 0 };
    },
}));
vi.mock('@/lib/jwt', () => ({ verifyPatientSession: async () => sesjaPacjenta }));
vi.mock('@/lib/auth', () => ({ verifyAdmin: async () => sesjaPersonelu }));

const req = (body: unknown) =>
    new NextRequest('https://example.test/api/push/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
    });

beforeEach(() => {
    vi.clearAllMocks();
    pushe = [];
    sesjaPacjenta = null;
    sesjaPersonelu = null;
});

describe('znalezisko 06.09 · testowy push idzie WYŁĄCZNIE do siebie', () => {
    it('🔴 SEDNO: pacjent nie wyśle pusha na cudzy identyfikator', async () => {
        sesjaPacjenta = { userId: JA_PACJENT };
        const { POST } = await import('@/app/api/push/test/route');
        const res = await POST(req({ userId: OFIARA, userType: 'patient' }));

        expect(res.status).toBe(200);
        expect(pushe).toHaveLength(1);
        // Ciało prosiło o OFIARĘ — poszło do wołającego.
        expect(pushe[0].userId).toBe(JA_PACJENT);
        expect(pushe[0].userType).toBe('patient');
    });

    it('🔴 SEDNO: anonim nie wyśle pusha NIKOMU', async () => {
        const { POST } = await import('@/app/api/push/test/route');
        const res = await POST(req({ userId: OFIARA, userType: 'patient' }));

        expect(res.status).toBe(401);
        expect(pushe).toHaveLength(0);
    });

    it('🔴 pracownik też nie podstawi cudzego identyfikatora', async () => {
        sesjaPersonelu = { id: JA_PERSONEL, email: 'kto@example.test' };
        const { POST } = await import('@/app/api/push/test/route');
        const res = await POST(req({ userId: OFIARA, userType: 'employee' }));

        expect(res.status).toBe(200);
        expect(pushe[0].userId).toBe(JA_PERSONEL);
    });

    it('🪤 `userType` z ciała nie przestawia typu odbiorcy', async () => {
        // Pacjent podszywa się pod personel, żeby trafić w inną tabelę tokenów.
        sesjaPacjenta = { userId: JA_PACJENT };
        const { POST } = await import('@/app/api/push/test/route');
        await POST(req({ userId: JA_PACJENT, userType: 'admin' }));

        expect(pushe[0].userType).toBe('patient');
    });

    it('pusty ciało od zalogowanego działa — identyfikator i tak bierzemy z sesji', async () => {
        sesjaPacjenta = { userId: JA_PACJENT };
        const { POST } = await import('@/app/api/push/test/route');
        const res = await POST(req({}));

        expect(res.status).toBe(200);
        expect(pushe[0].userId).toBe(JA_PACJENT);
    });
});
