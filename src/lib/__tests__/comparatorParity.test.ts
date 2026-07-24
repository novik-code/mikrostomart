import { describe, expect, it } from 'vitest';

import { getComparatorData, WEIGHTS } from '@/app/[locale]/porownywarka/getComparatorData';

/**
 * Strażnik parytetu STRUKTURY SCORINGOWEJ porównywarki między locale.
 *
 * Endpoint GET /api/comparator przypina do PL inwarianty metod (metrics/scale/
 * recommendedSpecialist), ale komparatory i reguły gatingu serwuje z plików
 * locale. Silnik (web + fork w apce) liczy na: kolejności `methodIds`
 * (tie-break stabilnego sortu), kolejności i deltach reguł (clamp per-efekt)
 * oraz id pytań/opcji (dopasowanie warunków). Dryf którejkolwiek z tych
 * struktur w en/de/ua = ciche rozjechanie rankingu tego języka względem PL —
 * dokładnie ta klasa dryfu zaszła już w metrykach metod (scaling/sealant).
 * Ten test zamienia przyszły cichy fork w czerwony CI.
 */

type Fingerprint = {
  comparators: { id: string; methodIds: string[]; questions: { id: string; options: string[] }[] }[];
  gatingRules: { id: string; comparatorId: string; answers: [string, string][]; effects: { methodId: string; scoreDelta: number }[] }[];
  priorityIds: string[];
  methodIds: string[];
};

function fingerprint(locale: string): Fingerprint {
  const ds = getComparatorData(locale);
  return {
    comparators: ds.comparators.map((c) => ({
      id: c.id,
      methodIds: [...c.methodIds],
      questions: c.questions.map((q) => ({ id: q.id, options: q.options.map((o) => o.value) })),
    })),
    gatingRules: ds.gatingRules.map((r) => ({
      id: r.id,
      comparatorId: r.comparatorId,
      answers: Object.entries(r.answers),
      effects: r.effects.map((e) => ({ methodId: e.methodId, scoreDelta: e.scoreDelta })),
    })),
    priorityIds: ds.priorities.map((p) => p.id),
    // pełny zestaw id metod (sieroty wykryje osobna asercja poniżej)
    methodIds: Object.keys(ds.methods).sort(),
  };
}

describe('porownywarka — parytet struktury scoringowej między locale', () => {
  const pl = fingerprint('pl');

  it.each(['en', 'de', 'ua'])('%s ma identyczną strukturę scoringową co PL', (loc) => {
    const f = fingerprint(loc);
    expect(f.comparators).toEqual(pl.comparators);
    expect(f.gatingRules).toEqual(pl.gatingRules);
    expect(f.priorityIds).toEqual(pl.priorityIds);
  });

  it('PL: każdy methodId z komparatorów i gatingu istnieje w methods (zero wiszących referencji)', () => {
    const known = new Set(pl.methodIds);
    for (const c of pl.comparators) for (const id of c.methodIds) expect(known.has(id), `${c.id} → ${id}`).toBe(true);
    for (const r of pl.gatingRules) for (const e of r.effects) expect(known.has(e.methodId), `${r.id} → ${e.methodId}`).toBe(true);
  });

  it('PL: wagi priorytetów sumują się do 1.0 (kontrakt silnika)', () => {
    // dryf wag zmieniłby KAŻDY ranking — asercja na sumy wierszy
    for (const [id, w] of Object.entries(WEIGHTS)) {
      const sum = Object.values(w).reduce((a, b) => a + b, 0);
      expect(Math.abs(sum - 1), `priorytet ${id}: suma wag = ${sum}`).toBeLessThan(1e-9);
    }
  });
});
