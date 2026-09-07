/**
 * BRAMKA KLINICZNA LISTY LEKÓW — jedna definicja na trzy trasy (P-097).
 *
 * 🔴 PO CO. Kroki protokołu wskazują lek po POZYCJI na liście (`medication_index`).
 * Usunięcie albo skrócenie listy podmienia lek pod krokiem: krok „Weź antybiotyk"
 * dostaje ibuprofen. Ta lista jest pokazywana pacjentowi, drukowana w PDF planu opieki,
 * a przy przełożeniu wizyty `careflowLifecycle` używa jej POZYCYJNIE do wstawienia
 * nowych zadań. To jest bramka kliniczna, nie walidacja formularza.
 *
 * 🪤 DLACZEGO TEN PLIK ISTNIEJE. Ta sama funkcja żyła w DWÓCH kopiach — w `enroll`
 * i w `accept` — a `PUT /enrollments/[id]`, który zapisuje dokładnie to samo pole,
 * nie miał jej wcale. Trzecia kopia byłaby trzecim miejscem do poprawienia przy
 * następnej korekcie; stąd jedno źródło.
 */

export type CareStepRow = { medication_index?: number | null };

/**
 * Zwraca komunikat błędu albo `null`, gdy lista jest spójna z krokami.
 * Treść jest instruktażowa i idzie WPROST do personelu — apka pokazuje ją dosłownie
 * przy kodzie `medication_list_mismatch` (`(staff)/careflow/[id].tsx`).
 */
export function validateMedicationIndexes(params: {
    steps: CareStepRow[];
    templateMedications: unknown;
    overrideMedications: unknown;
}): string | null {
    const indexes = (params.steps ?? [])
        .map((s) => s.medication_index)
        .filter((i): i is number => i !== null && i !== undefined);

    const templateMeds = Array.isArray(params.templateMedications) ? params.templateMedications : [];
    const hasOverride = params.overrideMedications !== undefined && params.overrideMedications !== null;
    if (hasOverride && !Array.isArray(params.overrideMedications)) {
        return 'Nieprawidłowa lista leków — oczekiwano listy pozycji.';
    }
    const override = hasOverride ? (params.overrideMedications as unknown[]) : null;

    if (override && indexes.length > 0 && override.length !== templateMeds.length) {
        return `Lista leków musi mieć dokładnie tyle pozycji, ile ma protokół (${templateMeds.length}), a ma ${override.length}. Kroki wskazują lek po POZYCJI na liście, więc usunięcie pozycji podmienia lek pod krokiem (np. krok „Weź antybiotyk" dostałby ibuprofen). Leki wolno podmieniać tylko na tej samej pozycji — jeśli pacjent ma danego leku nie brać, usuń odpowiadający mu krok protokołu.`;
    }

    const effective = override ?? templateMeds;
    const outOfRange = indexes.find((i) => !Number.isInteger(i) || i < 0 || i >= effective.length);
    if (outOfRange !== undefined) {
        return `Krok protokołu wskazuje lek na pozycji ${outOfRange + 1}, a lista leków ma ${effective.length} poz. Uzupełnij listę leków albo popraw protokół.`;
    }

    return null;
}

/** Ile znaków tolerujemy w polach tekstowych zapisu — zapora przed zapchaniem wiersza. */
export const MAX_DL_POLA_TEKSTOWEGO = 200;

/** Czy wartość nadaje się na pole tekstowe zapisu (nazwisko, telefon). */
export function poprawnePoleTekstowe(v: unknown): boolean {
    return v === null || (typeof v === 'string' && v.length <= MAX_DL_POLA_TEKSTOWEGO);
}
