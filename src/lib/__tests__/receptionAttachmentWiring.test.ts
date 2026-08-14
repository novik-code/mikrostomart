/**
 * Strażnik toru „recepcja odsyła plik pacjentowi".
 *
 * 🔴 CZEGO PILNUJE. Ta trasa wkłada plik do WĄTKU PACJENTA w imieniu kliniki. Trzy rzeczy
 * muszą być prawdziwe naraz, a żadna nie wywala się głośno, gdy zniknie:
 *   • plik doczepiany do wiadomości RECEPCJI — inaczej w wątku wygląda, jakby przysłał go
 *     pacjent (a przy `is_health_data` decyduje to o audycie i eksporcie art. 15),
 *   • wątki GOŚCI odsiane — gość jest uwierzytelniony samym `guest_token`, więc nie wiadomo,
 *     do kogo plik trafia,
 *   • para `origin`/`uploaded_by_*` zgodna z CHECK-iem bazy.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
    path.join(process.cwd(), 'src/app/api/admin/chat/attachment/route.ts'),
    'utf8',
);

describe('Strażnik: załącznik od recepcji w czacie pacjenta', () => {
    it('plik trafia tylko do wiadomości RECEPCJI', () => {
        // Bez tego warunku recepcja doczepiłaby plik do wiadomości pacjenta i w wątku
        // wyglądałoby to na jego własne zdjęcie.
        expect(src).toMatch(/sender_role\s*!==\s*'reception'/);
    });

    it('🔒 wątki gościa są odsiewane', () => {
        expect(src, 'zniknął filtr na wątki anonimowe').toMatch(/conv\.is_anonymous/);
        expect(src, 'brak wymogu, żeby wątek miał pacjenta').toMatch(/!conv\.patient_id/);
    });

    it('🔒 para origin/uploaded_by zgodna z CHECK-iem bazy', () => {
        // `chat_att_origin_shape_check`: origin='staff' wymaga uploaded_by_user_id
        // i ZAKAZUJE uploaded_by_patient_id.
        expect(src).toMatch(/origin:\s*'staff'/);
        expect(src).toMatch(/uploaded_by_user_id:\s*user\.id/);
        expect(src, 'tor recepcji nie może podawać id pacjenta').not.toMatch(/uploaded_by_patient_id/);
    });

    it('🪤 nieudany zapis sprząta plik z bucketa', () => {
        // Plik ląduje w Storage PRZED insertem. Bez tego zostaje osierocony na zawsze —
        // cron retencyjny takich nie zbiera (liczy je, ale nie kasuje).
        expect(src).toMatch(/insErr[\s\S]{0,300}?removeAttachmentFiles/);
    });

    it('🪤 wysłanie przez recepcję NIE oznacza wątku jako nieprzeczytanego przez recepcję', () => {
        // Odwrotnie niż w torze pacjenta, gdzie `unread_by_admin` jest sednem.
        // Tu recepcja właśnie wysłała plik — podnoszenie tej flagi byłoby kłamstwem.
        const update = src.match(/chat_conversations'\)[\s\S]{0,200}?\.update\(\{[\s\S]{0,200}?\}\)/);
        expect(update, 'zniknęło podbicie aktywności wątku').not.toBeNull();
        expect(update![0], 'wrócił unread_by_admin w torze recepcji').not.toMatch(/unread_by_admin/);
        expect(update![0], 'brak podbicia last_message_at').toMatch(/last_message_at/);
    });

    it('trasa jest za bramką personelu i na runtime nodejs', () => {
        expect(src).toContain('verifyAdmin');
        expect(src, 'brak sprawdzenia roli').toMatch(/hasRole\(user\.id, 'employee'\)/);
        // `sharp` to natywny libvips — na edge nie wystartuje.
        expect(src).toMatch(/runtime\s*=\s*'nodejs'/);
    });
});
