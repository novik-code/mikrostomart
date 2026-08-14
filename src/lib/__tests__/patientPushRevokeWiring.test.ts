import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { revokePatientPushTokens } from '../patientPushRevoke';

/**
 * Strażnik okablowania: KAŻDA trasa, która unieważnia sesję pacjenta
 * (`sessions_valid_from`), musi też zdjąć tokeny push.
 *
 * Po co osobny test: rewokacja sesji i sprzątanie pusha to DWA różne kroki w tym samym
 * scenariuszu (przejęcie konta). Trasa, która zrobi tylko pierwszy, wygląda na poprawną —
 * pacjent zostaje wylogowany — a urządzenie napastnika nadal dostaje powiadomienia
 * o wizytach z deep-linkiem. Ta klasa błędu wracała w tym projekcie trzykrotnie przy
 * pushu, zawsze przez pominięcie JEDNEGO z kilku wywołujących.
 *
 * 🔑 Strażnik ma WYKONYWAĆ, nie tylko grepować — stąd druga część: helper jest
 * uruchamiany na atrapie klienta i sprawdzamy REALNE zapytania, nie obecność słów.
 */

const API_DIR = join(process.cwd(), 'src/app/api');

function allRouteFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...allRouteFiles(full));
    else if (entry === 'route.ts') out.push(full);
  }
  return out;
}

describe('okablowanie: rewokacja sesji pacjenta zdejmuje tokeny push', () => {
  const routes = allRouteFiles(API_DIR);

  it('znajduje trasy rewokujące sesję (kontrola pozytywna — inaczej test niczego nie sprawdza)', () => {
    const revoking = routes.filter((f) =>
      /sessions_valid_from:\s*new Date\(\)/.test(readFileSync(f, 'utf8')),
    );
    // Dziś są trzy: change-password, reset-password/confirm, delete-account.
    expect(revoking.length).toBeGreaterThanOrEqual(3);
  });

  it('każda taka trasa woła revokePatientPushTokens', () => {
    const missing: string[] = [];
    for (const f of routes) {
      const src = readFileSync(f, 'utf8');
      if (!/sessions_valid_from:\s*new Date\(\)/.test(src)) continue;
      if (!/await\s+revokePatientPushTokens\(/.test(src)) missing.push(f.replace(process.cwd(), ''));
    }
    expect(missing).toEqual([]);
  });
});

describe('zachowanie helpera (nie sam tekst)', () => {
  type Call = { table: string; filters: Record<string, unknown> };

  function fakeSupabase(calls: Call[]) {
    return {
      from(table: string) {
        const filters: Record<string, unknown> = {};
        const chain = {
          delete: () => chain,
          eq(col: string, val: unknown) {
            filters[col] = val;
            return chain;
          },
          then(resolve: (v: { error: null }) => void) {
            calls.push({ table, filters });
            resolve({ error: null });
          },
        };
        return chain;
      },
    } as never;
  }

  it('kasuje po PRODENTIS id w patient_push_tokens i po UUID w fcm_tokens', async () => {
    const calls: Call[] = [];
    await revokePatientPushTokens(fakeSupabase(calls), { prodentisId: '0100001711', userId: 'uuid-1' }, 'T');

    const expo = calls.find((c) => c.table === 'patient_push_tokens');
    const fcm = calls.find((c) => c.table === 'fcm_tokens');
    expect(expo?.filters).toEqual({ patient_id: '0100001711' });
    expect(fcm?.filters).toEqual({ user_id: 'uuid-1', user_type: 'patient' });
  });

  it('pomija tabelę, dla której nie ma klucza (zamiast kasować za szeroko)', async () => {
    const calls: Call[] = [];
    await revokePatientPushTokens(fakeSupabase(calls), { prodentisId: null, userId: 'uuid-1' }, 'T');
    expect(calls.map((c) => c.table)).toEqual(['fcm_tokens']);

    const calls2: Call[] = [];
    await revokePatientPushTokens(fakeSupabase(calls2), { prodentisId: '01', userId: null }, 'T');
    expect(calls2.map((c) => c.table)).toEqual(['patient_push_tokens']);
  });

  it('błąd bazy NIE wywraca ścieżki zmiany hasła (nieblokujące sprzątanie)', async () => {
    const throwing = {
      from() {
        throw new Error('db down');
      },
    } as never;
    await expect(
      revokePatientPushTokens(throwing, { prodentisId: '01', userId: 'u' }, 'T'),
    ).resolves.toBeUndefined();
  });
});
