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
        const { to, cc, subject, html, inReplyTo, references, attachments: rawAttachments } = body;

        if (!to || !subject) {
            return NextResponse.json(
                { error: 'Missing required fields: to, subject' },
                { status: 400 }
            );
        }

        // ─── Attachments validation + decode (added 2026-05-26) ────────
        // Client sends `attachments: [{ filename, contentBase64, contentType }]`.
        // Limits: max 5 files, 10 MB per file, 25 MB total (większość SMTP serwerów
        // ma cap 25 MB, base64 zwiększa rozmiar o ~33% więc 25 MB raw = ~33 MB
        // base64 podczas transferu — server-side decode wraca do raw bytes).
        const MAX_ATTACHMENT_COUNT = 5;
        const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB per file
        const MAX_TOTAL_ATTACHMENTS_BYTES = 25 * 1024 * 1024; // 25 MB total

        let decodedAttachments: Array<{ filename: string; content: Buffer; contentType?: string }> | undefined;

        if (Array.isArray(rawAttachments) && rawAttachments.length > 0) {
            if (rawAttachments.length > MAX_ATTACHMENT_COUNT) {
                return NextResponse.json(
                    { error: `Maksymalnie ${MAX_ATTACHMENT_COUNT} załączników (wysłano ${rawAttachments.length})` },
                    { status: 400 }
                );
            }

            let totalBytes = 0;
            decodedAttachments = [];

            for (let i = 0; i < rawAttachments.length; i++) {
                const att = rawAttachments[i];
                if (!att || typeof att !== 'object') {
                    return NextResponse.json(
                        { error: `Załącznik #${i + 1}: niepoprawny format` },
                        { status: 400 }
                    );
                }
                const { filename, contentBase64, contentType } = att;
                if (!filename || typeof filename !== 'string') {
                    return NextResponse.json(
                        { error: `Załącznik #${i + 1}: brak nazwy pliku` },
                        { status: 400 }
                    );
                }
                if (!contentBase64 || typeof contentBase64 !== 'string') {
                    return NextResponse.json(
                        { error: `Załącznik "${filename}": brak treści` },
                        { status: 400 }
                    );
                }

                // Decode base64 → Buffer. Akceptuje data URI prefix ("data:...;base64,") lub raw base64.
                const base64Data = contentBase64.includes(',') ? contentBase64.split(',', 2)[1] : contentBase64;
                let buffer: Buffer;
                try {
                    buffer = Buffer.from(base64Data, 'base64');
                } catch {
                    return NextResponse.json(
                        { error: `Załącznik "${filename}": niepoprawne kodowanie base64` },
                        { status: 400 }
                    );
                }

                if (buffer.length > MAX_ATTACHMENT_SIZE_BYTES) {
                    return NextResponse.json(
                        { error: `Załącznik "${filename}" przekracza limit 10 MB (rzeczywisty: ${(buffer.length / 1024 / 1024).toFixed(1)} MB)` },
                        { status: 400 }
                    );
                }

                totalBytes += buffer.length;
                if (totalBytes > MAX_TOTAL_ATTACHMENTS_BYTES) {
                    return NextResponse.json(
                        { error: `Suma załączników przekracza limit 25 MB` },
                        { status: 400 }
                    );
                }

                decodedAttachments.push({
                    filename,
                    content: buffer,
                    contentType: typeof contentType === 'string' && contentType ? contentType : undefined,
                });
            }
        }

        const result = await sendEmail({
            to,
            cc,
            subject,
            html: html || '<p></p>',
            inReplyTo,
            references,
            attachments: decodedAttachments,
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
