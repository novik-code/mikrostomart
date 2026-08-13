/**
 * Wykluczanie odbiorców z wysyłki grupowej.
 *
 * 🔴 STAWKA (zmierzone 2026-08-12): `task-new` jest włączone dla WSZYSTKICH grup, więc
 * osoba przypisana do zadania siedzi jednocześnie w ogłoszeniu zespołowym i w wersji
 * imiennej — a oba pushe mają różne `tag`, więc na telefonie NIE zwijają się w jeden.
 * Dwa banery o tym samym zadaniu, przy każdym utworzeniu i każdej zmianie przypisania.
 *
 * Pomyłka w tej regule jest niewidoczna: ludzie dostają o jedno powiadomienie za dużo
 * albo za mało i nikt tego nie zgłasza. Dlatego test wykonania, nie asercja na treści.
 */
import { describe, it, expect } from 'vitest';
import { zbiorWykluczonych } from '@/lib/pushRecipients';

describe('zbiorWykluczonych', () => {
    it('brak argumentu → nie pomijamy NIKOGO', () => {
        expect(zbiorWykluczonych().size).toBe(0);
        expect(zbiorWykluczonych(undefined).size).toBe(0);
    });

    it('pusta lista → też nikogo (a nie „wszystkich")', () => {
        // Zadanie bez przypisanych: ogłoszenie zespołowe ma dojść do całego zespołu.
        expect(zbiorWykluczonych([]).size).toBe(0);
    });

    it('jedna osoba jako string', () => {
        const z = zbiorWykluczonych('user-1');
        expect(z.has('user-1')).toBe(true);
        expect(z.size).toBe(1);
    });

    it('lista przypisanych — każdy pomijany', () => {
        const z = zbiorWykluczonych(['user-1', 'user-2']);
        expect([...z].sort()).toEqual(['user-1', 'user-2']);
    });

    it('puste i białe wpisy nie tworzą fantomowego wykluczenia', () => {
        // `assigneeUserIds` potrafi oddać pusty string dla pracownika bez konta
        // (`emp-<id>`); pusty identyfikator nie może przypadkiem nikogo wyciszyć.
        expect(zbiorWykluczonych(['', '   ', 'user-1']).size).toBe(1);
    });
});

/**
 * Strażnik okablowania — sama reguła nie wystarczy, musi być WOŁANA w obu miejscach.
 * Zmierzone 2026-08-12: podwójny baner powstawał przy tworzeniu zadania ORAZ przy
 * zmianie przypisania. Naprawa jednego z nich zostawiłaby połowę problemu
 * („jedna naprawa nie wystarczy — policz wszystkich wywołujących").
 */
describe('Strażnik: ogłoszenie grupowe pomija przypisanych', () => {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

    it('obie trasy zadań przekazują listę wykluczonych do wysyłki grupowej', () => {
        const post = read('src/app/api/employee/tasks/route.ts');
        expect(post, 'POST nie wyklucza przypisanych z ogłoszenia zespołowego')
            .toMatch(/tag:\s*`task-new-\$\{data\.id\}`,[\s\S]{0,400}?assigneeUserIds\(task\.assigned_to\)/);

        const patch = read('src/app/api/employee/tasks/[id]/route.ts');
        expect(patch, 'PATCH nie wyklucza nowo przypisanych')
            .toMatch(/tag:\s*`task-assign-\$\{id\}`,[\s\S]{0,200}?nowoPrzypisani/);
        expect(patch, 'brak wyliczenia nowo przypisanych').toContain('const nowoPrzypisani');
    });

    it('pushByConfig faktycznie używa reguły, a nie własnej kopii', () => {
        const svc = read('src/lib/pushService.ts');
        expect(svc).toContain('zbiorWykluczonych');
        expect(svc, 'wrócił stary filtr po jednym userze').not.toMatch(/excludeUserId && u\.user_id === excludeUserId/);
    });
});
