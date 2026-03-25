/**
 * IMAP/SMTP Email Service for gabinet@mikrostomart.pl
 * Uses ImapFlow (IMAP) + Nodemailer (SMTP) + Mailparser
 * Hosted on cyberfolks.pl (s2.cyber-folks.pl)
 */

import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import { simpleParser, ParsedMail } from 'mailparser';
import { demoSanitize } from '@/lib/brandConfig';

// ─── Config ──────────────────────────────────────────────────

const IMAP_CONFIG = {
    host: process.env.EMAIL_IMAP_HOST || 's2.cyber-folks.pl',
    port: parseInt(process.env.EMAIL_IMAP_PORT || '993'),
    secure: true,
    auth: {
        user: process.env.EMAIL_IMAP_USER || demoSanitize('gabinet@mikrostomart.pl'),
        pass: process.env.EMAIL_IMAP_PASS || '',
    },
    logger: false as const,
    tls: {
        rejectUnauthorized: false, // cyberfolks self-signed cert
    },
};

const SMTP_CONFIG = {
    host: process.env.EMAIL_SMTP_HOST || 's2.cyber-folks.pl',
    port: parseInt(process.env.EMAIL_SMTP_PORT || '465'),
    secure: true,
    auth: {
        user: process.env.EMAIL_IMAP_USER || demoSanitize('gabinet@mikrostomart.pl'),
        pass: process.env.EMAIL_IMAP_PASS || '',
    },
    tls: {
        rejectUnauthorized: false,
    },
};

// ─── Types ───────────────────────────────────────────────────

export interface EmailListItem {
    uid: number;
    subject: string;
    from: { name: string; address: string };
    to: { name: string; address: string }[];
    date: string;
    snippet: string;
    isRead: boolean;
    isStarred: boolean;
    hasAttachments: boolean;
    size: number;
}

export interface EmailFull {
    uid: number;
    messageId: string;
    subject: string;
    from: { name: string; address: string };
    to: { name: string; address: string }[];
    cc: { name: string; address: string }[];
    date: string;
    html: string;
    text: string;
    isRead: boolean;
    isStarred: boolean;
    inReplyTo: string;
    references: string[];
    attachments: EmailAttachment[];
}

export interface EmailAttachment {
    filename: string;
    contentType: string;
    size: number;
    partId: string;
    contentId?: string;
}

export interface FolderInfo {
    path: string;
    name: string;
    totalMessages: number;
    unseenMessages: number;
    specialUse?: string;
}

// ─── Helper: Create IMAP connection ─────────────────────────

async function withImap<T>(fn: (client: ImapFlow) => Promise<T>): Promise<T> {
    const client = new ImapFlow(IMAP_CONFIG);
    try {
        await client.connect();
        return await fn(client);
    } finally {
        await client.logout().catch(() => { });
    }
}

// ─── Helper: Parse address ──────────────────────────────────

function parseAddress(addr: any): { name: string; address: string } {
    if (!addr) return { name: '', address: '' };
    if (typeof addr === 'string') return { name: '', address: addr };
    if (addr.value && Array.isArray(addr.value)) {
        const first = addr.value[0];
        return { name: first?.name || '', address: first?.address || '' };
    }
    return { name: addr.name || '', address: addr.address || '' };
}

function parseAddressList(addr: any): { name: string; address: string }[] {
    if (!addr) return [];
    if (addr.value && Array.isArray(addr.value)) {
        return addr.value.map((a: any) => ({
            name: a.name || '',
            address: a.address || '',
        }));
    }
    if (Array.isArray(addr)) {
        return addr.map((a: any) => ({
            name: a.name || '',
            address: a.address || '',
        }));
    }
    const parsed = parseAddress(addr);
    return parsed.address ? [parsed] : [];
}

// ─── List emails ─────────────────────────────────────────────

