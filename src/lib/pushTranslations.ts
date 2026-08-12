/**
 * Server-side push notification translations for all 4 locales.
 * Used by webpush.ts to send localized push messages.
 * 
 * Params use {key} placeholders replaced at runtime.
 */

export type PushNotificationType =
    | 'chat_patient_to_admin'
    | 'chat_admin_to_patient'
    | 'appointment_24h'
    | 'appointment_1h'
    | 'appointment_confirmed'
    | 'appointment_cancelled'
    | 'appointment_rescheduled'
    | 'booking_confirmed'
    | 'booking_rejected'
    | 'new_blog_post'
    | 'order_status_update'
    | 'task_new'
    | 'task_status'
    | 'task_assigned'
    | 'task_comment'
    | 'task_checklist'
    | 'task_reminder'
    | 'patient_registered'
    | 'new_order'
    | 'new_reservation'
    | 'new_contact_message'
    | 'new_treatment_lead'
    | 'careflow_enrolled'
    | 'staff_chat_dm'
    | 'staff_chat_dm_generic'
    | 'staff_chat_channel';

interface PushTemplate {
    title: string;
    body: string;
}

const translations: Record<string, Record<PushNotificationType, PushTemplate>> = {
    pl: {
        chat_patient_to_admin: {
            title: '💬 Nowa wiadomość na czacie',
            body: 'Pacjent {name}: {message}',
        },
        chat_admin_to_patient: {
            title: '🏥 Nowa wiadomość od recepcji',
            body: '{message}',
        },
        appointment_24h: {
            title: '📅 Przypomnienie o wizycie — jutro',
            body: 'Wizyta jutro o {time} u {doctor}. {type}',
        },
        appointment_1h: {
            title: '⏰ Wizyta za godzinę!',
            body: 'Już niedługo Twoja wizyta o {time} u {doctor}.',
        },
        appointment_confirmed: {
            title: '✅ Pacjent potwierdził wizytę',
            body: '{patient} — {date}, {time} u {doctor}',
        },
        appointment_cancelled: {
            title: '❌ Pacjent odwołał wizytę',
            body: '{patient} — {date}, {time} u {doctor}',
        },
        appointment_rescheduled: {
            title: '📅 Prośba o przełożenie wizyty',
            body: '{patient} — {date}, {time}. Powód: {reason}',
        },
        new_blog_post: {
            title: '📰 Nowy artykuł na blogu',
            body: '{title}',
        },
        order_status_update: {
            title: '📦 Zmiana statusu zamówienia',
            body: 'Twoje zamówienie: {status}',
        },
        task_new: {
            title: '📋 Nowe zadanie',
            body: '{title} — utworzone przez {creator}',
        },
        task_status: {
            title: '🔄 Zmiana statusu zadania',
            body: '{title} → {status}',
        },
        careflow_enrolled: {
            title: 'Mikrostomart',
            body: 'Twój lekarz przygotował dla Ciebie plan opieki — otwórz aplikację.',
        },
        task_assigned: {
            title: '👤 Przypisano zadanie',
            body: '{title}',
        },
        task_comment: {
            title: '💬 Nowy komentarz',
            body: '{author}: {comment} (w: {title})',
        },
        task_checklist: {
            title: '✅ Checklist zaktualizowany',
            body: '{item} w zadaniu: {title}',
        },
        task_reminder: {
            title: '⚠️ Zadanie bez daty realizacji',
            body: '{title}',
        },
        patient_registered: {
            title: '👤 Nowy pacjent zarejestrowany',
            body: '{email} — oczekuje na weryfikację',
        },
        new_order: {
            title: '🛒 Nowe zamówienie',
            body: '{name} — {total} PLN',
        },
        new_reservation: {
            title: '📅 Nowa rezerwacja wizyty',
            body: '{name} — {specialist}, {date} {time}',
        },
        new_contact_message: {
            title: '📩 Nowa wiadomość kontaktowa',
            body: '{name}: {subject}',
        },
        new_treatment_lead: {
            title: '🧮 Kalkulator leczenia — nowy lead',
            body: '{name} — {service}',
        },
        booking_confirmed: {
            title: '✅ Twoja wizyta została potwierdzona!',
            body: '{specialist} — {date} o godz. {time}',
        },
        booking_rejected: {
            title: '❌ Rezerwacja nie mogła zostać potwierdzona',
            body: 'Prosimy o kontakt w celu ustalenia nowego terminu.',
        },
        staff_chat_dm: {
            title: '💬 {sender}',
            body: 'Nowa wiadomość — otwórz aplikację.',
        },
        staff_chat_dm_generic: {
            title: '💬 Nowa wiadomość',
            body: 'Wiadomość od współpracownika — otwórz aplikację.',
        },
        staff_chat_channel: {
            title: '📣 Kanał zespołu',
            body: 'Nowe ogłoszenie — otwórz aplikację.',
        },
    },
    en: {
        chat_patient_to_admin: {
            title: '💬 New chat message',
            body: 'Patient {name}: {message}',
        },
        chat_admin_to_patient: {
            title: '🏥 New message from reception',
            body: '{message}',
        },
        appointment_24h: {
            title: '📅 Appointment reminder — tomorrow',
            body: 'Your appointment tomorrow at {time} with {doctor}. {type}',
        },
        appointment_1h: {
            title: '⏰ Appointment in 1 hour!',
            body: 'Your appointment at {time} with {doctor} is coming up.',
        },
        appointment_confirmed: {
            title: '✅ Patient confirmed appointment',
            body: '{patient} — {date}, {time} with {doctor}',
        },
        appointment_cancelled: {
            title: '❌ Patient cancelled appointment',
            body: '{patient} — {date}, {time} with {doctor}',
        },
        appointment_rescheduled: {
            title: '📅 Reschedule request',
            body: '{patient} — {date}, {time}. Reason: {reason}',
        },
        new_blog_post: {
            title: '📰 New blog article',
            body: '{title}',
        },
        order_status_update: {
            title: '📦 Order status update',
            body: 'Your order: {status}',
        },
        task_new: {
            title: '📋 New task',
            body: '{title} — created by {creator}',
        },
        task_status: {
            title: '🔄 Task status change',
            body: '{title} → {status}',
        },
        careflow_enrolled: {
            title: 'Mikrostomart',
            body: 'Your dentist has prepared a care plan for you — open the app.',
        },
        task_assigned: {
            title: '👤 Task assigned to you',
            body: '{title}',
        },
        task_comment: {
            title: '💬 New comment',
            body: '{author}: {comment} (on: {title})',
        },
        task_checklist: {
            title: '✅ Checklist updated',
            body: '{item} in task: {title}',
        },
        task_reminder: {
            title: '⚠️ Task without due date',
            body: '{title}',
        },
        patient_registered: {
            title: '👤 New patient registered',
            body: '{email} — awaiting verification',
        },
        new_order: {
            title: '🛒 New order',
            body: '{name} — {total} PLN',
        },
        new_reservation: {
            title: '📅 New appointment reservation',
            body: '{name} — {specialist}, {date} {time}',
        },
        new_contact_message: {
            title: '📩 New contact message',
            body: '{name}: {subject}',
        },
        new_treatment_lead: {
            title: '🧮 Treatment calculator — new lead',
            body: '{name} — {service}',
        },
        booking_confirmed: {
            title: '✅ Your appointment has been confirmed!',
            body: '{specialist} — {date} at {time}',
        },
        booking_rejected: {
            title: '❌ Your booking could not be confirmed',
            body: 'Please contact us to schedule a new appointment.',
        },
        staff_chat_dm: {
            title: '💬 {sender}',
            body: 'New message — open the app.',
        },
        staff_chat_dm_generic: {
            title: '💬 New message',
            body: 'A message from a coworker — open the app.',
        },
        staff_chat_channel: {
            title: '📣 Team channel',
            body: 'New announcement — open the app.',
        },
    },
    de: {
        chat_patient_to_admin: {
            title: '💬 Neue Chat-Nachricht',
            body: 'Patient {name}: {message}',
        },
        chat_admin_to_patient: {
            title: '🏥 Neue Nachricht von der Rezeption',
            body: '{message}',
        },
        appointment_24h: {
            title: '📅 Termin-Erinnerung — morgen',
            body: 'Ihr Termin morgen um {time} bei {doctor}. {type}',
        },
        appointment_1h: {
            title: '⏰ Termin in 1 Stunde!',
            body: 'Ihr Termin um {time} bei {doctor} steht bevor.',
        },
        appointment_confirmed: {
            title: '✅ Patient hat den Termin bestätigt',
            body: '{patient} — {date}, {time} bei {doctor}',
        },
        appointment_cancelled: {
            title: '❌ Patient hat den Termin abgesagt',
            body: '{patient} — {date}, {time} bei {doctor}',
        },
        appointment_rescheduled: {
            title: '📅 Umbuchungsanfrage',
            body: '{patient} — {date}, {time}. Grund: {reason}',
        },
        new_blog_post: {
            title: '📰 Neuer Blog-Artikel',
            body: '{title}',
        },
        order_status_update: {
            title: '📦 Bestellstatus-Update',
            body: 'Ihre Bestellung: {status}',
        },
        task_new: {
            title: '📋 Neue Aufgabe',
            body: '{title} — erstellt von {creator}',
        },
        task_status: {
            title: '🔄 Aufgabenstatus geändert',
            body: '{title} → {status}',
        },
        careflow_enrolled: {
            title: 'Mikrostomart',
            body: 'Ihr Zahnarzt hat einen Behandlungsplan für Sie vorbereitet — öffnen Sie die App.',
        },
        task_assigned: {
            title: '👤 Aufgabe zugewiesen',
            body: '{title}',
        },
        task_comment: {
            title: '💬 Neuer Kommentar',
            body: '{author}: {comment} (in: {title})',
        },
        task_checklist: {
            title: '✅ Checkliste aktualisiert',
            body: '{item} in Aufgabe: {title}',
        },
        task_reminder: {
            title: '⚠️ Aufgabe ohne Fälligkeitsdatum',
            body: '{title}',
        },
        patient_registered: {
            title: '👤 Neuer Patient registriert',
            body: '{email} — wartet auf Verifizierung',
        },
        new_order: {
            title: '🛒 Neue Bestellung',
            body: '{name} — {total} PLN',
        },
        new_reservation: {
            title: '📅 Neue Terminreservierung',
            body: '{name} — {specialist}, {date} {time}',
        },
        new_contact_message: {
            title: '📩 Neue Kontaktnachricht',
            body: '{name}: {subject}',
        },
        new_treatment_lead: {
            title: '🧮 Behandlungsrechner — neuer Lead',
            body: '{name} — {service}',
        },
        booking_confirmed: {
            title: '✅ Ihr Termin wurde bestätigt!',
            body: '{specialist} — {date} um {time}',
        },
        booking_rejected: {
            title: '❌ Ihre Buchung konnte nicht bestätigt werden',
            body: 'Bitte kontaktieren Sie uns, um einen neuen Termin zu vereinbaren.',
        },
        staff_chat_dm: {
            title: '💬 {sender}',
            body: 'Neue Nachricht — App öffnen.',
        },
        staff_chat_dm_generic: {
            title: '💬 Neue Nachricht',
            body: 'Nachricht aus dem Team — App öffnen.',
        },
        staff_chat_channel: {
            title: '📣 Teamkanal',
            body: 'Neue Ankündigung — App öffnen.',
        },
    },
    ua: {
        chat_patient_to_admin: {
            title: '💬 Нове повідомлення в чаті',
            body: 'Пацієнт {name}: {message}',
        },
        chat_admin_to_patient: {
            title: '🏥 Нове повідомлення від реєстрації',
            body: '{message}',
        },
        appointment_24h: {
            title: '📅 Нагадування про візит — завтра',
            body: 'Ваш візит завтра о {time} у {doctor}. {type}',
        },
        appointment_1h: {
            title: '⏰ Візит через годину!',
            body: 'Ваш візит о {time} у {doctor} вже скоро.',
        },
        appointment_confirmed: {
            title: '✅ Пацієнт підтвердив візит',
            body: '{patient} — {date}, {time} у {doctor}',
        },
        appointment_cancelled: {
            title: '❌ Пацієнт скасував візит',
            body: '{patient} — {date}, {time} у {doctor}',
        },
        appointment_rescheduled: {
            title: '📅 Запит на перенесення',
            body: '{patient} — {date}, {time}. Причина: {reason}',
        },
        new_blog_post: {
            title: '📰 Нова стаття в блозі',
            body: '{title}',
        },
        order_status_update: {
            title: '📦 Оновлення статусу замовлення',
            body: 'Ваше замовлення: {status}',
        },
        task_new: {
            title: '📋 Нове завдання',
            body: '{title} — створено {creator}',
        },
        task_status: {
            title: '🔄 Зміна статусу завдання',
            body: '{title} → {status}',
        },
        careflow_enrolled: {
            title: 'Mikrostomart',
            body: 'Ваш лікар підготував для вас план догляду — відкрийте застосунок.',
        },
        task_assigned: {
            title: '👤 Призначене завдання',
            body: '{title}',
        },
        task_comment: {
            title: '💬 Новий коментар',
            body: '{author}: {comment} (до: {title})',
        },
        task_checklist: {
            title: '✅ Чекліст оновлено',
            body: '{item} у завданні: {title}',
        },
        task_reminder: {
            title: '⚠️ Завдання без дати',
            body: '{title}',
        },
        patient_registered: {
            title: '👤 Новий пацієнт зареєстрований',
            body: '{email} — очікує верифікації',
        },
        new_order: {
            title: '🛒 Нове замовлення',
            body: '{name} — {total} PLN',
        },
        new_reservation: {
            title: '📅 Нова резервація візиту',
            body: '{name} — {specialist}, {date} {time}',
        },
        new_contact_message: {
            title: '📩 Нове контактне повідомлення',
            body: '{name}: {subject}',
        },
        new_treatment_lead: {
            title: '🧮 Калькулятор лікування — новий лід',
            body: '{name} — {service}',
        },
        booking_confirmed: {
            title: '✅ Ваш візит підтверджено!',
            body: '{specialist} — {date} о {time}',
        },
        booking_rejected: {
            title: '❌ Бронювання не було підтверджено',
            body: 'Будь ласка, зверніться до нас для запису на новий термін.',
        },
        staff_chat_dm: {
            title: '💬 {sender}',
            body: 'Нове повідомлення — відкрийте застосунок.',
        },
        staff_chat_dm_generic: {
            title: '💬 Нове повідомлення',
            body: 'Повідомлення від колеги — відкрийте застосунок.',
        },
        staff_chat_channel: {
            title: '📣 Канал команди',
            body: 'Нове оголошення — відкрийте застосунок.',
        },
    },
};

