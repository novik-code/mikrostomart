import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/authGuards';
import { createClient } from '@supabase/supabase-js';
import { logAudit } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' };

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Kasuje WSZYSTKIE żywe tokeny push pracownika:
 *   · fcm_tokens        — web-push (mig 104),
 *   · staff_push_tokens — aplikacja mobilna personelu, Expo (mig 179).
 * Wcześniej trasa czyściła wyłącznie `push_subscriptions` — tabelę porzuconą
 * w mig 104 — więc zwolniony pracownik dalej dostawał powiadomienia na telefon.
 */
async function revokePushTokens(userId: string): Promise<void> {
    // user_type ograniczony do personelu: to samo auth id może mieć też rolę pacjenta
    // (właściciel), a konto pacjenta zostaje nietknięte.
    const { error: fcmError } = await supabase
        .from('fcm_tokens')
        .delete()
        .eq('user_id', userId)
        .in('user_type', ['employee', 'admin']);
    if (fcmError) console.error('[Deactivate] fcm_tokens delete error:', fcmError.message);

    const { error: expoError } = await supabase
        .from('staff_push_tokens')
        .delete()
        .eq('user_id', userId);
    if (expoError) console.error('[Deactivate] staff_push_tokens delete error:', expoError.message);

    // Legacy web-push sprzed mig 104 — zostawione, bo wiersze mogą jeszcze istnieć.
    await supabase.from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('user_type', 'employee');
}

/**
 * Offboarding czatu wewnętrznego zespołu (mig 183, D6).
 *
 * Rozmowy ZOSTAJĄ u drugiej strony — skasowanie historii przy odejściu jednej osoby
 * zabrałoby drugiej dowód, co ustalono. Znika NAZWISKO i znika DOSTĘP:
 *
 *  a) `sender_name_snapshot` → pusty string. Snapshot jest denormalizacją nazwiska z chwili
 *     wysyłki (żeby dało się wyświetlić wiadomość bez dociągania kartoteki); po wyczyszczeniu
 *     zostaje treść i autor jako UUID, bez danych osobowych. Ten sam ciąg szedł w tytule
 *     pusha o DM („Nowa wiadomość od X") — po odejściu nowych już nie będzie, a historia
 *     przestaje nieść nazwisko. Pusty string, a NIE „Były pracownik": pusty jest
 *     jedynym stanem, który warstwa powiadomień już zna i obsługuje (src/lib/pushTranslations.ts
 *     → `getStaffChatPush` schodzi wtedy na wariant bez imienia), a placeholder trzeba by
 *     tłumaczyć na cztery języki i tak czy owak renderowałby się jak czyjeś nazwisko.
 *
 *  b) wszystkie członkostwa → `left_at = teraz`. To jest właściwe odcięcie dostępu: odczyt
 *     wątku wymaga członkostwa AKTYWNEGO (`getActiveMembership`, `left_at IS NULL`) i nie ma
 *     od tego wyjątku dla admina. Wiersza NIE kasujemy (D6): zostaje ślad, kto miał dostęp
 *     i do kiedy, a `ensureMembership`/`syncGroupMembers` wstawiają z `ignoreDuplicates`,
 *     więc wiersz z `left_at` NIE jest wskrzeszany przy następnym wejściu do kanału zespołu.
 *     Zamierzony efekt uboczny: osoba przestaje się liczyć do składu wątku (`memberCount`).
 *
 * `messagesAnonymized` to liczba WIADOMOŚCI TEJ OSOBY (przy powtórnej dezaktywacji ta sama),
 * nie liczba świeżo zmienionych wierszy — nadpisanie pustego pustym jest bezszkodowe.
 * Funkcja jest NIEBLOKUJĄCA: błędy tylko loguje, `null` = kroku nie udało się wykonać.
 */
async function offboardStaffChat(userId: string): Promise<{
    membershipsClosed: number | null;
    messagesAnonymized: number | null;
}> {
    const nowIso = new Date().toISOString();
    let membershipsClosed: number | null = null;
    let messagesAnonymized: number | null = null;

    // Najpierw dostęp (pilne), potem nazwisko (kosmetyka RODO) — gdyby drugi krok padł,
    // odchodzący i tak nie czyta już ani kanału zespołu, ani własnych rozmów.
    const { count: leftCount, error: memberError } = await supabase
        .from('staff_conversation_members')
        .update({ left_at: nowIso }, { count: 'exact' })
        .eq('user_id', userId)
        .is('left_at', null);
    if (memberError) console.error('[Deactivate] staff_conversation_members left_at error:', memberError.message);
    else membershipsClosed = leftCount ?? 0;

    const { count: anonCount, error: messageError } = await supabase
        .from('staff_messages')
        .update({ sender_name_snapshot: '' }, { count: 'exact' })
        .eq('sender_user_id', userId);
    if (messageError) console.error('[Deactivate] staff_messages anonymize error:', messageError.message);
    else messagesAnonymized = anonCount ?? 0;

    return { membershipsClosed, messagesAnonymized };
}

