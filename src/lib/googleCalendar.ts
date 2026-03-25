/**
 * Google Calendar API Integration
 * OAuth2 token management + Calendar CRUD operations
 */

import { createClient } from '@supabase/supabase-js';
import { demoSanitize } from '@/lib/brandConfig';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://mikrostomart.pl/api/employee/calendar/auth/callback';

const SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
];

// ─── Types ───────────────────────────────────────────────────

export interface CalendarEvent {
    id?: string;
    summary: string;
    description?: string;
    start: string;          // ISO datetime
    end?: string;           // ISO datetime (defaults to start + 1h)
    allDay?: boolean;
    location?: string;
    reminders?: {
        useDefault?: boolean;
        overrides?: Array<{ method: 'popup' | 'email'; minutes: number }>;
    };
    colorId?: string;
}

interface TokenData {
    access_token: string;
    refresh_token: string;
    token_expiry: string;
    calendar_email?: string;
}

// ─── OAuth2 Helpers ──────────────────────────────────────────

/**
 * Generate the Google OAuth consent URL for calendar access
 */
export function getAuthUrl(state?: string): string {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    url.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', SCOPES.join(' '));
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    if (state) url.searchParams.set('state', state);
    return url.toString();
}

/**
 * Exchange authorization code for access + refresh tokens, store in DB
 */
export async function exchangeCode(code: string, userId: string): Promise<{ success: boolean; email?: string; error?: string }> {
    try {
        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: GOOGLE_REDIRECT_URI,
                grant_type: 'authorization_code',
            }),
        });

        const data = await res.json();

        if (!res.ok || !data.access_token) {
            console.error('[GoogleCalendar] Token exchange failed:', data);
            return { success: false, error: data.error_description || 'Token exchange failed' };
        }

        // Get the user's email from the token info
        let calendarEmail: string | undefined;
        try {
            const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${data.access_token}` },
            });
            const profile = await profileRes.json();
            calendarEmail = profile.email;
        } catch { /* ignore — email is optional */ }

        const tokenExpiry = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();

        // Upsert tokens in DB
        const { error: dbError } = await supabase
            .from('employee_calendar_tokens')
            .upsert({
                user_id: userId,
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                token_expiry: tokenExpiry,
                calendar_email: calendarEmail,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });

        if (dbError) {
            console.error('[GoogleCalendar] DB error storing tokens:', dbError);
            return { success: false, error: 'Failed to store tokens' };
        }

        console.log(`[GoogleCalendar] Connected for user ${userId} (${calendarEmail})`);
        return { success: true, email: calendarEmail };
    } catch (err: any) {
        console.error('[GoogleCalendar] exchangeCode error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Get a valid access token for a user (auto-refreshes if expired)
 */
async function getValidToken(userId: string): Promise<string | null> {
    const { data: tokenRow } = await supabase
        .from('employee_calendar_tokens')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (!tokenRow) return null;

    // Check if token is still valid (5 min buffer)
    if (new Date(tokenRow.token_expiry).getTime() > Date.now() + 5 * 60 * 1000) {
        return tokenRow.access_token;
    }

    // Refresh the token
    try {
        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                refresh_token: tokenRow.refresh_token,
                grant_type: 'refresh_token',
            }),
        });

        const data = await res.json();

        if (!res.ok || !data.access_token) {
            console.error('[GoogleCalendar] Token refresh failed:', data);
            return null;
        }

        const tokenExpiry = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();

        await supabase
            .from('employee_calendar_tokens')
            .update({
                access_token: data.access_token,
                token_expiry: tokenExpiry,
                // refresh_token stays the same unless Google rotates it
                ...(data.refresh_token ? { refresh_token: data.refresh_token } : {}),
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

        return data.access_token;
    } catch (err) {
        console.error('[GoogleCalendar] Token refresh error:', err);
        return null;
    }
}

// ─── Calendar API Operations ────────────────────────────────

/**
 * Check if user has Google Calendar connected
 */
export async function isCalendarConnected(userId: string): Promise<{ connected: boolean; email?: string }> {
    const { data } = await supabase
        .from('employee_calendar_tokens')
        .select('calendar_email')
        .eq('user_id', userId)
        .single();

    return { connected: !!data, email: data?.calendar_email };
}

/**
 * Disconnect Google Calendar (remove tokens)
 */
export async function disconnectCalendar(userId: string): Promise<void> {
    // Revoke the token at Google
    const { data: tokenRow } = await supabase
        .from('employee_calendar_tokens')
        .select('access_token')
        .eq('user_id', userId)
        .single();

    if (tokenRow?.access_token) {
        try {
            await fetch(`https://oauth2.googleapis.com/revoke?token=${tokenRow.access_token}`, {
                method: 'POST',
            });
        } catch { /* ignore revoke errors */ }
    }

    await supabase
        .from('employee_calendar_tokens')
        .delete()
        .eq('user_id', userId);

    console.log(`[GoogleCalendar] Disconnected for user ${userId}`);
}

