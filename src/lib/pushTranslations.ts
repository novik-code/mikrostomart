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
    | 'order_status_update';

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