/**
 * Get translated push notification title and body, with param substitution.
 */
export function getPushTranslation(
    type: PushNotificationType,
    locale: string,
    params: Record<string, string> = {}
): PushTemplate {
    const localeTemplates = translations[locale] || translations.pl;
    const template = localeTemplates[type];

    let title = template.title;
    let body = template.body;

    for (const [key, value] of Object.entries(params)) {
        title = title.replace(`{${key}}`, value);
        body = body.replace(`{${key}}`, value);
    }

    return { title, body };
}

// ─── Czat wewnętrzny personelu ───────────────────────────────

/**
 * TREŚĆ WIADOMOŚCI NIGDY NIE TRAFIA DO POWIADOMIENIA — ani do tytułu, ani do body.
 *
 * Powód: wiadomość może zawierać wzmiankę o pacjencie (hashtag `#`) albo ustalenia
 * kliniczne. Push wisi na ZABLOKOWANYM ekranie (widzi go każdy, kto ma telefon w ręku)
 * i dodatkowo ląduje w `push_notifications_log`, który personel czyta w Alertach bez
 * filtra po odbiorcy. Jedno i drugie dyskwalifikuje przenoszenie treści (RODO art. 9,
 * a dla DM także D5 — admin nie ma wglądu w rozmowy prywatne).
 *
 * IMIĘ NADAWCY w tytule DM jest świadomym wyjątkiem: to komunikacja wewnętrzna między
 * pracownikami, nazwisko współpracownika nie jest daną wrażliwą i bez niego powiadomienie
 * („Nowa wiadomość") jest bezużyteczne — nie wiadomo, czy warto odblokowywać telefon.
 * Kanał grupowy nazwiska NIE pokazuje: push wychodzi tam wyłącznie od admina (D1),
 * więc nadawca i tak jest jednoznaczny.
 */