/**
 * POST /api/admin/employees/deactivate
 * Deactivates (hides) an employee from the app.
 * Sets is_active=false in the employees table.
 * The employee will no longer appear in:
 *   - Task assignment dropdowns
 *   - Push notification recipients
 *   - Staff listings
 * They remain in Prodentis (external system) — no data is deleted.
 *
 * Offboarding czatu wewnętrznego (mig 183, D6) robi krok 5: zamknięcie członkostw
 * (`left_at`) i anonimizacja nazwiska w wiadomościach. Same ROZMOWY zostają — u drugiej
 * strony historia ustaleń jest nietknięta. Szczegóły i uzasadnienie: `offboardStaffChat`.
 *
 * Body: { id?: string, email?: string }  — at least one required
 */
export async function POST(request: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    try {
        const { id, email } = await request.json();

        if (!id && !email) {
            return NextResponse.json({ error: 'id or email is required' }, { status: 400, headers: NO_STORE });
        }

        // 1. Find the employee
        let query = supabase.from('employees').select('*');
        if (id) {
            query = query.eq('id', id);
        } else {
            query = query.eq('email', email);
        }
        const { data: employee } = await query.single();

        if (!employee) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404, headers: NO_STORE });
        }

        // 2. Set is_active = false
        await supabase.from('employees')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', employee.id);

        // 3. Odbierz rolę 'employee' — po user_id (pewny klucz) oraz po e-mailu
        //    (wiersze sprzed ujednolicenia kont mogą mieć inny adres niż employees.email).
        if (employee.user_id) {
            await supabase.from('user_roles')
                .delete()
                .eq('user_id', employee.user_id)
                .eq('role', 'employee');
        }
        if (employee.email) {
            await supabase.from('user_roles')
                .delete()
                .eq('email', employee.email)
                .eq('role', 'employee');
        }

        // 3b. Rola 'admin' — ODBIERAMY JĄ TEŻ. To świadome rozstrzygnięcie, nie przeoczenie:
        //     samo odebranie roli 'employee' nie zamyka drzwi osobie, która ma także 'admin'.
        //     `requireEmployeeOrAdmin` wpuszcza ją dalej do tras personelu (czyta kanał zespołu
        //     i własne rozmowy), a panel admina daje jej kartoteki pacjentów — czyli offboarding
        //     byłby pozorny dokładnie dla najbardziej uprzywilejowanego konta.
        //     Dwa zastrzeżenia:
        //      · NIGDY sobie samemu. Admin dezaktywujący własną kartotekę wyleciałby z panelu
        //        w trakcie operacji, a `PATCH` przywraca wyłącznie 'employee'. To zastrzeżenie
        //        gwarantuje przy okazji, że w systemie ZAWSZE zostaje co najmniej jeden admin:
        //        wołający ma tę rolę (requireAdmin), a dezaktywacja cudzej kartoteki jego
        //        wiersza nie rusza.
        //      · wyłącznie po `user_id`. `getUserRoles` — jedyne źródło ról dla uwierzytelnienia
        //        — czyta po `user_id`, więc wiersz kluczowany samym e-mailem i tak niczego nie
        //        nadaje; kasowanie po e-mailu (jak wyżej dla 'employee') mogłoby natomiast
        //        trafić w INNE konto o tym samym adresie, w tym w konto wołającego.
        const isSelfDeactivation = Boolean(employee.user_id) && employee.user_id === user.id;
        let adminRoleRevoked = false;
        if (employee.user_id && !isSelfDeactivation) {
            const { count: adminRoleCount, error: adminRoleError } = await supabase.from('user_roles')
                .delete({ count: 'exact' })
                .eq('user_id', employee.user_id)
                .eq('role', 'admin');
            if (adminRoleError) console.error('[Deactivate] user_roles admin delete error:', adminRoleError.message);
            else adminRoleRevoked = (adminRoleCount ?? 0) > 0;
        }

        // 4. Odetnij kanały powiadomień (web-push + apka mobilna)
        if (employee.user_id) {
            await revokePushTokens(employee.user_id);
        }

        // 5. Czat wewnętrzny zespołu: zamknij członkostwa i zanonimizuj nazwisko (D6).
        //    Świadomie NIEBLOKUJĄCE — sprzątanie czatu nie może wywrócić dezaktywacji, która
        //    w tym punkcie jest już wykonana (is_active=false, role odebrane, tokeny push kasowane).
        let chatOffboarding: { membershipsClosed: number | null; messagesAnonymized: number | null } =
            { membershipsClosed: null, messagesAnonymized: null };
        if (employee.user_id) {
            try {
                chatOffboarding = await offboardStaffChat(employee.user_id);
            } catch (chatError) {
                console.error('[Deactivate] staff chat offboarding failed:', chatError);
            }
        }

        await logAudit({
            userId: user.id,
            userEmail: user.email || '',
            action: 'deactivate_employee',
            resourceType: 'employees',
            resourceId: String(employee.id),
            metadata: {
                employeeUserId: employee.user_id || null,
                pushTokensRevoked: Boolean(employee.user_id),
                adminRoleRevoked,
                // Wyróżnione osobno: „false" przy dezaktywacji samego siebie znaczy
                // „świadomie pominięte", a nie „ta osoba nie miała roli admina".
                adminRoleSkippedSelfDeactivation: isSelfDeactivation,
                chatMembershipsClosed: chatOffboarding.membershipsClosed,
                chatMessagesAnonymized: chatOffboarding.messagesAnonymized,
            },
            request,
        });

        console.log(`[Deactivate] Employee ${employee.name || employee.email || employee.id} deactivated by ${user.email}`);

        return NextResponse.json({
            success: true,
            message: `Pracownik ${employee.name || employee.email} dezaktywowany`,
            adminRoleRevoked,
            chatMembershipsClosed: chatOffboarding.membershipsClosed,
            chatMessagesAnonymized: chatOffboarding.messagesAnonymized,
        }, { headers: NO_STORE });
    } catch (error) {
        console.error('[Deactivate] Error:', error);
        return NextResponse.json({ error: 'Nie udało się dezaktywować pracownika' }, { status: 500, headers: NO_STORE });
    }
}