/**
 * Create a calendar event
 */
export async function createEvent(userId: string, event: CalendarEvent): Promise<{ success: boolean; eventId?: string; htmlLink?: string; error?: string }> {
    const token = await getValidToken(userId);
    if (!token) return { success: false, error: 'Google Calendar nie jest połączony' };

    const endTime = event.end || new Date(new Date(event.start).getTime() + 60 * 60 * 1000).toISOString();

    const body: Record<string, any> = {
        summary: event.summary,
        description: event.description || '',
        location: event.location || '',
    };

    if (event.allDay) {
        // All-day events use 'date' instead of 'dateTime'
        body.start = { date: event.start.split('T')[0] };
        body.end = { date: (event.end || event.start).split('T')[0] };
    } else {
        body.start = { dateTime: event.start, timeZone: 'Europe/Warsaw' };
        body.end = { dateTime: endTime, timeZone: 'Europe/Warsaw' };
    }

    if (event.reminders) {
        body.reminders = event.reminders;
    } else {
        body.reminders = {
            useDefault: false,
            overrides: [
                { method: 'popup', minutes: 15 },
            ],
        };
    }

    if (event.colorId) {
        body.colorId = event.colorId;
    }

    try {
        const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
            console.error('[GoogleCalendar] Create event error:', data);
            return { success: false, error: data.error?.message || 'Failed to create event' };
        }

        console.log(`[GoogleCalendar] Created event "${event.summary}" for user ${userId}`);
        return { success: true, eventId: data.id, htmlLink: data.htmlLink };
    } catch (err: any) {
        console.error('[GoogleCalendar] Create event exception:', err);
        return { success: false, error: err.message };
    }
}

/**
 * List upcoming calendar events
 */
export async function listEvents(
    userId: string,
    timeMin?: string,
    timeMax?: string,
    maxResults: number = 20
): Promise<{ success: boolean; events?: any[]; error?: string }> {
    const token = await getValidToken(userId);
    if (!token) return { success: false, error: 'Google Calendar nie jest połączony' };

    const now = new Date().toISOString();
    const params = new URLSearchParams({
        timeMin: timeMin || now,
        ...(timeMax ? { timeMax } : {}),
        maxResults: maxResults.toString(),
        singleEvents: 'true',
        orderBy: 'startTime',
    });

    try {
        const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const data = await res.json();

        if (!res.ok) {
            console.error('[GoogleCalendar] List events error:', data);
            return { success: false, error: data.error?.message || 'Failed to list events' };
        }

        return { success: true, events: data.items || [] };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

/**
 * Delete a calendar event
 */
export async function deleteEvent(userId: string, eventId: string): Promise<{ success: boolean; error?: string }> {
    const token = await getValidToken(userId);
    if (!token) return { success: false, error: 'Google Calendar nie jest połączony' };

    try {
        const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
            {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            }
        );

        if (!res.ok && res.status !== 404) {
            const data = await res.json().catch(() => ({}));
            return { success: false, error: (data as any).error?.message || 'Failed to delete event' };
        }

        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
