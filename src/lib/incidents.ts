/**
 * Awarie — warstwa wspólna tras `/api/employee/incidents/*` (migracja 187).
 *
 * Zdjęcia usterek leżą w PRYWATNYM buckecie `incident-photos`; bajty opuszczają
 * serwer wyłącznie jako signed URL o krótkim TTL, wybity przez trasę, która
 * zostawia ślad w audycie. Prymitywy przetwarzania obrazu (`detectImageMime`,
 * `normalizeImage`, `readUploadedFile`) reużywamy z `chatAttachments` — są
 * niezależne od bucketa, a przepisywanie ich drugi raz oznaczałoby powtórzenie
 * czterech pułapek opisanych tam w komentarzach (magic bytes przed dekoderem,
 * `.rotate()` jako pierwsze, `.flatten()` na biało, jawny limit pikseli).
 */

import { createClient } from '@supabase/supabase-js';
import { normalizeImage } from './chatAttachments';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

export const INCIDENT_BUCKET = 'incident-photos';
export const MAX_PHOTOS_PER_INCIDENT = 4;
export const SIGNED_URL_TTL_SECONDS = 300;

export type IncidentSeverity = 'minor' | 'hinders' | 'blocking';
export type IncidentStatus = 'reported' | 'in_progress' | 'resolved';

export const SEVERITIES: IncidentSeverity[] = ['minor', 'hinders', 'blocking'];
export const STATUSES: IncidentStatus[] = ['reported', 'in_progress', 'resolved'];

/** Etykiety do treści powiadomień (serwer nie zna języka odbiorcy — push jest po polsku). */
export const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
    minor: 'Drobiazg',
    hinders: 'Utrudnia pracę',
    blocking: 'Blokuje gabinet',
};

export interface IncidentRow {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    severity: IncidentSeverity;
    status: IncidentStatus;
    photo_paths: string[];
    reported_by: string;
    reporter_name: string;
    taken_by: string | null;
    taken_name: string | null;
    taken_at: string | null;
    resolved_by: string | null;
    resolver_name: string | null;
    resolved_at: string | null;
    resolution_note: string | null;
    linked_task_id: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Nazwa pracownika do migawki. `user_roles` bywa bez `display_name`, a wtedy
 * e-mail jest lepszy niż puste pole — historia usterki bez autora jest bezwartościowa.
 */
export async function resolveStaffName(userId: string, email: string | null): Promise<string> {
    try {
        const { data } = await supabase
            .from('employees')
            .select('name')
            .eq('user_id', userId)
            .maybeSingle();
        if (data?.name) return String(data.name);
    } catch {
        /* nieistotne — schodzimy na e-mail */
    }
    return email || 'Pracownik';
}

/** Ścieżka w buckecie: katalog per awaria, nazwa losowa (nie z nazwy pliku użytkownika). */
export function buildPhotoPath(incidentIdOrDraft: string): string {
    const rand = Math.random().toString(36).slice(2, 10);
    return `${incidentIdOrDraft}/${Date.now()}-${rand}.jpg`;
}

/**
 * Zapis zdjęcia. Zwraca ścieżkę albo `null`, gdy plik nie jest obrazem
 * albo nie da się go zdekodować (HEIC, uszkodzony, ponad limit pikseli).
 */
export async function storeIncidentPhoto(
    buf: Buffer,
    ownerKey: string
): Promise<{ path: string; width: number; height: number } | null> {
    const normalized = await normalizeImage(buf);
    if (!normalized) return null;

    const path = buildPhotoPath(ownerKey);
    const { error } = await supabase.storage
        .from(INCIDENT_BUCKET)
        .upload(path, normalized.full, { contentType: 'image/jpeg', upsert: false });
    if (error) {
        console.error('[incidents] upload nieudany:', error.message);
        return null;
    }
    return { path, width: normalized.width, height: normalized.height };
}

/** Signed URL o krótkim TTL. Nigdy nie budujemy go w liście — tylko na żądanie. */
export async function signIncidentPhoto(path: string): Promise<string | null> {
    const { data, error } = await supabase.storage
        .from(INCIDENT_BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error || !data?.signedUrl) {
        console.error('[incidents] podpisanie nieudane:', error);
        return null;
    }
    return data.signedUrl;
}

export async function removeIncidentPhotos(paths: string[]): Promise<void> {
    if (!paths.length) return;
    const { error } = await supabase.storage.from(INCIDENT_BUCKET).remove(paths);
    if (error) console.error('[incidents] kasowanie plików nieudane:', error.message);
}

/**
 * Czy ta ścieżka należy do JAKIEJKOLWIEK awarii.
 *
 * 🔑 Bez tej kontroli trasa podpisująca stałaby się generatorem signed URL-i do
 * dowolnego obiektu w buckecie na podstawie stringa od klienta. Sprawdzamy
 * przynależność w bazie, nie ufamy kształtowi ścieżki.
 */
export async function photoBelongsToIncident(path: string): Promise<string | null> {
    const { data } = await supabase
        .from('incidents')
        .select('id')
        .contains('photo_paths', [path])
        .maybeSingle();
    return data?.id ?? null;
}