export async function listEmails(
    folder: string = 'INBOX',
    page: number = 1,
    pageSize: number = 30,
    search?: string
): Promise<{ emails: EmailListItem[]; total: number }> {
    return withImap(async (client) => {
        const lock = await client.getMailboxLock(folder);
        try {
            const mailbox = client.mailbox;
            const total = (mailbox && typeof mailbox === 'object' && 'exists' in mailbox) ? mailbox.exists : 0;

            if (total === 0) {
                return { emails: [], total: 0 };
            }

            // Build search query
            let searchQuery: any = { all: true };
            if (search) {
                searchQuery = {
                    or: [
                        { subject: search },
                        { from: search },
                        { body: search },
                    ],
                };
            }

            // Search to get matching UIDs
            const searchResult = await client.search(searchQuery, { uid: true });
            const uids = Array.isArray(searchResult) ? searchResult : [];

            if (uids.length === 0) {
                return { emails: [], total: 0 };
            }

            // Sort descending (newest first) and paginate
            const sortedUids = [...uids].sort((a, b) => b - a);
            const start = (page - 1) * pageSize;
            const pagedUids = sortedUids.slice(start, start + pageSize);

            if (pagedUids.length === 0) {
                return { emails: [], total: sortedUids.length };
            }

            const emails: EmailListItem[] = [];

            // Fetch each message's envelope
            for await (const msg of client.fetch(pagedUids.join(','), {
                uid: true,
                envelope: true,
                flags: true,
                bodyStructure: true,
                size: true,
                headers: ['subject'],
            }, { uid: true })) {
                const envelope = msg.envelope;
                const flags = msg.flags || new Set<string>();
                const bodyStructure = msg.bodyStructure;

                // Detect attachments
                let hasAttachments = false;
                if (bodyStructure) {
                    const checkAttachments = (part: any): boolean => {
                        if (part.disposition === 'attachment') return true;
                        if (part.childNodes) {
                            return part.childNodes.some((child: any) => checkAttachments(child));
                        }
                        return false;
                    };
                    hasAttachments = checkAttachments(bodyStructure);
                }

                if (!envelope) continue;
                const fromAddr = envelope.from?.[0] || {} as any;

                emails.push({
                    uid: msg.uid,
                    subject: envelope.subject || '(brak tematu)',
                    from: {
                        name: fromAddr.name || '',
                        address: fromAddr.address || '',
                    },
                    to: (envelope.to || []).map((a: any) => ({
                        name: a.name || '',
                        address: a.address || '',
                    })),
                    date: envelope.date?.toISOString() || new Date().toISOString(),
                    snippet: '', // IMAP doesn't support snippets natively
                    isRead: flags.has('\\Seen'),
                    isStarred: flags.has('\\Flagged'),
                    hasAttachments,
                    size: msg.size || 0,
                });
            }

            // Sort by date descending (newest first) — client.fetch doesn't preserve UID order
            emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            return { emails, total: sortedUids.length };
        } finally {
            lock.release();
        }
    });
}

// ─── Get full email ──────────────────────────────────────────

export async function getEmail(
    uid: number,
    folder: string = 'INBOX',
    markAsRead: boolean = true
): Promise<EmailFull | null> {
    return withImap(async (client) => {
        const lock = await client.getMailboxLock(folder);
        try {
            // Fetch raw source
            const download = await client.download(uid.toString(), undefined, { uid: true });
            if (!download) return null;

            // Read stream to buffer
            const chunks: Buffer[] = [];
            for await (const chunk of download.content) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const source = Buffer.concat(chunks);

            // Parse with mailparser
            const parsed: ParsedMail = await simpleParser(source);

            // Get flags
            let isRead = false;
            let isStarred = false;
            for await (const msg of client.fetch(uid.toString(), { uid: true, flags: true }, { uid: true })) {
                const flags = msg.flags || new Set<string>();
                isRead = flags.has('\\Seen');
                isStarred = flags.has('\\Flagged');
            }

            // Mark as read if requested
            if (markAsRead && !isRead) {
                await client.messageFlagsAdd(uid.toString(), ['\\Seen'], { uid: true });
            }

            // Extract attachments metadata
            const attachments: EmailAttachment[] = (parsed.attachments || []).map((att: any, idx: number) => ({
                filename: att.filename || `attachment_${idx + 1}`,
                contentType: att.contentType || 'application/octet-stream',
                size: att.size || 0,
                partId: att.contentId || String(idx + 1),
                contentId: att.contentId || undefined,
            }));

            return {
                uid,
                messageId: parsed.messageId || '',
                subject: parsed.subject || '(brak tematu)',
                from: parseAddress(parsed.from),
                to: parseAddressList(parsed.to),
                cc: parseAddressList(parsed.cc),
                date: parsed.date?.toISOString() || new Date().toISOString(),
                html: parsed.html || parsed.textAsHtml || '',
                text: parsed.text || '',
                isRead: markAsRead ? true : isRead,
                isStarred,
                inReplyTo: parsed.inReplyTo || '',
                references: Array.isArray(parsed.references)
                    ? parsed.references
                    : parsed.references
                        ? [parsed.references]
                        : [],
                attachments,
            };
        } finally {
            lock.release();
        }
    });
}

// ─── Get attachment ──────────────────────────────────────────