export type StaffChatPushType = 'dm' | 'channel';

/** Nazwisko na ekranie blokady musi się zmieścić — iOS ucina tytuł ok. 40 znaków. */
const SENDER_MAX = 40;

/** Locale apki personelu to `uk` (ISO), tabela tłumaczeń trzyma klucz `ua`. */
function normalizeLocale(locale: string): string {
    return locale === 'uk' ? 'ua' : locale;
}

/**
 * Treść pusha czatu wewnętrznego. `senderName` to snapshot nadawcy
 * (`staff_messages.sender_name_snapshot`) — po anonimizacji odchodzącego pracownika (D6)
 * bywa pusty, wtedy schodzimy na wariant bez imienia zamiast wysyłać goły placeholder.
 */
export function getStaffChatPush(
    type: StaffChatPushType,
    locale: string,
    senderName?: string | null
): PushTemplate {
    const loc = normalizeLocale(locale);
    if (type === 'channel') return getPushTranslation('staff_chat_channel', loc);

    const sender = (senderName ?? '')
        .replace(/\s+/g, ' ')   // nowa linia w nazwisku rozbiłaby układ powiadomienia
        .trim()
        .slice(0, SENDER_MAX)
        .trim();

    return sender
        ? getPushTranslation('staff_chat_dm', loc, { sender })
        : getPushTranslation('staff_chat_dm_generic', loc);
}

