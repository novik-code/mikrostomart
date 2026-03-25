/**
 * ICS Calendar File Generator
 * Generates .ics files for "Add to Calendar" functionality
 */

import { demoSanitize } from '@/lib/brandConfig';

interface ICSEvent {
    summary: string;
    description?: string;
    location?: string;
    start: Date;
    end: Date;
    organizer?: { name: string; email: string };
    alarm?: number; // minutes before event
}

/**
 * Format a Date to ICS timestamp format (YYYYMMDDTHHMMSSZ)
 */
function formatICSDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Escape special characters in ICS text fields
 */
function escapeICS(text: string): string {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}

/**
 * Generate a unique UID for the ICS event
 */
function generateUID(): string {
    const now = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    return `${now}-${random}@mikrostomart.pl`;
}

/**
 * Generate .ics file content string
 */
export function generateICS(event: ICSEvent): string {
    const lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Mikrostomart//Gabinet Stomatologiczny//PL',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${generateUID()}`,
        `DTSTAMP:${formatICSDate(new Date())}`,
        `DTSTART:${formatICSDate(event.start)}`,
        `DTEND:${formatICSDate(event.end)}`,
        `SUMMARY:${escapeICS(event.summary)}`,
    ];

    if (event.description) {
        lines.push(`DESCRIPTION:${escapeICS(event.description)}`);
    }

    if (event.location) {
        lines.push(`LOCATION:${escapeICS(event.location)}`);
    }

    if (event.organizer) {
        lines.push(`ORGANIZER;CN=${escapeICS(event.organizer.name)}:mailto:${event.organizer.email}`);
    }

    // Add alarm/reminder (default 60 minutes before)
    const alarmMinutes = event.alarm ?? 60;
    lines.push(
        'BEGIN:VALARM',
        'TRIGGER:-PT' + alarmMinutes + 'M',
        'ACTION:DISPLAY',
        `DESCRIPTION:Przypomnienie: ${escapeICS(event.summary)}`,
        'END:VALARM',
    );

    lines.push('END:VEVENT', 'END:VCALENDAR');

    return demoSanitize(lines.join('\r\n'));
}

/**
 * Generate .ics content for a dental appointment
 */
export function generateAppointmentICS(params: {
    patientName: string;
    doctorName: string;
    appointmentType: string;
    date: string;        // ISO date string
    time: string;        // HH:MM format
    durationMinutes?: number;
}): string {
    const { patientName, doctorName, appointmentType, date, time, durationMinutes = 60 } = params;

    // Parse date and time
    const [hours, minutes] = time.split(':').map(Number);
    const start = new Date(date);
    start.setHours(hours, minutes, 0, 0);

    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    return generateICS({
        summary: `Wizyta: ${appointmentType} — Mikrostomart`,
        description: `Wizyta stomatologiczna\\nLekarz: ${doctorName}\\nPacjent: ${patientName}\\nTyp: ${appointmentType}\\n\\nMikrostomart Gabinet Stomatologiczny\\nTel: 570-270-470`,
        location: 'Mikrostomart Gabinet Stomatologiczny, Opole',
        start,
        end,
        organizer: { name: 'Mikrostomart', email: 'gabinet@mikrostomart.pl' },
        alarm: 120, // 2 hours before appointment
    });
}

/**
 * Generate a Google Calendar add URL (no OAuth needed)
 */
export function generateGoogleCalendarUrl(params: {
    summary: string;
    description?: string;
    location?: string;
    start: Date;
    end: Date;
}): string {
    const { summary, description, location, start, end } = params;

    const formatGCal = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    const url = new URL('https://calendar.google.com/calendar/render');
    url.searchParams.set('action', 'TEMPLATE');
    url.searchParams.set('text', summary);
    url.searchParams.set('dates', `${formatGCal(start)}/${formatGCal(end)}`);
    if (description) url.searchParams.set('details', description);
    if (location) url.searchParams.set('location', location);

    return url.toString();
}
