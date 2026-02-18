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
    | 'new_blog_post'
    | 'order_status_update'
    | 'task_new'
    | 'task_status'
    | 'task_assigned'
    | 'task_comment'
    | 'task_checklist'
    | 'task_reminder';

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