/**
 * PATCH /api/admin/employees/deactivate
 * RE-ACTIVATE a previously deactivated employee.
 * Body: { id: string }
 *
 * Odwraca dokładnie tyle, ile odwrócić się DA:
 *   ✓ is_active, rola 'employee', członkostwa w czacie (`left_at` → NULL),
 *   ✗ rola 'admin' — świadomie NIE wraca. Najwyższe uprawnienia w systemie nadaje się
 *     ręcznie w Supabase (jak dotąd), a nie odklikaniem „reaktywuj" w panelu.
 *   ✗ anonimizacja nazwiska w wiadomościach — nieodwracalna z definicji: snapshot został
 *     nadpisany i nie ma z czego go odtworzyć. Nowe wiadomości znów niosą nazwisko.
 *   ✗ tokeny push — telefon nadaje nowy przy pierwszym uruchomieniu apki.
 */
export async function PATCH(request: NextRequest) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const user = auth.user;

    try {
        const { id } = await request.json();
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400, headers: NO_STORE });

        const { data: employee } = await supabase
            .from('employees').select('id, name, email, user_id')
            .eq('id', id)
            .single();

        if (!employee) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404, headers: NO_STORE });
        }

        await supabase.from('employees')
            .update({ is_active: true, updated_at: new Date().toISOString() })
            .eq('id', employee.id);

        // Przywróć rolę odebraną przy dezaktywacji — bez niej reaktywowany pracownik
        // przechodzi logowanie, ale każda trasa personelu odrzuca go (403), a w kodzie
        // nie ma innej ścieżki nadającej rolę 'employee' (nadawana ręcznie w Supabase).
        let roleRestored = false;
        if (employee.user_id && employee.email) {
            const { error: roleError } = await supabase.from('user_roles')
                .upsert({
                    user_id: employee.user_id,
                    email: employee.email,
                    role: 'employee',
                    granted_by: user.email || 'admin',
                }, { onConflict: 'user_id,role' });
            if (roleError) console.error('[Reactivate] user_roles upsert error:', roleError.message);
            else roleRestored = true;
        }

        // Otwórz z powrotem członkostwa w czacie wewnętrznym zamknięte przy dezaktywacji.
        // Bez tego reaktywowany pracownik ma rolę i konto, ale kanał zespołu jest dla niego
        // trwale zamknięty: `ensureMembership`/`syncGroupMembers` wstawiają z `ignoreDuplicates`,
        // więc NIE nadpisują istniejącego wiersza z `left_at`, a odczyt wątku wymaga
        // członkostwa aktywnego. Czyścimy WSZYSTKIE `left_at` tej osoby, bo dezaktywacja
        // (`offboardStaffChat`) jest w całym kodzie JEDYNYM miejscem, które to pole ustawia.
        // Gdyby kiedyś doszło „opuść wątek" wykonywane przez samego pracownika, musi dostać
        // własny znacznik — inaczej reaktywacja wciągnie go z powrotem do wątku, z którego wyszedł.
        let chatMembershipsReopened: number | null = null;
        if (employee.user_id) {
            const { count, error: memberError } = await supabase.from('staff_conversation_members')
                .update({ left_at: null }, { count: 'exact' })
                .eq('user_id', employee.user_id)
                .not('left_at', 'is', null);
            if (memberError) console.error('[Reactivate] staff_conversation_members reopen error:', memberError.message);
            else chatMembershipsReopened = count ?? 0;
        }

        await logAudit({
            userId: user.id,
            userEmail: user.email || '',
            action: 'reactivate_employee',
            resourceType: 'employees',
            resourceId: String(employee.id),
            metadata: { employeeUserId: employee.user_id || null, roleRestored, chatMembershipsReopened },
            request,
        });

        console.log(`[Reactivate] Employee ${id} reactivated by ${user.email} (role restored: ${roleRestored})`);
        return NextResponse.json({ success: true, roleRestored, chatMembershipsReopened }, { headers: NO_STORE });
    } catch (error) {
        console.error('[Reactivate] Error:', error);
        return NextResponse.json({ error: 'Nie udało się reaktywować pracownika' }, { status: 500, headers: NO_STORE });
    }
}