export async function getAttachment(
    uid: number,
    attachmentIndex: number,
    folder: string = 'INBOX'
): Promise<{ data: Buffer; filename: string; contentType: string } | null> {
    return withImap(async (client) => {
        const lock = await client.getMailboxLock(folder);
        try {
            const download = await client.download(uid.toString(), undefined, { uid: true });
            if (!download) return null;

            const chunks: Buffer[] = [];
            for await (const chunk of download.content) {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const source = Buffer.concat(chunks);
            const parsed: ParsedMail = await simpleParser(source);

            const att = parsed.attachments?.[attachmentIndex];
            if (!att) return null;

            return {
                data: att.content,
                filename: att.filename || `attachment_${attachmentIndex + 1}`,
                contentType: att.contentType || 'application/octet-stream',
            };
        } finally {
            lock.release();
        }
    });
}

// ─── Send email ──────────────────────────────────────────────

export async function sendEmail(params: {
    to: string;
    cc?: string;
    subject: string;
    html: string;
    inReplyTo?: string;
    references?: string[];
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
        const transporter = nodemailer.createTransport(SMTP_CONFIG);

        const mailOptions: any = {
            from: `"Mikrostomart Gabinet" <${SMTP_CONFIG.auth.user}>`,
            to: params.to,
            subject: params.subject,
            html: params.html,
        };

        if (params.cc) mailOptions.cc = params.cc;
        if (params.inReplyTo) mailOptions.inReplyTo = params.inReplyTo;
        if (params.references?.length) mailOptions.references = params.references.join(' ');

        const info = await transporter.sendMail(mailOptions);

        // Save sent message to IMAP Sent folder
        try {
            // Build raw RFC 822 message using nodemailer's MailComposer
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const MailComposer = require('nodemailer/lib/mail-composer');
            const composer = new MailComposer(mailOptions);
            const rawBuffer: Buffer = await new Promise((resolve, reject) => {
                composer.compile().build((err: Error | null, msg: Buffer) => {
                    if (err) reject(err);
                    else resolve(msg);
                });
            });

            await withImap(async (client) => {
                // Find the Sent folder (try specialUse first, then common names)
                const folders = await client.list();
                let sentPath = 'Sent';  // fallback
                const sentFolderNames = ['Sent', 'INBOX.Sent', 'Sent Messages', 'Sent Items'];
                for (const f of folders) {
                    if (f.specialUse === '\\Sent') {
                        sentPath = f.path;
                        break;
                    }
                    if (sentFolderNames.includes(f.path)) {
                        sentPath = f.path;
                        // Don't break — keep looking for specialUse match
                    }
                }
                await client.append(sentPath, rawBuffer, ['\\Seen']);
            });
        } catch (appendErr: any) {
            // Don't fail the send — the message was already delivered
            console.error('[SMTP] Sent folder append error (message was delivered):', appendErr?.message || appendErr);
        }

        return { success: true, messageId: info.messageId };
    } catch (err: any) {
        console.error('[SMTP] Send error:', err);
        return { success: false, error: err.message || 'SMTP error' };
    }
}

// ─── Modify flags ────────────────────────────────────────────

export async function setFlags(
    uid: number,
    action: 'read' | 'unread' | 'star' | 'unstar',
    folder: string = 'INBOX'
): Promise<boolean> {
    return withImap(async (client) => {
        const lock = await client.getMailboxLock(folder);
        try {
            switch (action) {
                case 'read':
                    await client.messageFlagsAdd(uid.toString(), ['\\Seen'], { uid: true });
                    break;
                case 'unread':
                    await client.messageFlagsRemove(uid.toString(), ['\\Seen'], { uid: true });
                    break;
                case 'star':
                    await client.messageFlagsAdd(uid.toString(), ['\\Flagged'], { uid: true });
                    break;
                case 'unstar':
                    await client.messageFlagsRemove(uid.toString(), ['\\Flagged'], { uid: true });
                    break;
            }
            return true;
        } finally {
            lock.release();
        }
    });
}

// ─── Move to trash ───────────────────────────────────────────

export async function moveToTrash(
    uid: number,
    folder: string = 'INBOX'
): Promise<boolean> {
    return withImap(async (client) => {
        const lock = await client.getMailboxLock(folder);
        try {
            // Try common trash folder names
            const trashFolders = ['Trash', 'INBOX.Trash', 'Deleted', 'INBOX.Deleted'];
            let trashPath = 'Trash';

            const folders = await client.list();
            for (const f of folders) {
                if (f.specialUse === '\\Trash') {
                    trashPath = f.path;
                    break;
                }
                if (trashFolders.includes(f.path)) {
                    trashPath = f.path;
                    break;
                }
            }

            await client.messageMove(uid.toString(), trashPath, { uid: true });
            return true;
        } finally {
            lock.release();
        }
    });
}

// ─── List folders ────────────────────────────────────────────

export async function listFolders(): Promise<FolderInfo[]> {
    return withImap(async (client) => {
        const folders = await client.list();
        const result: FolderInfo[] = [];

        for (const f of folders) {
            if (f.flags?.has('\\Noselect')) continue;

            let totalMessages = 0;
            let unseenMessages = 0;

            try {
                const lock = await client.getMailboxLock(f.path);
                try {
                    const mb = client.mailbox;
                    totalMessages = (mb && typeof mb === 'object' && 'exists' in mb) ? mb.exists : 0;
                    // Count unseen
                    const unseenResult = await client.search({ seen: false }, { uid: true });
                    unseenMessages = Array.isArray(unseenResult) ? unseenResult.length : 0;
                } finally {
                    lock.release();
                }
            } catch {
                // Skip folders we can't open
            }

            result.push({
                path: f.path,
                name: f.name,
                totalMessages,
                unseenMessages,
                specialUse: f.specialUse || undefined,
            });
        }

        return result;
    });
}

// ─── Get unread count ────────────────────────────────────────

export async function getUnreadCount(folder: string = 'INBOX'): Promise<number> {
    return withImap(async (client) => {
        const lock = await client.getMailboxLock(folder);
        try {
            const unseenResult = await client.search({ seen: false }, { uid: true });
            return Array.isArray(unseenResult) ? unseenResult.length : 0;
        } finally {
            lock.release();
        }
    });
}