// ─── Neutralizacja treści dla powiadomień do PERSONELU ──────────────────────

/**
 * Typy powiadomień, których odbiorcą jest PERSONEL, a treść niesie tożsamość
 * pacjenta albo wolny tekst.
 *
 * 🔑 Ustalone WYWOŁUJĄCYMI, nie nazwą typu: każdy z nich wychodzi wyłącznie przez
 * `broadcastPush('admin'|'employee', …)`. Typy pacjenta (`appointment_24h`,
 * `chat_admin_to_patient`, `booking_*`, `order_status_update`, `careflow_enrolled`,
 * `new_blog_post`) świadomie NIE są tu wymienione — to dane pacjenta na JEGO WŁASNYM
 * telefonie i zabranie mu ich zamienia powiadomienie w zagadkę.
 */
const STAFF_FACING_TYPES: ReadonlySet<PushNotificationType> = new Set([
    'chat_patient_to_admin',
    'appointment_confirmed',
    'appointment_cancelled',
    'appointment_rescheduled',
    'patient_registered',
    'new_order',
    'new_reservation',
    'new_contact_message',
    'new_treatment_lead',
    'task_new',
    'task_status',
    'task_assigned',
    'task_comment',
    'task_checklist',
    'task_reminder',
]);

/** Zamiennik treści — jeden na locale, żeby warianty się nie rozjechały. */
const NEUTRAL_BODY: Record<string, string> = {
    pl: 'Otwórz, aby zobaczyć szczegóły.',
    en: 'Open to see the details.',
    de: 'Öffnen, um die Details zu sehen.',
    ua: 'Відкрийте, щоб побачити деталі.',
};

