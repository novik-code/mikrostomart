/**
 * Employee Email API — admin-only IMAP/SMTP access to gabinet@mikrostomart.pl
 * 
 * GET:   ?action=list|read|attachment|folders|unread
 * POST:  Send email
 * PATCH: Modify flags (read/unread/star/unstar/trash)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import {
    listEmails,
    getEmail,
    getAttachment,
    sendEmail,
    setFlags,
    moveToTrash,
    listFolders,
    getUnreadCount,
} from '@/lib/imapService';

export const dynamic = 'force-dynamic';

// Check admin role
async function requireAdmin(): Promise<{ userId: string } | null> {
    const user = await verifyAdmin();
    if (!user) return null;

    const isAdmin = await hasRole(user.id, 'admin');
    if (!isAdmin) return null;

    return { userId: user.id };
}

// ─── GET: List / Read / Folders / Unread / Attachment ─────────

export async function GET(req: NextRequest) {
    const admin = await requireAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'list';

    try {
        switch (action) {
            case 'list': {
                const folder = searchParams.get('folder') || 'INBOX';
                const page = parseInt(searchParams.get('page') || '1');
                const pageSize = parseInt(searchParams.get('pageSize') || '30');
                const search = searchParams.get('search') || undefined;

                const result = await listEmails(folder, page, pageSize, search);
                return NextResponse.json(result);
            }

            case 'read': {
                const uid = parseInt(searchParams.get('uid') || '0');
                const folder = searchParams.get('folder') || 'INBOX';
                if (!uid) {
                    return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
                }
                const email = await getEmail(uid, folder);
                if (!email) {
                    return NextResponse.json({ error: 'Email not found' }, { status: 404 });
                }
                return NextResponse.json(email);
            }

            case 'attachment': {
                const uid = parseInt(searchParams.get('uid') || '0');
                const attIndex = parseInt(searchParams.get('index') || '0');
                const folder = searchParams.get('folder') || 'INBOX';
                if (!uid) {
                    return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
                }
                const att = await getAttachment(uid, attIndex, folder);
                if (!att) {
                    return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
                }
                return new NextResponse(new Uint8Array(att.data), {
                    headers: {
                        'Content-Type': att.contentType,
                        'Content-Disposition': `attachment; filename="${encodeURIComponent(att.filename)}"`,
                    },
                });
            }

            case 'folders': {
                const folders = await listFolders();
                return NextResponse.json({ folders });
            }

            case 'unread': {
                const folder = searchParams.get('folder') || 'INBOX';
                const count = await getUnreadCount(folder);
                return NextResponse.json({ count });
            }

            default:
                return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
        }
    } catch (err: any) {
        console.error('[Email API] GET error:', err);
        return NextResponse.json(
            { error: err.message || 'Server error' },
            { status: 500 }
        );
    }
}

// ─── POST: Send email ────────────────────────────────────────

export async function POST(req: NextRequest) {
    const admin = await requireAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { to, cc, subject, html, inReplyTo, references } = body;

        if (!to || !subject) {
            return NextResponse.json(
                { error: 'Missing required fields: to, subject' },
                { status: 400 }
            );
        }

        const result = await sendEmail({
            to,
            cc,
            subject,
            html: html || '<p></p>',
            inReplyTo,
            references,
        });

        if (result.success) {
            return NextResponse.json({ success: true, messageId: result.messageId });
        } else {
            return NextResponse.json(
                { error: result.error || 'Failed to send' },
                { status: 500 }
            );
        }
    } catch (err: any) {
        console.error('[Email API] POST error:', err);
        return NextResponse.json(
            { error: err.message || 'Server error' },
            { status: 500 }
        );
    }
}

// ─── PATCH: Modify flags (read/unread/star/trash) ────────────

export async function PATCH(req: NextRequest) {
    const admin = await requireAdmin();
    if (!admin) {
        return NextResponse.json({ error: 'Unauthorized — admin only' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { uid, action, folder } = body;

        if (!uid || !action) {
            return NextResponse.json(
                { error: 'Missing required fields: uid, action' },
                { status: 400 }
            );
        }

        if (action === 'trash') {
            const ok = await moveToTrash(uid, folder || 'INBOX');
            return NextResponse.json({ success: ok });
        }

        if (['read', 'unread', 'star', 'unstar'].includes(action)) {
            const ok = await setFlags(uid, action, folder || 'INBOX');
            return NextResponse.json({ success: ok });
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (err: any) {
        console.error('[Email API] PATCH error:', err);
        return NextResponse.json(
            { error: err.message || 'Server error' },
            { status: 500 }
        );
    }
}
