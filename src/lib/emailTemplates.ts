/**
 * Centralized localized email templates for patient-facing emails.
 * 4 locales: pl, en, de, ua
 * 
 * Usage:
 *   const { subject, html } = getEmailTemplate('verification_email', 'en', { verificationUrl, year });
 */

import { demoSanitize } from '@/lib/brandConfig';

type EmailTemplateType = 'verification_email' | 'order_confirmation' | 'reservation_confirmation';

interface EmailTemplate {
    subject: string | ((params: Record<string, string>) => string);
    html: (params: Record<string, string>) => string;
}

const templates: Record<string, Record<EmailTemplateType, EmailTemplate>> = {
    pl: {
        verification_email: {
            subject: 'Potwierdź swój adres email - Strefa Pacjenta',
            html: (p) => `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #dcb14a, #f0c96c); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .header h1 { color: #000; margin: 0; font-size: 24px; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #dcb14a, #f0c96c); color: #000; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header"><h1>🦷 Mikrostomart</h1></div>
                        <div class="content">
                            <h2>Witaj!</h2>
                            <p>Dziękujemy za rejestrację w Strefie Pacjenta.</p>
                            <p>Aby dokończyć rejestrację, potwierdź swój adres email klikając poniższy przycisk:</p>
                            <div style="text-align: center;">
                                <a href="${p.verificationUrl}" class="button">Potwierdź email</a>
                            </div>
                            <p>Lub skopiuj i wklej ten link do przeglądarki:</p>
                            <p style="word-break: break-all; background: white; padding: 10px; border-radius: 5px;">${p.verificationUrl}</p>
                            <div class="warning">
                                <strong>⚠️ Ważne:</strong>
                                <ul>
                                    <li>Link jest ważny przez <strong>24 godziny</strong></li>
                                    <li>Po kliknięciu Twoje konto zostanie utworzone i przekazane do weryfikacji przez administratora</li>
                                    <li>Weryfikacja przez administratora potrwa do <strong>48 godzin</strong></li>
                                </ul>
                            </div>
                            <p>W razie pytań, skontaktuj się z nami:</p>
                            <p>📞 570 270 470<br>📧 gabinet@mikrostomart.pl</p>
                        </div>
                        <div class="footer">
                            <p>© ${p.year} Mikrostomart - Gabinet Stomatologiczny</p>
                            <p>ul. Centralna 15, 45-362 Opole</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
        },
        order_confirmation: {
            subject: (p) => `Potwierdzenie zamówienia - MIKROSTOMART`,
            html: (p) => `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #dcb14a;">Dziękujemy za zamówienie!</h1>
                    <p>Cześć ${p.firstName},</p>
                    <p>Twoje zamówienie zostało przyjęte i opłacone. Wkrótce przystąpimy do jego realizacji.</p>
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Podsumowanie:</h3>
                        <ul>${p.itemsHtml}</ul>
                        <p style="font-size: 1.2em; font-weight: bold;">Do zapłaty: ${p.total} PLN (Opłacono)</p>
                    </div>
                    <p><strong>Adres dostawy:</strong><br/>${p.customerName}<br/>${p.address}</p>
                    <p>W razie pytań prosimy o kontakt zwrotny na ten adres email.</p>
                    <p>Pozdrawiamy,<br/>Zespół Mikrostomart</p>
                </div>
            `,
        },
        reservation_confirmation: {
            subject: (p) => `Potwierdzenie rezerwacji - ${p.specialist}`,
            html: (p) => `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #dcb14a;">Dziękujemy za rezerwację!</h1>
                    <p>Cześć ${p.firstName},</p>
                    <p>Twoja rezerwacja została przyjęta. Skontaktujemy się z Tobą w celu potwierdzenia terminu.</p>
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Szczegóły rezerwacji:</h3>
                        <p><strong>Specjalista:</strong> ${p.specialist}</p>
                        <p><strong>Preferowana data:</strong> ${p.appointmentDate}</p>
                        ${p.description ? `<p><strong>Opis:</strong> ${p.description}</p>` : ''}
                    </div>
                    <p><strong>⚠️ Uwaga:</strong> To nie jest ostateczne potwierdzenie wizyty. Recepcja skontaktuje się z Tobą telefonicznie lub emailem w celu ustalenia szczegółów.</p>
                    <p>W razie pytań prosimy o kontakt zwrotny na ten adres email lub telefonicznie: <a href="tel:+48570270470">570 270 470</a> lub <a href="tel:+48570810800">570 810 800</a></p>
                    <p>Pozdrawiamy,<br/>Zespół Mikrostomart</p>
                </div>
            `,
        },
    },
    en: {
        verification_email: {
            subject: 'Confirm your email address - Patient Portal',
            html: (p) => `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #dcb14a, #f0c96c); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .header h1 { color: #000; margin: 0; font-size: 24px; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #dcb14a, #f0c96c); color: #000; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header"><h1>🦷 Mikrostomart</h1></div>
                        <div class="content">
                            <h2>Welcome!</h2>
                            <p>Thank you for registering in the Patient Portal.</p>
                            <p>To complete your registration, please confirm your email address by clicking the button below:</p>
                            <div style="text-align: center;">
                                <a href="${p.verificationUrl}" class="button">Confirm email</a>
                            </div>
                            <p>Or copy and paste this link into your browser:</p>
                            <p style="word-break: break-all; background: white; padding: 10px; border-radius: 5px;">${p.verificationUrl}</p>
                            <div class="warning">
                                <strong>⚠️ Important:</strong>
                                <ul>
                                    <li>This link is valid for <strong>24 hours</strong></li>
                                    <li>After clicking, your account will be created and sent for administrator verification</li>
                                    <li>Administrator verification may take up to <strong>48 hours</strong></li>
                                </ul>
                            </div>
                            <p>If you have any questions, contact us:</p>
                            <p>📞 +48 570 270 470<br>📧 gabinet@mikrostomart.pl</p>
                        </div>
                        <div class="footer">
                            <p>© ${p.year} Mikrostomart - Dental Clinic</p>
                            <p>ul. Centralna 15, 45-362 Opole, Poland</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
        },
        order_confirmation: {
            subject: (p) => `Order confirmation - MIKROSTOMART`,
            html: (p) => `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #dcb14a;">Thank you for your order!</h1>
                    <p>Hi ${p.firstName},</p>
                    <p>Your order has been received and paid. We will start processing it shortly.</p>
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Summary:</h3>
                        <ul>${p.itemsHtml}</ul>
                        <p style="font-size: 1.2em; font-weight: bold;">Total: ${p.total} PLN (Paid)</p>
                    </div>
                    <p><strong>Delivery address:</strong><br/>${p.customerName}<br/>${p.address}</p>
                    <p>If you have any questions, please reply to this email.</p>
                    <p>Best regards,<br/>Mikrostomart Team</p>
                </div>
            `,
        },
        reservation_confirmation: {
            subject: (p) => `Reservation confirmation - ${p.specialist}`,
            html: (p) => `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #dcb14a;">Thank you for your reservation!</h1>
                    <p>Hi ${p.firstName},</p>
                    <p>Your reservation has been received. We will contact you to confirm the appointment.</p>
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Reservation details:</h3>
                        <p><strong>Specialist:</strong> ${p.specialist}</p>
                        <p><strong>Preferred date:</strong> ${p.appointmentDate}</p>
                        ${p.description ? `<p><strong>Description:</strong> ${p.description}</p>` : ''}
                    </div>
                    <p><strong>⚠️ Note:</strong> This is not a final appointment confirmation. Our reception will contact you by phone or email to arrange the details.</p>
                    <p>If you have any questions, please reply to this email or call: <a href="tel:+48570270470">+48 570 270 470</a> or <a href="tel:+48570810800">+48 570 810 800</a></p>
                    <p>Best regards,<br/>Mikrostomart Team</p>
                </div>
            `,
        },
    },
    de: {
        verification_email: {
            subject: 'E-Mail-Adresse bestätigen - Patientenportal',
            html: (p) => `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #dcb14a, #f0c96c); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .header h1 { color: #000; margin: 0; font-size: 24px; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #dcb14a, #f0c96c); color: #000; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header"><h1>🦷 Mikrostomart</h1></div>
                        <div class="content">
                            <h2>Willkommen!</h2>
                            <p>Vielen Dank für Ihre Registrierung im Patientenportal.</p>
                            <p>Um Ihre Registrierung abzuschließen, bestätigen Sie bitte Ihre E-Mail-Adresse:</p>
                            <div style="text-align: center;">
                                <a href="${p.verificationUrl}" class="button">E-Mail bestätigen</a>
                            </div>
                            <p>Oder kopieren Sie diesen Link in Ihren Browser:</p>
                            <p style="word-break: break-all; background: white; padding: 10px; border-radius: 5px;">${p.verificationUrl}</p>
                            <div class="warning">
                                <strong>⚠️ Wichtig:</strong>
                                <ul>
                                    <li>Dieser Link ist <strong>24 Stunden</strong> gültig</li>
                                    <li>Nach dem Klicken wird Ihr Konto erstellt und zur Überprüfung an den Administrator gesendet</li>
                                    <li>Die Überprüfung kann bis zu <strong>48 Stunden</strong> dauern</li>
                                </ul>
                            </div>
                            <p>Bei Fragen kontaktieren Sie uns:</p>
                            <p>📞 +48 570 270 470<br>📧 gabinet@mikrostomart.pl</p>
                        </div>
                        <div class="footer">
                            <p>© ${p.year} Mikrostomart - Zahnarztpraxis</p>
                            <p>ul. Centralna 15, 45-362 Opole, Polen</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
        },
        order_confirmation: {
            subject: (p) => `Bestellbestätigung - MIKROSTOMART`,
            html: (p) => `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #dcb14a;">Vielen Dank für Ihre Bestellung!</h1>
                    <p>Hallo ${p.firstName},</p>
                    <p>Ihre Bestellung wurde angenommen und bezahlt. Wir beginnen in Kürze mit der Bearbeitung.</p>
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Zusammenfassung:</h3>
                        <ul>${p.itemsHtml}</ul>
                        <p style="font-size: 1.2em; font-weight: bold;">Gesamt: ${p.total} PLN (Bezahlt)</p>
                    </div>
                    <p><strong>Lieferadresse:</strong><br/>${p.customerName}<br/>${p.address}</p>
                    <p>Bei Fragen antworten Sie bitte auf diese E-Mail.</p>
                    <p>Mit freundlichen Grüßen,<br/>Team Mikrostomart</p>
                </div>
            `,
        },
        reservation_confirmation: {
            subject: (p) => `Reservierungsbestätigung - ${p.specialist}`,
            html: (p) => `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #dcb14a;">Vielen Dank für Ihre Reservierung!</h1>
                    <p>Hallo ${p.firstName},</p>
                    <p>Ihre Reservierung wurde angenommen. Wir werden Sie kontaktieren, um den Termin zu bestätigen.</p>
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Reservierungsdetails:</h3>
                        <p><strong>Spezialist:</strong> ${p.specialist}</p>
                        <p><strong>Gewünschtes Datum:</strong> ${p.appointmentDate}</p>
                        ${p.description ? `<p><strong>Beschreibung:</strong> ${p.description}</p>` : ''}
                    </div>
                    <p><strong>⚠️ Hinweis:</strong> Dies ist keine endgültige Terminbestätigung. Unsere Rezeption wird Sie telefonisch oder per E-Mail kontaktieren.</p>
                    <p>Bei Fragen antworten Sie auf diese E-Mail oder rufen Sie an: <a href="tel:+48570270470">+48 570 270 470</a> oder <a href="tel:+48570810800">+48 570 810 800</a></p>
                    <p>Mit freundlichen Grüßen,<br/>Team Mikrostomart</p>
                </div>
            `,
        },
    },
    ua: {
        verification_email: {
            subject: 'Підтвердіть свою електронну адресу - Портал пацієнта',
            html: (p) => `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: linear-gradient(135deg, #dcb14a, #f0c96c); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                        .header h1 { color: #000; margin: 0; font-size: 24px; }
                        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                        .button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #dcb14a, #f0c96c); color: #000; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
                        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header"><h1>🦷 Mikrostomart</h1></div>
                        <div class="content">
                            <h2>Ласкаво просимо!</h2>
                            <p>Дякуємо за реєстрацію в Порталі пацієнта.</p>
                            <p>Щоб завершити реєстрацію, підтвердіть свою електронну адресу, натиснувши кнопку нижче:</p>
                            <div style="text-align: center;">
                                <a href="${p.verificationUrl}" class="button">Підтвердити email</a>
                            </div>
                            <p>Або скопіюйте та вставте це посилання у свій браузер:</p>
                            <p style="word-break: break-all; background: white; padding: 10px; border-radius: 5px;">${p.verificationUrl}</p>
                            <div class="warning">
                                <strong>⚠️ Важливо:</strong>
                                <ul>
                                    <li>Посилання дійсне протягом <strong>24 годин</strong></li>
                                    <li>Після натискання ваш обліковий запис буде створено та відправлено на перевірку адміністратору</li>
                                    <li>Перевірка адміністратором може зайняти до <strong>48 годин</strong></li>
                                </ul>
                            </div>
                            <p>Якщо у вас є питання, зв'яжіться з нами:</p>
                            <p>📞 +48 570 270 470<br>📧 gabinet@mikrostomart.pl</p>
                        </div>
                        <div class="footer">
                            <p>© ${p.year} Mikrostomart - Стоматологічна клініка</p>
                            <p>ul. Centralna 15, 45-362 Opole, Польща</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
        },
        order_confirmation: {
            subject: (p) => `Підтвердження замовлення - MIKROSTOMART`,
            html: (p) => `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #dcb14a;">Дякуємо за замовлення!</h1>
                    <p>Привіт ${p.firstName},</p>
                    <p>Ваше замовлення прийнято та оплачено. Ми незабаром розпочнемо його обробку.</p>
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Підсумок:</h3>
                        <ul>${p.itemsHtml}</ul>
                        <p style="font-size: 1.2em; font-weight: bold;">Разом: ${p.total} PLN (Оплачено)</p>
                    </div>
                    <p><strong>Адреса доставки:</strong><br/>${p.customerName}<br/>${p.address}</p>
                    <p>Якщо у вас є питання, відповідайте на цей email.</p>
                    <p>З повагою,<br/>Команда Mikrostomart</p>
                </div>
            `,
        },
        reservation_confirmation: {
            subject: (p) => `Підтвердження бронювання - ${p.specialist}`,
            html: (p) => `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #dcb14a;">Дякуємо за бронювання!</h1>
                    <p>Привіт ${p.firstName},</p>
                    <p>Ваше бронювання прийнято. Ми зв'яжемося з вами для підтвердження прийому.</p>
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Деталі бронювання:</h3>
                        <p><strong>Спеціаліст:</strong> ${p.specialist}</p>
                        <p><strong>Бажана дата:</strong> ${p.appointmentDate}</p>
                        ${p.description ? `<p><strong>Опис:</strong> ${p.description}</p>` : ''}
                    </div>
                    <p><strong>⚠️ Зверніть увагу:</strong> Це не остаточне підтвердження прийому. Наша реєстратура зв'яжеться з вами по телефону або email.</p>
                    <p>Якщо у вас є питання, відповідайте на цей email або зателефонуйте: <a href="tel:+48570270470">+48 570 270 470</a> або <a href="tel:+48570810800">+48 570 810 800</a></p>
                    <p>З повагою,<br/>Команда Mikrostomart</p>
                </div>
            `,
        },
    },
};

/**
 * Get a localized email template.
 * @param type - Template type
 * @param locale - Language ('pl', 'en', 'de', 'ua')
 * @param params - Parameters to interpolate
 * @returns { subject: string, html: string }
 */
export function getEmailTemplate(
    type: EmailTemplateType,
    locale: string,
    params: Record<string, string>
): { subject: string; html: string } {
    const localeTemplates = templates[locale] || templates['pl'];
    const template = localeTemplates[type] || templates['pl'][type];

    const subject = typeof template.subject === 'function'
        ? template.subject(params)
        : template.subject;

    return {
        subject: demoSanitize(subject),
        html: demoSanitize(template.html(params)),
    };
}