/**
 * Treść zastępcza na ekran blokady — albo `null`, gdy typ nie wymaga neutralizacji.
 *
 * 🔑 NEUTRALIZUJEMY WYŁĄCZNIE TREŚĆ, NIE TYTUŁ. Zmierzone: wszystkie 15 tytułów
 * personelu jest już neutralnych („💬 Nowa wiadomość na czacie", „❌ Pacjent odwołał
 * wizytę") — mówią CO się stało, bez KTO. Recepcja zachowuje więc pełną wartość
 * segregacyjną baneru, a znika samo nazwisko i wolny tekst. To znacząco tańszy
 * kompromis, niż zakładała decyzja („recepcja straci szczegół w banerze").
 *
 * ⚠️ Czego to NIE naprawia: `sendToTokens` (web-push FCM) buduje wiadomość z sześciu
 * pól i **nie czyta `payload.data`**, więc recepcja w przeglądarce nie ma jak dostać
 * szczegółu po kliknięciu — musi otworzyć panel. To nieusuwalny koszt, przyjęty
 * świadomie przy decyzji o neutralizacji.
 */
export function getNeutralPushBody(type: PushNotificationType, locale: string): string | null {
    if (!STAFF_FACING_TYPES.has(type)) return null;
    return NEUTRAL_BODY[normalizeLocale(locale)] ?? NEUTRAL_BODY.pl;
}
