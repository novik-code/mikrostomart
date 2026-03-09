'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Mail, MailOpen, Send, Inbox, Star, Trash2, Search, RefreshCw, ChevronLeft, Paperclip, X, ArrowLeft, Reply, Forward, FileText, Tag, Bell, Globe, MessageCircle, Archive, Sparkles, Zap, Settings, BookOpen, GraduationCap, Plus, ToggleLeft, ToggleRight, Brain, ThumbsUp, ThumbsDown, Save, FolderOpen, ChevronDown } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────

interface EmailListItem {
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

interface EmailFull {
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
    attachments: { filename: string; contentType: string; size: number; partId: string; contentId?: string }[];
}

interface FolderInfo {
    path: string;
    name: string;
    totalMessages: number;
    unseenMessages: number;
    specialUse?: string;
}

// ─── Constants ───────────────────────────────────────────────

const FOLDER_ICONS: Record<string, any> = {
    INBOX: <Inbox size={16} />,
    Sent: <Send size={16} />,
    Trash: <Trash2 size={16} />,
    Drafts: <FileText size={16} />,
};

const FOLDER_LABELS: Record<string, string> = {
    INBOX: 'Odebrane',
    Sent: 'Wysłane',
    'INBOX.Sent': 'Wysłane',
    Trash: 'Kosz',
    'INBOX.Trash': 'Kosz',
    Drafts: 'Szkice',
    'INBOX.Drafts': 'Szkice',
};

function getFolderIcon(path: string) {
    if (path.includes('Sent')) return <Send size={16} />;
    if (path.includes('Trash') || path.includes('Deleted')) return <Trash2 size={16} />;
    if (path.includes('Draft')) return <FileText size={16} />;
    if (path === 'INBOX') return <Inbox size={16} />;
    return <Mail size={16} />;
}

function getFolderLabel(path: string, name: string) {
    return FOLDER_LABELS[path] || name;
}

// ─── Email Labels / Categories ──────────────────────────────

type EmailLabel = 'all' | 'wazne' | 'powiadomienia' | 'strona' | 'chat' | 'pozostale';

interface LabelDef {
    id: EmailLabel;
    label: string;
    icon: React.ReactNode;
    color: string;
    shortLabel: string;
}

const EMAIL_LABELS: LabelDef[] = [
    { id: 'all', label: 'Główne', icon: <Inbox size={14} />, color: '#38bdf8', shortLabel: 'Główne' },
    { id: 'wazne', label: '⭐ Ważne', icon: <Zap size={14} />, color: '#ef4444', shortLabel: 'Ważne' },
    { id: 'powiadomienia', label: 'Powiadomienia', icon: <Bell size={14} />, color: '#f59e0b', shortLabel: 'Powiadom.' },
    { id: 'strona', label: 'Strona & Formularze', icon: <Globe size={14} />, color: '#34d399', shortLabel: 'Strona' },
    { id: 'chat', label: 'Chat & Wiadomości', icon: <MessageCircle size={14} />, color: '#818cf8', shortLabel: 'Chat' },
    { id: 'pozostale', label: 'Pozostałe', icon: <Archive size={14} />, color: '#94a3b8', shortLabel: 'Inne' },
];

// ─── AI Draft types ─────────────────────────────────────────

interface AiDraft {
    id: string;
    email_uid: number;
    email_folder: string;
    email_subject: string;
    email_from_address: string;
    email_from_name: string;
    email_date: string;
    email_snippet: string;
    draft_subject: string;
    draft_html: string;
    status: 'pending' | 'approved' | 'sent' | 'rejected' | 'learned';
    admin_notes: string | null;
    ai_reasoning: string | null;
    created_at: string;
    reviewed_at: string | null;
    sent_at: string | null;
    reviewed_by: string | null;
    admin_rating: number | null;
    admin_tags: string[] | null;
}

interface SenderRule {
    id: string;
    email_pattern: string;
    rule_type: 'include' | 'exclude';
    note: string | null;
    created_by: string;
    created_at: string;
}

interface AiInstruction {
    id: string;
    instruction: string;
    category: 'tone' | 'content' | 'rules' | 'style' | 'other';
    is_active: boolean;
    created_by: string;
    created_at: string;
}

interface AiFeedback {
    id: string;
    draft_id: string | null;
    original_draft_html: string;
    corrected_draft_html: string;
    feedback_note: string | null;
    ai_analysis: string | null;
    created_by: string;
    created_at: string;
}

interface AiStats {
    total: number;
    pending: number;
    approved: number;
    sent: number;
    rejected: number;
    learned: number;
    avgRating: number | null;
}

/**
 * Classify an email into a label based on sender address and subject.
 * 
 * - powiadomienia: system notifications (appointments, SMS reports, cron jobs, status changes)
 * - strona: website forms (contact, treatment leads, orders, reservations)
 * - chat: chat replies and patient messages
 * - pozostale: everything else (real external mail)
 */
function classifyEmail(email: { from: { address: string; name: string }; subject: string }): EmailLabel {
    const addr = email.from.address.toLowerCase();
    const name = email.from.name.toLowerCase();
    const subj = email.subject.toLowerCase();

    // ── Notifications: app-generated (from noreply@ or system senders)
    const isAppSender = addr.includes('noreply@mikrostomart')
        || addr.includes('noreply@')
        || name.includes('mikrostomart')
        || name.includes('strefa pacjenta');

    if (isAppSender) {
        // Chat messages
        if (subj.includes('czat') || subj.includes('chat') || subj.includes('odpowied') || subj.includes('wiadomoś') || subj.includes('wiadomosc') || subj.includes('💬')) {
            return 'chat';
        }

        // Website forms & contact
        if (subj.includes('formularz') || subj.includes('kontakt') || subj.includes('zapytanie')
            || subj.includes('zamówieni') || subj.includes('zamowieni')
            || subj.includes('lead') || subj.includes('leczeni')
            || subj.includes('rezerwacj')
            || subj.includes('order') || subj.includes('reservation')) {
            return 'strona';
        }

        // Everything else from app = notification
        return 'powiadomienia';
    }

    // ── External form submissions (might come from different senders)
    if (subj.includes('formularz kontakt') || subj.includes('nowe zapytanie') || subj.includes('nowy lead')) {
        return 'strona';
    }

    // ── Mailer-daemon, postmaster, bounce notifications
    if (addr.includes('mailer-daemon') || addr.includes('postmaster') || subj.includes('delivery') || subj.includes('undeliverable') || subj.includes('bounce')) {
        return 'powiadomienia';
    }

    // ── Cron / system reports
    if (subj.includes('cron') || subj.includes('raport') || subj.includes('report') || subj.includes('sms') || subj.includes('[system]')) {
        return 'powiadomienia';
    }

    // ── Important patient correspondence ("Ważne")
    const importantPatterns = [
        'wizyt', 'umówi', 'umowi', 'termin', 'rejestr',
        'ból', 'bol', 'zęb', 'zeb', 'implant', 'protet',
        'leczeni', 'kanałow', 'kanalowo', 'wybielani', 'higienizacj',
        'cennik', 'cena', 'cen ', 'koszt', 'ile kosztuje', 'wycen',
        'reklamacj', 'roszczen', 'skargi', 'zwrot', 'gwarancj', 'rękojmi',
        'dziecko', 'dziec', 'adaptacyj',
        'rtg', 'zdjęci', 'zdjecii', 'tomografi', 'cbct',
        'ósemk', 'osemk', 'chirug', 'usunięci', 'usunieci',
        'licówk', 'licowk', 'korona ', 'most ', 'bonding',
        'alignery', 'ortodoncj', 'nakładk',
        'skaling', 'piaskowan', 'fluoryzacj',
        'recepta', 'lekarz', 'doktor', 'dr ', 'marcin', 'nowosielski',
        'pytanie', 'pytani', 'konsultacj', 'porad',
    ];

    const isNotBusiness = !(
        subj.includes('oferta') || subj.includes('newsletter') || subj.includes('unsubscribe')
        || subj.includes('marketing') || subj.includes('promocj') || subj.includes('faktur')
        || subj.includes('invoice') || subj.includes('współprac') || subj.includes('wspolprac')
        || subj.includes('b2b') || subj.includes('sprzeda') || subj.includes('handlow')
        || addr.includes('newsletter') || addr.includes('marketing') || addr.includes('promo')
        || addr.includes('info@') || addr.includes('biuro@') || addr.includes('kontakt@')
        || addr.includes('handlowy') || addr.includes('sales@')
    );

    if (isNotBusiness && importantPatterns.some(p => subj.includes(p))) {
        return 'wazne';
    }

    // Personal email senders (gmail, wp, onet, etc.) likely patients
    const isPersonalEmail = addr.includes('gmail.') || addr.includes('wp.pl')
        || addr.includes('onet.pl') || addr.includes('o2.pl') || addr.includes('interia.')
        || addr.includes('yahoo.') || addr.includes('outlook.') || addr.includes('hotmail.')
        || addr.includes('icloud.') || addr.includes('tlen.pl') || addr.includes('poczta.');

    if (isPersonalEmail && isNotBusiness && subj.length < 100) {
        return 'wazne';
    }

    return 'pozostale';
}

function getLabelDef(label: EmailLabel): LabelDef {
    return EMAIL_LABELS.find(l => l.id === label) || EMAIL_LABELS[EMAIL_LABELS.length - 1];
}

// ─── Helpers ─────────────────────────────────────────────────

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 24 && date.getDate() === now.getDate()) {
        return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    }
    if (hours < 48) return 'wczoraj';
    if (hours < 168) {
        const days = ['niedz.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.'];
        return days[date.getDay()];
    }
    return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
}

function formatFullDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('pl-PL', {
        day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function senderDisplay(from: { name: string; address: string }): string {
    return from.name || from.address.split('@')[0] || from.address;
}

// Sanitize HTML — remove scripts, on* attributes
function sanitizeHtml(html: string): string {
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/\son\w+="[^"]*"/gi, '')
        .replace(/\son\w+='[^']*'/gi, '')
        .replace(/javascript:/gi, '');
}

// ─── Component ───────────────────────────────────────────────

export default function EmailTab() {
    // State
    const [emails, setEmails] = useState<EmailListItem[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentFolder, setCurrentFolder] = useState('INBOX');
    const [folders, setFolders] = useState<FolderInfo[]>([]);
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [activeLabel, setActiveLabel] = useState<EmailLabel>('all');

    // Selected email
    const [selectedEmail, setSelectedEmail] = useState<EmailFull | null>(null);
    const [emailLoading, setEmailLoading] = useState(false);

    // Compose
    const [showCompose, setShowCompose] = useState(false);
    const [composeTo, setComposeTo] = useState('');
    const [composeCc, setComposeCc] = useState('');
    const [composeSubject, setComposeSubject] = useState('');
    const [composeBody, setComposeBody] = useState('');
    const [composeInReplyTo, setComposeInReplyTo] = useState('');
    const [composeReferences, setComposeReferences] = useState<string[]>([]);
    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState<{ success?: boolean; error?: string } | null>(null);
    const [composeAiGenerating, setComposeAiGenerating] = useState(false);
    const [composeAiDraftHtml, setComposeAiDraftHtml] = useState('');
    const [composeAiOriginalText, setComposeAiOriginalText] = useState(''); // original AI-generated plain text (for feedback diff)
    const [composeAiFeedbackRating, setComposeAiFeedbackRating] = useState(0);
    const [composeAiFeedbackTags, setComposeAiFeedbackTags] = useState<string[]>([]);
    const [composeAiFeedbackSending, setComposeAiFeedbackSending] = useState(false);
    const [composeAiFeedbackResult, setComposeAiFeedbackResult] = useState<string | null>(null);

    // Unread count
    const [unreadCount, setUnreadCount] = useState(0);

    // AI Drafts
    const [aiDrafts, setAiDrafts] = useState<AiDraft[]>([]);
    const [showDraftsPanel, setShowDraftsPanel] = useState(false);
    const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
    const [editingDraftHtml, setEditingDraftHtml] = useState('');
    const [draftSending, setDraftSending] = useState<string | null>(null);
    const [draftToast, setDraftToast] = useState<string | null>(null);

    // AI Settings / Training
    const [showAiSettings, setShowAiSettings] = useState(false);
    const [aiSettingsTab, setAiSettingsTab] = useState<'rules' | 'instructions' | 'learning' | 'guide' | 'knowledgebase'>('guide');
    const [senderRules, setSenderRules] = useState<SenderRule[]>([]);
    const [aiInstructions, setAiInstructions] = useState<AiInstruction[]>([]);
    const [aiFeedback, setAiFeedback] = useState<AiFeedback[]>([]);
    const [aiStats, setAiStats] = useState<AiStats | null>(null);
    const [newRulePattern, setNewRulePattern] = useState('');
    const [newRuleType, setNewRuleType] = useState<'include' | 'exclude'>('exclude');
    const [newRuleNote, setNewRuleNote] = useState('');
    const [newInstruction, setNewInstruction] = useState('');
    const [newInstrCategory, setNewInstrCategory] = useState<'tone' | 'content' | 'rules' | 'style' | 'other'>('rules');
    const [aiConfigLoading, setAiConfigLoading] = useState(false);
    const [learningDraftId, setLearningDraftId] = useState<string | null>(null);
    const [learningNote, setLearningNote] = useState('');
    const [knowledgeBase, setKnowledgeBase] = useState('');
    const [knowledgeBaseEditing, setKnowledgeBaseEditing] = useState(false);
    const [knowledgeBaseSaving, setKnowledgeBaseSaving] = useState(false);
    // Cron debug & manual trigger
    const [cronDebugLoading, setCronDebugLoading] = useState(false);
    const [cronDebugResult, setCronDebugResult] = useState<any>(null);
    const [cronRunLoading, setCronRunLoading] = useState(false);
    const [cronRunResult, setCronRunResult] = useState<string | null>(null);

    // Compose drafts (Robocze)
    const [composeDrafts, setComposeDrafts] = useState<any[]>([]);
    const [composeDraftId, setComposeDraftId] = useState<string | null>(null);
    const [showComposeDraftsList, setShowComposeDraftsList] = useState(false);
    const composeDraftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const composeDraftSavingRef = useRef(false);

    // Label overrides
    const [labelOverrides, setLabelOverrides] = useState<Record<number, EmailLabel>>({});
    const [labelPickerUid, setLabelPickerUid] = useState<number | null>(null);

    // Mobile
    const [showSidebar, setShowSidebar] = useState(false);
    const [isMobileView, setIsMobileView] = useState(false);

    // Refresh interval
    const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Detect mobile
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        setIsMobileView(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsMobileView(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // ─── Fetch emails ────────────────────────────────────────

    const fetchEmails = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                action: 'list',
                folder: currentFolder,
                page: '1',
                pageSize: '30',
            });
            if (searchQuery) params.set('search', searchQuery);

            const res = await fetch(`/api/employee/email?${params}`);
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `HTTP ${res.status}`);
            }
            const data = await res.json();
            const newEmails: EmailListItem[] = data.emails || [];
            setTotal(data.total || 0);

            // Merge new emails into existing list (keep loaded history)
            setEmails(prev => {
                if (prev.length === 0 || !silent) {
                    // First load or manual refresh: just set
                    return newEmails;
                }
                // Auto-refresh: merge page 1 into existing (add new, update existing)
                const existingMap = new Map(prev.map(e => [e.uid, e]));
                for (const email of newEmails) {
                    existingMap.set(email.uid, email);
                }
                const merged = Array.from(existingMap.values());
                merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                return merged;
            });
        } catch (err: any) {
            setError(err.message || 'Błąd połączenia');
        } finally {
            setLoading(false);
        }
    }, [currentFolder, searchQuery]);

    // ─── Load more emails (append next page) ────────────────

    const loadMoreEmails = useCallback(async () => {
        const nextPage = Math.floor(emails.length / 30) + 1;
        try {
            const params = new URLSearchParams({
                action: 'list',
                folder: currentFolder,
                page: String(nextPage),
                pageSize: '30',
            });
            if (searchQuery) params.set('search', searchQuery);

            const res = await fetch(`/api/employee/email?${params}`);
            if (!res.ok) return;
            const data = await res.json();
            const newEmails: EmailListItem[] = data.emails || [];
            setTotal(data.total || 0);

            setEmails(prev => {
                const existingUids = new Set(prev.map(e => e.uid));
                const unique = newEmails.filter(e => !existingUids.has(e.uid));
                return [...prev, ...unique];
            });
        } catch { /* ignore load-more errors */ }
    }, [currentFolder, searchQuery, emails.length]);

    // ─── Fetch folders ───────────────────────────────────────

    const fetchFolders = useCallback(async () => {
        try {
            const res = await fetch('/api/employee/email?action=folders');
            if (!res.ok) return;
            const data = await res.json();
            setFolders(data.folders || []);
        } catch {
            // Ignore folder fetch errors
        }
    }, []);

    // ─── Fetch unread count ──────────────────────────────────

    const fetchUnread = useCallback(async () => {
        try {
            const res = await fetch('/api/employee/email?action=unread');
            if (!res.ok) return;
            const data = await res.json();
            setUnreadCount(data.count || 0);
        } catch {
            // Ignore
        }
    }, []);

    // ─── Fetch AI drafts ──────────────────────────────────────

    const fetchDrafts = useCallback(async () => {
        try {
            const res = await fetch('/api/employee/email-drafts?status=all');
            if (!res.ok) return;
            const data = await res.json();
            setAiDrafts(data.drafts || []);
        } catch {
            // Ignore
        }
    }, []);

    const draftUidSet = new Set(
        aiDrafts.filter(d => d.status === 'pending').map(d => d.email_uid)
    );
    const allDraftUidSet = new Set(aiDrafts.map(d => d.email_uid));
    const pendingDraftsCount = aiDrafts.filter(d => d.status === 'pending').length;

    // Initial load
    useEffect(() => {
        fetchEmails();
    }, [fetchEmails]);

    useEffect(() => {
        fetchFolders();
        fetchUnread();
        fetchDrafts();
    }, []);

    // Auto-refresh every 60s
    useEffect(() => {
        refreshIntervalRef.current = setInterval(() => {
            fetchEmails(true);
            fetchUnread();
            fetchDrafts();
        }, 60000);
        return () => {
            if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
        };
    }, [fetchEmails, fetchUnread, fetchDrafts]);

    // ─── AI Draft handlers ───────────────────────────────────

    const handleDraftAction = async (draftId: string, action: 'send' | 'reject') => {
        setDraftSending(draftId);
        try {
            if (action === 'send') {
                const res = await fetch('/api/employee/email-drafts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: draftId }),
                });
                if (!res.ok) {
                    const data = await res.json();
                    throw new Error(data.error || 'Błąd wysyłki');
                }
                setDraftToast('✅ Mail wysłany!');
            } else {
                const res = await fetch('/api/employee/email-drafts', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: draftId, status: 'rejected' }),
                });
                if (!res.ok) throw new Error('Błąd odrzucenia');
                setDraftToast('Draft odrzucony');
            }
            await fetchDrafts();
        } catch (err: any) {
            setDraftToast(`❌ ${err.message}`);
        } finally {
            setDraftSending(null);
            setTimeout(() => setDraftToast(null), 3000);
        }
    };

    const handleDraftSave = async (draftId: string) => {
        try {
            const res = await fetch('/api/employee/email-drafts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: draftId, draft_html: editingDraftHtml }),
            });
            if (!res.ok) throw new Error('Błąd zapisu');
            setEditingDraftId(null);
            setDraftToast('✅ Zapisano zmiany');
            await fetchDrafts();
        } catch (err: any) {
            setDraftToast(`❌ ${err.message}`);
        } finally {
            setTimeout(() => setDraftToast(null), 3000);
        }
    };

    // ─── AI Config handlers ──────────────────────────────────

    const fetchAiConfig = useCallback(async () => {
        setAiConfigLoading(true);
        try {
            const res = await fetch('/api/employee/email-ai-config');
            if (!res.ok) return;
            const data = await res.json();
            setSenderRules(data.rules || []);
            setAiInstructions(data.instructions || []);
            setAiFeedback(data.feedback || []);
            setAiStats(data.stats || null);
            if (data.knowledgeBase) setKnowledgeBase(data.knowledgeBase);
        } catch { /* ignore */ } finally {
            setAiConfigLoading(false);
        }
    }, []);

    const addSenderRule = async () => {
        if (!newRulePattern.trim()) return;
        try {
            const res = await fetch('/api/employee/email-ai-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'rule', email_pattern: newRulePattern, rule_type: newRuleType, note: newRuleNote || null }),
            });
            if (!res.ok) throw new Error('Błąd');
            setNewRulePattern('');
            setNewRuleNote('');
            await fetchAiConfig();
        } catch { setDraftToast('❌ Nie udało się dodać reguły'); setTimeout(() => setDraftToast(null), 3000); }
    };

    const deleteSenderRule = async (id: string) => {
        try {
            await fetch(`/api/employee/email-ai-config?type=rule&id=${id}`, { method: 'DELETE' });
            await fetchAiConfig();
        } catch { /* ignore */ }
    };

    const addInstruction = async () => {
        if (!newInstruction.trim()) return;
        try {
            const res = await fetch('/api/employee/email-ai-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'instruction', instruction: newInstruction, category: newInstrCategory }),
            });
            if (!res.ok) throw new Error('Błąd');
            setNewInstruction('');
            await fetchAiConfig();
        } catch { setDraftToast('❌ Nie udało się dodać instrukcji'); setTimeout(() => setDraftToast(null), 3000); }
    };

    const toggleInstruction = async (id: string, currentActive: boolean) => {
        try {
            await fetch('/api/employee/email-ai-config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'instruction', id, is_active: !currentActive }),
            });
            await fetchAiConfig();
        } catch { /* ignore */ }
    };

    const deleteInstruction = async (id: string) => {
        try {
            await fetch(`/api/employee/email-ai-config?type=instruction&id=${id}`, { method: 'DELETE' });
            await fetchAiConfig();
        } catch { /* ignore */ }
    };

    const saveKnowledgeBase = async () => {
        setKnowledgeBaseSaving(true);
        try {
            const res = await fetch('/api/employee/email-ai-config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'knowledge_base', content: knowledgeBase }),
            });
            if (!res.ok) throw new Error('error');
            setDraftToast('✅ Baza wiedzy zapisana!');
            setKnowledgeBaseEditing(false);
        } catch {
            setDraftToast('❌ Nie udało się zapisać bazy wiedzy');
        } finally {
            setKnowledgeBaseSaving(false);
            setTimeout(() => setDraftToast(null), 3000);
        }
    };

    const handleReturnForLearning = async (draftId: string) => {
        setLearningDraftId(draftId);
        try {
            const draft = aiDrafts.find(d => d.id === draftId);
            const res = await fetch('/api/employee/email-drafts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: draftId,
                    action: 'return_for_learning',
                    draft_html: editingDraftHtml || draft?.draft_html,
                    admin_notes: learningNote,
                }),
            });
            if (!res.ok) throw new Error('Błąd');
            const data = await res.json();
            setDraftToast(`🧠 AI przeanalizowało poprawki!`);
            setEditingDraftId(null);
            setLearningNote('');
            await fetchDrafts();
        } catch (err: any) {
            setDraftToast(`❌ ${err.message}`);
        } finally {
            setLearningDraftId(null);
            setTimeout(() => setDraftToast(null), 4000);
        }
    };

    const handleRateDraft = async (draftId: string, rating: number) => {
        try {
            await fetch('/api/employee/email-drafts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: draftId, admin_rating: rating }),
            });
            await fetchDrafts();
        } catch { /* ignore */ }
    };

    const QUICK_TAGS = ['Za długi', 'Za formalny', 'Za krótki', 'Brak cennika', 'Złe dane', 'Idealny'];

    const handleTagDraft = async (draftId: string, tag: string) => {
        const draft = aiDrafts.find(d => d.id === draftId);
        const currentTags = draft?.admin_tags || [];
        const newTags = currentTags.includes(tag)
            ? currentTags.filter(t => t !== tag)
            : [...currentTags, tag];
        try {
            await fetch('/api/employee/email-drafts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: draftId, admin_tags: newTags }),
            });
            await fetchDrafts();
        } catch { /* ignore */ }
    };

    // ─── Open email ──────────────────────────────────────────

    const openEmail = async (uid: number) => {
        setEmailLoading(true);
        setSelectedEmail(null);
        try {
            const res = await fetch(`/api/employee/email?action=read&uid=${uid}&folder=${currentFolder}`);
            if (!res.ok) throw new Error('Nie udało się otworzyć wiadomości');
            const data = await res.json();
            setSelectedEmail(data);

            // Mark as read in the list
            setEmails(prev => prev.map(e => e.uid === uid ? { ...e, isRead: true } : e));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setEmailLoading(false);
        }
    };

    // ─── Toggle star ─────────────────────────────────────────

    const toggleStar = async (uid: number, currentStarred: boolean) => {
        const action = currentStarred ? 'unstar' : 'star';
        setEmails(prev => prev.map(e => e.uid === uid ? { ...e, isStarred: !currentStarred } : e));
        try {
            await fetch('/api/employee/email', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid, action, folder: currentFolder }),
            });
        } catch {
            // Revert
            setEmails(prev => prev.map(e => e.uid === uid ? { ...e, isStarred: currentStarred } : e));
        }
    };

    // ─── Toggle read/unread ──────────────────────────────────

    const toggleRead = async (uid: number, currentRead: boolean) => {
        const action = currentRead ? 'unread' : 'read';
        setEmails(prev => prev.map(e => e.uid === uid ? { ...e, isRead: !currentRead } : e));
        try {
            await fetch('/api/employee/email', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid, action, folder: currentFolder }),
            });
        } catch {
            setEmails(prev => prev.map(e => e.uid === uid ? { ...e, isRead: currentRead } : e));
        }
    };

    // ─── Move to trash ───────────────────────────────────────

    const trashEmail = async (uid: number) => {
        setEmails(prev => prev.filter(e => e.uid !== uid));
        if (selectedEmail?.uid === uid) setSelectedEmail(null);
        try {
            await fetch('/api/employee/email', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid, action: 'trash', folder: currentFolder }),
            });
        } catch {
            fetchEmails();
        }
    };

    // ─── Send email ──────────────────────────────────────────

    const handleSend = async () => {
        if (!composeTo || !composeSubject) return;
        setSending(true);
        setSendResult(null);
        try {
            const res = await fetch('/api/employee/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: composeTo,
                    cc: composeCc || undefined,
                    subject: composeSubject,
                    html: composeBody.replace(/\n/g, '<br>'),
                    inReplyTo: composeInReplyTo || undefined,
                    references: composeReferences.length ? composeReferences : undefined,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setSendResult({ success: true });
                // Delete compose draft if it exists
                if (composeDraftId) {
                    deleteComposeDraft(composeDraftId);
                }
                setTimeout(() => {
                    setShowCompose(false);
                    resetCompose();
                }, 1500);
            } else {
                setSendResult({ error: data.error || 'Błąd wysyłania' });
            }
        } catch (err: any) {
            setSendResult({ error: err.message || 'Błąd połączenia' });
        } finally {
            setSending(false);
        }
    };

    const resetCompose = () => {
        setComposeTo('');
        setComposeCc('');
        setComposeSubject('');
        setComposeBody('');
        setComposeInReplyTo('');
        setComposeReferences([]);
        setSendResult(null);
        setComposeAiDraftHtml('');
        setComposeAiOriginalText('');
        setComposeAiFeedbackRating(0);
        setComposeAiFeedbackTags([]);
        setComposeAiFeedbackResult(null);
        setComposeDraftId(null);
    };

    // ─── Compose Drafts (Robocze) ────────────────────────────

    const fetchComposeDrafts = useCallback(async () => {
        try {
            const res = await fetch('/api/employee/email-compose-drafts');
            if (res.ok) {
                const data = await res.json();
                setComposeDrafts(data.drafts || []);
            }
        } catch { /* silent */ }
    }, []);

    const saveComposeDraft = useCallback(async () => {
        if (composeDraftSavingRef.current) return;
        // Only save if there's meaningful content
        if (!composeTo && !composeSubject && !composeBody) return;
        composeDraftSavingRef.current = true;
        try {
            const res = await fetch('/api/employee/email-compose-drafts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: composeDraftId || undefined,
                    to_address: composeTo,
                    cc_address: composeCc,
                    subject: composeSubject,
                    body: composeBody,
                    in_reply_to: composeInReplyTo,
                    references: composeReferences,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.draft?.id) setComposeDraftId(data.draft.id);
                fetchComposeDrafts();
            }
        } catch { /* silent */ }
        composeDraftSavingRef.current = false;
    }, [composeTo, composeCc, composeSubject, composeBody, composeInReplyTo, composeReferences, composeDraftId, fetchComposeDrafts]);

    const deleteComposeDraft = useCallback(async (id: string) => {
        try {
            await fetch(`/api/employee/email-compose-drafts?id=${id}`, { method: 'DELETE' });
            setComposeDrafts(prev => prev.filter(d => d.id !== id));
        } catch { /* silent */ }
    }, []);

    const loadComposeDraft = (draft: any) => {
        setComposeDraftId(draft.id);
        setComposeTo(draft.to_address || '');
        setComposeCc(draft.cc_address || '');
        setComposeSubject(draft.subject || '');
        setComposeBody(draft.body || '');
        setComposeInReplyTo(draft.in_reply_to || '');
        setComposeReferences(draft.references || []);
        setSendResult(null);
        setShowCompose(true);
        setShowComposeDraftsList(false);
    };

    // Auto-save compose draft every 5 seconds
    useEffect(() => {
        if (!showCompose) return;
        if (composeDraftTimerRef.current) clearTimeout(composeDraftTimerRef.current);
        composeDraftTimerRef.current = setTimeout(() => {
            saveComposeDraft();
        }, 5000);
        return () => {
            if (composeDraftTimerRef.current) clearTimeout(composeDraftTimerRef.current);
        };
    }, [showCompose, composeTo, composeCc, composeSubject, composeBody, saveComposeDraft]);

    // Fetch compose drafts on mount
    useEffect(() => { fetchComposeDrafts(); }, [fetchComposeDrafts]);

    // ─── Label Overrides ─────────────────────────────────────

    const fetchLabelOverrides = useCallback(async () => {
        try {
            const res = await fetch('/api/employee/email-label-overrides');
            if (res.ok) {
                const data = await res.json();
                const map: Record<number, EmailLabel> = {};
                for (const o of (data.overrides || [])) {
                    map[o.email_uid] = o.label as EmailLabel;
                }
                setLabelOverrides(map);
            }
        } catch { /* silent */ }
    }, []);

    const setEmailLabel = useCallback(async (uid: number, label: EmailLabel) => {
        // Optimistic update
        setLabelOverrides(prev => ({ ...prev, [uid]: label }));
        setLabelPickerUid(null);
        try {
            await fetch('/api/employee/email-label-overrides', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email_uid: uid, email_folder: currentFolder, label }),
            });
        } catch {
            // Revert on error
            setLabelOverrides(prev => {
                const copy = { ...prev };
                delete copy[uid];
                return copy;
            });
        }
    }, [currentFolder]);

    const removeEmailLabelOverride = useCallback(async (uid: number) => {
        setLabelOverrides(prev => {
            const copy = { ...prev };
            delete copy[uid];
            return copy;
        });
        setLabelPickerUid(null);
        try {
            await fetch(`/api/employee/email-label-overrides?uid=${uid}&folder=${currentFolder}`, { method: 'DELETE' });
        } catch { /* silent */ }
    }, [currentFolder]);

    // Fetch label overrides on mount
    useEffect(() => { fetchLabelOverrides(); }, [fetchLabelOverrides]);

    // Helper: get effective label for an email
    const getEmailLabel = useCallback((email: { uid: number; from: { address: string; name: string }; subject: string }): EmailLabel => {
        if (labelOverrides[email.uid]) return labelOverrides[email.uid];
        return classifyEmail(email);
    }, [labelOverrides]);

    // ─── AI Generate Reply ──────────────────────────────────

    const generateAiReply = async () => {
        setComposeAiGenerating(true);
        setComposeAiDraftHtml('');
        try {
            const res = await fetch('/api/employee/email-generate-reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: composeSubject,
                    emailBody: composeBody,
                    from: composeTo,
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Błąd generowania');
            }
            const data = await res.json();
            if (data.draft_html) {
                setComposeAiDraftHtml(data.draft_html);
                // Convert HTML to plain text and prepend to compose body
                const plainText = data.draft_html
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<\/p>\s*<p>/gi, '\n\n')
                    .replace(/<[^>]*>/g, '')
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .trim();
                // Find the original message separator and insert AI text before it
                const separatorIdx = composeBody.indexOf('--- Oryginalna wiadomość ---');
                if (separatorIdx > 0) {
                    setComposeBody(plainText + '\n\n' + composeBody.substring(separatorIdx));
                } else {
                    setComposeBody(plainText + (composeBody ? '\n\n' + composeBody : ''));
                }
                // Save original text for feedback comparison
                setComposeAiOriginalText(plainText);
                setComposeAiFeedbackRating(0);
                setComposeAiFeedbackTags([]);
                setComposeAiFeedbackResult(null);
                setDraftToast('✅ AI wygenerowało propozycję odpowiedzi!');
            }
        } catch (err: any) {
            setDraftToast(`❌ ${err.message || 'Nie udało się wygenerować odpowiedzi'}`);
        } finally {
            setComposeAiGenerating(false);
            setTimeout(() => setDraftToast(null), 4000);
        }
    };

    // ─── Reply ───────────────────────────────────────────────

    const startReply = (email: EmailFull) => {
        setComposeTo(email.from.address);
        setComposeSubject(email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`);
        setComposeInReplyTo(email.messageId);
        setComposeReferences([...email.references, email.messageId].filter(Boolean));
        setComposeBody(`\n\n--- Oryginalna wiadomość ---\nOd: ${email.from.name || email.from.address}\nData: ${formatFullDate(email.date)}\n\n${email.text}`);
        setShowCompose(true);
    };

    const startForward = (email: EmailFull) => {
        setComposeTo('');
        setComposeSubject(email.subject.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`);
        setComposeBody(`\n\n--- Przekazana wiadomość ---\nOd: ${email.from.name || email.from.address} <${email.from.address}>\nData: ${formatFullDate(email.date)}\nTemat: ${email.subject}\n\n${email.text}`);
        setShowCompose(true);
    };

    // ─── Search ──────────────────────────────────────────────

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchQuery(searchInput);
        setPage(1);
    };

    // ─── Folder change ───────────────────────────────────────

    const changeFolder = (path: string) => {
        setCurrentFolder(path);
        setPage(1);
        setSearchQuery('');
        setSearchInput('');
        setSelectedEmail(null);
        setShowSidebar(false);
        setActiveLabel('all');
    };

    // ─── Download attachment ─────────────────────────────────

    const downloadAttachment = async (uid: number, index: number, filename: string) => {
        try {
            const res = await fetch(`/api/employee/email?action=attachment&uid=${uid}&index=${index}&folder=${currentFolder}`);
            if (!res.ok) throw new Error('Błąd pobierania');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            alert('Nie udało się pobrać załącznika');
        }
    };

    // ─── Key: filter relevant folders ────────────────────────

    const relevantFolders = folders.filter(f => {
        const p = f.path.toLowerCase();
        return p === 'inbox' || p.includes('sent') || p.includes('trash') || p.includes('draft') || p.includes('deleted');
    });
    // Ensure at least INBOX
    if (relevantFolders.length === 0) {
        relevantFolders.push({ path: 'INBOX', name: 'INBOX', totalMessages: 0, unseenMessages: unreadCount });
    }

    // ─── Label filtering (client-side, with overrides) ───────

    const filteredEmails = activeLabel === 'all'
        ? emails
        : emails.filter(e => getEmailLabel(e) === activeLabel);

    // Count per label
    const labelCounts: Record<EmailLabel, number> = {
        all: emails.length,
        wazne: 0,
        powiadomienia: 0,
        strona: 0,
        chat: 0,
        pozostale: 0,
    };
    for (const e of emails) {
        const lbl = getEmailLabel(e);
        labelCounts[lbl]++;
    }

    // ═══════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════

    return (
        <div style={{
            display: 'flex',
            height: 'calc(100vh - 120px)',
            overflow: 'hidden',
            position: 'relative',
        }}>
            {/* ─── SIDEBAR ─────────────────────────────────────── */}
            <div style={{
                width: isMobileView ? '100%' : 220,
                minWidth: isMobileView ? '100%' : 220,
                background: 'rgba(0,0,0,0.2)',
                borderRight: isMobileView ? 'none' : '1px solid rgba(255,255,255,0.06)',
                display: isMobileView ? (showSidebar ? 'flex' : 'none') : 'flex',
                flexDirection: 'column',
                padding: '1rem 0.75rem',
                gap: '0.25rem',
                position: isMobileView ? 'absolute' : 'relative',
                inset: isMobileView ? 0 : undefined,
                zIndex: isMobileView ? 100 : 1,
            }}>
                {/* Compose button */}
                <button
                    onClick={() => { setShowCompose(true); resetCompose(); setShowSidebar(false); }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.7rem 1rem',
                        background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                        border: 'none',
                        borderRadius: '0.75rem',
                        color: '#fff',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginBottom: '0.75rem',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 16px rgba(56,189,248,0.3)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(56,189,248,0.4)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(56,189,248,0.3)'; }}
                >
                    <Send size={16} />
                    Nowa wiadomość
                </button>

                {/* Folder list */}
                {relevantFolders.map(f => {
                    const isActive = currentFolder === f.path;
                    return (
                        <button
                            key={f.path}
                            onClick={() => changeFolder(f.path)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 0.75rem',
                                background: isActive ? 'rgba(56,189,248,0.12)' : 'transparent',
                                border: 'none',
                                borderRadius: '0.5rem',
                                color: isActive ? '#38bdf8' : 'rgba(255,255,255,0.6)',
                                fontSize: '0.82rem',
                                fontWeight: isActive ? 600 : 400,
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => !isActive && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                            onMouseLeave={e => !isActive && (e.currentTarget.style.background = 'transparent')}
                        >
                            {getFolderIcon(f.path)}
                            <span style={{ flex: 1 }}>{getFolderLabel(f.path, f.name)}</span>
                            {f.unseenMessages > 0 && (
                                <span style={{
                                    background: '#38bdf8',
                                    color: '#0a0a0a',
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: '1rem',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    minWidth: 18,
                                    textAlign: 'center',
                                }}>{f.unseenMessages}</span>
                            )}
                        </button>
                    );
                })}

                {/* Robocze (Compose Drafts) */}
                <button
                    onClick={() => setShowComposeDraftsList(!showComposeDraftsList)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        background: showComposeDraftsList ? 'rgba(168,85,247,0.12)' : 'transparent',
                        border: 'none',
                        borderRadius: '0.5rem',
                        color: showComposeDraftsList ? '#a855f7' : 'rgba(255,255,255,0.6)',
                        fontSize: '0.82rem',
                        fontWeight: showComposeDraftsList ? 600 : 400,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                        marginTop: '0.25rem',
                    }}
                >
                    <FileText size={16} />
                    <span style={{ flex: 1 }}>Robocze</span>
                    {composeDrafts.length > 0 && (
                        <span style={{
                            background: '#a855f7',
                            color: '#fff',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '1rem',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            minWidth: 18,
                            textAlign: 'center',
                        }}>{composeDrafts.length}</span>
                    )}
                </button>

                {/* Compose Drafts List */}
                {showComposeDraftsList && (
                    <div style={{
                        padding: '0.25rem 0',
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        marginTop: '0.25rem',
                    }}>
                        {composeDrafts.length === 0 ? (
                            <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
                                Brak szkiców
                            </div>
                        ) : composeDrafts.map(draft => (
                            <div
                                key={draft.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    padding: '0.35rem 0.75rem',
                                    cursor: 'pointer',
                                    fontSize: '0.75rem',
                                    color: 'rgba(255,255,255,0.5)',
                                    borderRadius: '0.3rem',
                                    transition: 'background 0.15s',
                                }}
                                onClick={() => loadComposeDraft(draft)}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <FileText size={12} style={{ flexShrink: 0, color: '#a855f7' }} />
                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {draft.subject || draft.to_address || '(bez tematu)'}
                                </span>
                                <button
                                    onClick={e => { e.stopPropagation(); deleteComposeDraft(draft.id); }}
                                    style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        padding: '0.1rem', color: 'rgba(255,255,255,0.2)',
                                        flexShrink: 0,
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
                                    title="Usuń szkic"
                                >
                                    <Trash2 size={11} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {isMobileView && (
                    <button
                        onClick={() => setShowSidebar(false)}
                        style={{
                            marginTop: 'auto',
                            padding: '0.6rem',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '0.5rem',
                            color: 'rgba(255,255,255,0.6)',
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                        }}
                    >✕ Zamknij</button>
                )}
            </div>

            {/* ─── MAIN CONTENT ────────────────────────────────── */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}>
                {/* Toolbar */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(0,0,0,0.1)',
                    flexWrap: 'wrap',
                }}>
                    {isMobileView && (
                        <button
                            onClick={() => selectedEmail ? setSelectedEmail(null) : setShowSidebar(true)}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '0.4rem',
                                padding: '0.35rem 0.5rem',
                                color: 'rgba(255,255,255,0.7)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            {selectedEmail ? <ArrowLeft size={16} /> : <Mail size={16} />}
                        </button>
                    )}

                    {/* Search */}
                    <form onSubmit={handleSearch} style={{ flex: 1, display: 'flex', gap: '0.35rem', minWidth: 150 }}>
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            background: 'rgba(255,255,255,0.06)',
                            borderRadius: '0.5rem',
                            border: '1px solid rgba(255,255,255,0.08)',
                            padding: '0 0.6rem',
                        }}>
                            <Search size={14} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                            <input
                                type="text"
                                placeholder="Szukaj wiadomości..."
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: '#fff',
                                    padding: '0.4rem 0.5rem',
                                    fontSize: '0.82rem',
                                }}
                            />
                            {searchInput && (
                                <button
                                    type="button"
                                    onClick={() => { setSearchInput(''); setSearchQuery(''); }}
                                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '0.2rem' }}
                                ><X size={14} /></button>
                            )}
                        </div>
                    </form>

                    {/* Refresh */}
                    <button
                        onClick={() => fetchEmails()}
                        disabled={loading}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '0.4rem',
                            padding: '0.35rem 0.5rem',
                            color: 'rgba(255,255,255,0.6)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                        }}
                        title="Odśwież"
                    >
                        <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                    </button>

                    {/* AI Drafts button */}
                    <button
                        onClick={() => setShowDraftsPanel(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.35rem 0.7rem',
                            background: pendingDraftsCount > 0 ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.05)',
                            border: pendingDraftsCount > 0 ? '1px solid rgba(168,85,247,0.3)' : '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '0.4rem',
                            color: pendingDraftsCount > 0 ? '#a855f7' : 'rgba(255,255,255,0.5)',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: pendingDraftsCount > 0 ? 600 : 400,
                            transition: 'all 0.2s',
                        }}
                        title="Drafty AI"
                    >
                        <Sparkles size={13} />
                        <span>{isMobileView ? 'AI' : 'Drafty AI'}</span>
                        {pendingDraftsCount > 0 && (
                            <span style={{
                                fontSize: '0.6rem',
                                padding: '0.05rem 0.35rem',
                                borderRadius: '1rem',
                                background: '#a855f7',
                                color: '#fff',
                                fontWeight: 700,
                                minWidth: 16,
                                textAlign: 'center' as const,
                                lineHeight: 1.4,
                            }}>{pendingDraftsCount}</span>
                        )}
                    </button>

                    {/* Folder name */}
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
                        {getFolderLabel(currentFolder, currentFolder)} ({activeLabel === 'all' ? total : filteredEmails.length})
                    </span>
                </div>

                {/* ─── Gmail-style Category Tabs ──────────────── */}
                {currentFolder === 'INBOX' && !selectedEmail && (
                    <div style={{
                        display: 'flex',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        background: 'rgba(0,0,0,0.05)',
                        overflowX: 'auto',
                        scrollbarWidth: 'none',
                    }}>
                        {EMAIL_LABELS.map(lbl => {
                            const isActive = activeLabel === lbl.id;
                            const count = labelCounts[lbl.id];
                            const hasUnread = lbl.id !== 'all' && emails.some(e => !e.isRead && classifyEmail(e) === lbl.id);
                            return (
                                <button
                                    key={lbl.id}
                                    onClick={() => setActiveLabel(lbl.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        padding: '0.65rem 1rem',
                                        background: 'transparent',
                                        border: 'none',
                                        borderBottom: isActive ? `2px solid ${lbl.color}` : '2px solid transparent',
                                        color: isActive ? lbl.color : 'rgba(255,255,255,0.45)',
                                        fontSize: '0.8rem',
                                        fontWeight: isActive ? 600 : 400,
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        transition: 'all 0.2s',
                                        position: 'relative',
                                        flexShrink: 0,
                                    }}
                                    onMouseEnter={e => !isActive && (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                                    onMouseLeave={e => !isActive && (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
                                >
                                    {lbl.icon}
                                    <span>{isMobileView ? lbl.shortLabel : lbl.label}</span>
                                    {count > 0 && lbl.id !== 'all' && (
                                        <span style={{
                                            fontSize: '0.65rem',
                                            padding: '0.05rem 0.35rem',
                                            borderRadius: '1rem',
                                            background: isActive ? `${lbl.color}20` : 'rgba(255,255,255,0.06)',
                                            color: isActive ? lbl.color : 'rgba(255,255,255,0.3)',
                                            fontWeight: 500,
                                            lineHeight: 1.4,
                                        }}>{count}</span>
                                    )}
                                    {hasUnread && !isActive && (
                                        <span style={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            background: lbl.color,
                                            position: 'absolute',
                                            top: 8,
                                            right: 4,
                                        }} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Content: Email List OR Email Reader */}
                <div style={{ flex: 1, overflow: 'auto' }}>
                    {/* ─── EMAIL READER ──────────────────────────── */}
                    {selectedEmail ? (
                        <div style={{ padding: isMobileView ? '0.75rem' : '1.5rem', maxWidth: 900 }}>
                            {/* Back button (desktop) */}
                            {!isMobileView && (
                                <button
                                    onClick={() => setSelectedEmail(null)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        background: 'none',
                                        border: 'none',
                                        color: '#38bdf8',
                                        cursor: 'pointer',
                                        fontSize: '0.82rem',
                                        marginBottom: '1rem',
                                        padding: 0,
                                    }}
                                >
                                    <ArrowLeft size={16} /> Powrót do listy
                                </button>
                            )}

                            {/* Subject */}
                            <h2 style={{
                                fontSize: '1.3rem',
                                fontWeight: 700,
                                color: '#fff',
                                margin: '0 0 0.75rem',
                                lineHeight: 1.3,
                            }}>
                                {selectedEmail.subject}
                            </h2>

                            {/* Sender info */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.75rem',
                                marginBottom: '1rem',
                                padding: '0.75rem',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '0.5rem',
                                border: '1px solid rgba(255,255,255,0.06)',
                            }}>
                                {/* Avatar */}
                                <div style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1rem',
                                    fontWeight: 700,
                                    color: '#fff',
                                    flexShrink: 0,
                                }}>
                                    {(selectedEmail.from.name || selectedEmail.from.address)[0]?.toUpperCase() || '?'}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.9rem' }}>
                                        {selectedEmail.from.name || selectedEmail.from.address}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                                        &lt;{selectedEmail.from.address}&gt;
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.15rem' }}>
                                        Do: {selectedEmail.to.map(t => t.address).join(', ')}
                                        {selectedEmail.cc.length > 0 && ` | CC: ${selectedEmail.cc.map(c => c.address).join(', ')}`}
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
                                    {formatFullDate(selectedEmail.date)}
                                </div>
                            </div>

                            {/* Attachments */}
                            {selectedEmail.attachments.length > 0 && (
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '0.5rem',
                                    marginBottom: '1rem',
                                }}>
                                    {selectedEmail.attachments.map((att, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => downloadAttachment(selectedEmail.uid, idx, att.filename)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                padding: '0.4rem 0.7rem',
                                                background: 'rgba(56,189,248,0.08)',
                                                border: '1px solid rgba(56,189,248,0.2)',
                                                borderRadius: '0.4rem',
                                                color: '#38bdf8',
                                                cursor: 'pointer',
                                                fontSize: '0.78rem',
                                                transition: 'all 0.15s',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(56,189,248,0.15)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(56,189,248,0.08)'; }}
                                        >
                                            <Paperclip size={13} />
                                            <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {att.filename}
                                            </span>
                                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>
                                                ({formatSize(att.size)})
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Email body */}
                            <div
                                style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: '0.5rem',
                                    padding: '1.25rem',
                                    fontSize: '0.88rem',
                                    lineHeight: 1.65,
                                    color: 'rgba(255,255,255,0.85)',
                                    overflowWrap: 'break-word',
                                    wordBreak: 'break-word',
                                }}
                                dangerouslySetInnerHTML={{
                                    __html: selectedEmail.html
                                        ? sanitizeHtml(selectedEmail.html)
                                        : selectedEmail.text.replace(/\n/g, '<br>'),
                                }}
                            />

                            {/* Action buttons */}
                            <div style={{
                                display: 'flex',
                                gap: '0.6rem',
                                marginTop: '1rem',
                                flexWrap: 'wrap',
                            }}>
                                <button
                                    onClick={() => startReply(selectedEmail)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(56,189,248,0.1)',
                                        border: '1px solid rgba(56,189,248,0.25)',
                                        borderRadius: '0.5rem',
                                        color: '#38bdf8',
                                        cursor: 'pointer',
                                        fontSize: '0.82rem',
                                        fontWeight: 500,
                                    }}
                                >
                                    <Reply size={14} /> Odpowiedz
                                </button>
                                <button
                                    onClick={() => startForward(selectedEmail)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '0.5rem',
                                        color: 'rgba(255,255,255,0.6)',
                                        cursor: 'pointer',
                                        fontSize: '0.82rem',
                                    }}
                                >
                                    <Forward size={14} /> Prześlij dalej
                                </button>
                                <button
                                    onClick={() => trashEmail(selectedEmail.uid)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(239,68,68,0.08)',
                                        border: '1px solid rgba(239,68,68,0.2)',
                                        borderRadius: '0.5rem',
                                        color: '#ef4444',
                                        cursor: 'pointer',
                                        fontSize: '0.82rem',
                                    }}
                                >
                                    <Trash2 size={14} /> Usuń
                                </button>
                                <button
                                    onClick={() => toggleRead(selectedEmail.uid, selectedEmail.isRead)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '0.5rem',
                                        color: 'rgba(255,255,255,0.6)',
                                        cursor: 'pointer',
                                        fontSize: '0.82rem',
                                    }}
                                >
                                    {selectedEmail.isRead ? <Mail size={14} /> : <MailOpen size={14} />}
                                    {selectedEmail.isRead ? 'Oznacz jako nieprzeczytaną' : 'Oznacz jako przeczytaną'}
                                </button>
                                {/* Label picker */}
                                <div style={{ position: 'relative' }}>
                                    <button
                                        onClick={() => setLabelPickerUid(labelPickerUid === selectedEmail.uid ? null : selectedEmail.uid)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem',
                                            padding: '0.5rem 1rem',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '0.5rem',
                                            color: 'rgba(255,255,255,0.6)',
                                            cursor: 'pointer',
                                            fontSize: '0.82rem',
                                        }}
                                    >
                                        <Tag size={14} />
                                        Zmień etykietę
                                        <ChevronDown size={12} />
                                    </button>
                                    {labelPickerUid === selectedEmail.uid && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            marginTop: '0.25rem',
                                            background: '#1e293b',
                                            border: '1px solid rgba(255,255,255,0.12)',
                                            borderRadius: '0.5rem',
                                            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                                            zIndex: 50,
                                            minWidth: 180,
                                            padding: '0.25rem',
                                        }}>
                                            {(['wazne', 'powiadomienia', 'strona', 'chat', 'pozostale'] as EmailLabel[]).map(lbl => {
                                                const currentLabel = getEmailLabel(selectedEmail);
                                                const isActive = currentLabel === lbl;
                                                const labelNames: Record<EmailLabel, string> = {
                                                    all: 'Wszystkie',
                                                    wazne: '⭐ Ważne',
                                                    powiadomienia: '🔔 Powiadomienia',
                                                    strona: '🌐 Ze strony',
                                                    chat: '💬 Chat',
                                                    pozostale: '📁 Pozostałe',
                                                };
                                                return (
                                                    <button
                                                        key={lbl}
                                                        onClick={() => setEmailLabel(selectedEmail.uid, lbl)}
                                                        style={{
                                                            display: 'block',
                                                            width: '100%',
                                                            textAlign: 'left',
                                                            padding: '0.4rem 0.75rem',
                                                            background: isActive ? 'rgba(56,189,248,0.12)' : 'transparent',
                                                            border: 'none',
                                                            borderRadius: '0.3rem',
                                                            color: isActive ? '#38bdf8' : 'rgba(255,255,255,0.7)',
                                                            cursor: 'pointer',
                                                            fontSize: '0.8rem',
                                                            fontWeight: isActive ? 600 : 400,
                                                            transition: 'background 0.15s',
                                                        }}
                                                        onMouseEnter={e => !isActive && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                                                        onMouseLeave={e => !isActive && (e.currentTarget.style.background = 'transparent')}
                                                    >
                                                        {labelNames[lbl]}
                                                    </button>
                                                );
                                            })}
                                            {labelOverrides[selectedEmail.uid] && (
                                                <>
                                                    <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '0.25rem 0' }} />
                                                    <button
                                                        onClick={() => removeEmailLabelOverride(selectedEmail.uid)}
                                                        style={{
                                                            display: 'block',
                                                            width: '100%',
                                                            textAlign: 'left',
                                                            padding: '0.4rem 0.75rem',
                                                            background: 'transparent',
                                                            border: 'none',
                                                            borderRadius: '0.3rem',
                                                            color: 'rgba(255,255,255,0.4)',
                                                            cursor: 'pointer',
                                                            fontSize: '0.75rem',
                                                            fontStyle: 'italic',
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                    >
                                                        ↩️ Przywróć auto-etykietę
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : emailLoading ? (
                        /* Loading email */
                        <div style={{ padding: '3rem', textAlign: 'center' }}>
                            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', color: '#38bdf8' }} />
                            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.75rem' }}>Ładowanie wiadomości...</p>
                        </div>
                    ) : error ? (
                        /* Error */
                        <div style={{
                            padding: '3rem',
                            textAlign: 'center',
                        }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
                            <p style={{ color: '#ef4444', fontSize: '0.88rem', fontWeight: 600 }}>Błąd</p>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', marginBottom: '1rem' }}>{error}</p>
                            <button
                                onClick={() => { setError(null); fetchEmails(); }}
                                style={{
                                    padding: '0.5rem 1.2rem',
                                    background: 'rgba(56,189,248,0.1)',
                                    border: '1px solid rgba(56,189,248,0.25)',
                                    borderRadius: '0.5rem',
                                    color: '#38bdf8',
                                    cursor: 'pointer',
                                    fontSize: '0.82rem',
                                }}
                            >Spróbuj ponownie</button>
                        </div>
                    ) : loading ? (
                        /* Loading list */
                        <div style={{ padding: '2rem 1rem' }}>
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} style={{
                                    display: 'flex',
                                    gap: '0.75rem',
                                    padding: '0.75rem 1rem',
                                    marginBottom: '0.25rem',
                                    borderRadius: '0.5rem',
                                }}>
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.5s infinite' }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ height: 14, width: '40%', background: 'rgba(255,255,255,0.06)', borderRadius: 4, marginBottom: 6, animation: 'pulse 1.5s infinite' }} />
                                        <div style={{ height: 12, width: '70%', background: 'rgba(255,255,255,0.04)', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : emails.length === 0 ? (
                        /* Empty */
                        <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '0.75rem', opacity: 0.4 }}>📭</div>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                                {searchQuery ? 'Brak wyników wyszukiwania' : 'Brak wiadomości w tym folderze'}
                            </p>
                        </div>
                    ) : (
                        /* ─── EMAIL LIST ──────────────────────────── */
                        <>
                            {filteredEmails.map(email => {
                                const emailLabel = classifyEmail(email);
                                const labelDef = getLabelDef(emailLabel);
                                return (
                                    <div
                                        key={email.uid}
                                        onClick={() => openEmail(email.uid)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.6rem',
                                            padding: '0.65rem 1rem',
                                            cursor: 'pointer',
                                            background: email.isRead ? 'transparent' : 'rgba(56,189,248,0.03)',
                                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                        onMouseLeave={e => e.currentTarget.style.background = email.isRead ? 'transparent' : 'rgba(56,189,248,0.03)'}
                                    >
                                        {/* Unread dot */}
                                        <div style={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: '50%',
                                            background: email.isRead ? 'transparent' : '#38bdf8',
                                            flexShrink: 0,
                                        }} />

                                        {/* Star */}
                                        <button
                                            onClick={e => { e.stopPropagation(); toggleStar(email.uid, email.isStarred); }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '0.15rem',
                                                color: email.isStarred ? '#f59e0b' : 'rgba(255,255,255,0.15)',
                                                fontSize: '1rem',
                                                flexShrink: 0,
                                                transition: 'color 0.15s',
                                            }}
                                        >
                                            <Star size={15} fill={email.isStarred ? '#f59e0b' : 'none'} />
                                        </button>

                                        {/* Avatar */}
                                        <div style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: '50%',
                                            background: email.isRead
                                                ? 'rgba(255,255,255,0.08)'
                                                : 'linear-gradient(135deg, #38bdf8, #818cf8)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            color: '#fff',
                                            flexShrink: 0,
                                        }}>
                                            {senderDisplay(email.from)[0]?.toUpperCase() || '?'}
                                        </div>

                                        {/* Label badge */}
                                        <span
                                            title={labelDef.label}
                                            style={{
                                                padding: '0.1rem 0.35rem',
                                                borderRadius: '0.25rem',
                                                fontSize: '0.6rem',
                                                fontWeight: 600,
                                                background: `${labelDef.color}15`,
                                                color: labelDef.color,
                                                whiteSpace: 'nowrap',
                                                flexShrink: 0,
                                                lineHeight: 1.3,
                                            }}
                                        >
                                            {labelDef.shortLabel}
                                        </span>

                                        {/* Sender + Subject */}
                                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                            <div style={{
                                                fontSize: '0.82rem',
                                                fontWeight: email.isRead ? 400 : 600,
                                                color: email.isRead ? 'rgba(255,255,255,0.6)' : '#fff',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}>
                                                {senderDisplay(email.from)}
                                            </div>
                                            <div style={{
                                                fontSize: '0.78rem',
                                                color: email.isRead ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.55)',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                            }}>
                                                {email.subject}
                                            </div>
                                        </div>

                                        {/* AI Draft indicator */}
                                        {draftUidSet.has(email.uid) && (
                                            <span
                                                title="AI wygenerował draft odpowiedzi"
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.2rem',
                                                    padding: '0.1rem 0.35rem',
                                                    borderRadius: '0.25rem',
                                                    fontSize: '0.58rem',
                                                    fontWeight: 600,
                                                    background: 'rgba(168,85,247,0.15)',
                                                    color: '#a855f7',
                                                    flexShrink: 0,
                                                    lineHeight: 1.3,
                                                    border: '1px solid rgba(168,85,247,0.2)',
                                                }}
                                            >
                                                <Sparkles size={9} />
                                                AI
                                            </span>
                                        )}
                                        {allDraftUidSet.has(email.uid) && !draftUidSet.has(email.uid) && (
                                            <span
                                                title={`Draft ${aiDrafts.find(d => d.email_uid === email.uid)?.status === 'sent' ? 'wysłany' : 'przetworzony'}`}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.15rem',
                                                    padding: '0.1rem 0.3rem',
                                                    borderRadius: '0.25rem',
                                                    fontSize: '0.55rem',
                                                    fontWeight: 500,
                                                    background: 'rgba(74,222,128,0.1)',
                                                    color: 'rgba(74,222,128,0.6)',
                                                    flexShrink: 0,
                                                    lineHeight: 1.3,
                                                }}
                                            >
                                                <Sparkles size={8} />
                                                ✓
                                            </span>
                                        )}

                                        {/* Attachment icon */}
                                        {email.hasAttachments && (
                                            <Paperclip size={13} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
                                        )}

                                        {/* Date */}
                                        <span style={{
                                            fontSize: '0.72rem',
                                            color: email.isRead ? 'rgba(255,255,255,0.3)' : '#38bdf8',
                                            fontWeight: email.isRead ? 400 : 600,
                                            whiteSpace: 'nowrap',
                                            flexShrink: 0,
                                        }}>
                                            {formatDate(email.date)}
                                        </span>

                                        {/* Read/Unread toggle */}
                                        <button
                                            onClick={e => { e.stopPropagation(); toggleRead(email.uid, email.isRead); }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '0.2rem',
                                                color: 'rgba(255,255,255,0.15)',
                                                flexShrink: 0,
                                                transition: 'color 0.15s',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.color = '#38bdf8'}
                                            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.15)'}
                                            title={email.isRead ? 'Oznacz jako nieprzeczytaną' : 'Oznacz jako przeczytaną'}
                                        >
                                            {email.isRead ? <Mail size={14} /> : <MailOpen size={14} />}
                                        </button>

                                        {/* Trash button */}
                                        <button
                                            onClick={e => { e.stopPropagation(); trashEmail(email.uid); }}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '0.2rem',
                                                color: 'rgba(255,255,255,0.15)',
                                                flexShrink: 0,
                                                transition: 'color 0.15s',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.15)'}
                                            title="Usuń"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                );
                            })}

                            {/* Load more */}
                            {total > emails.length && (
                                <div style={{ padding: '1rem', textAlign: 'center' }}>
                                    <button
                                        onClick={loadMoreEmails}
                                        style={{
                                            padding: '0.5rem 1.5rem',
                                            background: 'rgba(56,189,248,0.1)',
                                            border: '1px solid rgba(56,189,248,0.2)',
                                            borderRadius: '0.5rem',
                                            color: '#38bdf8',
                                            cursor: 'pointer',
                                            fontSize: '0.82rem',
                                        }}
                                    >
                                        Załaduj więcej ({total - emails.length > 0 ? `pozostało ${total - emails.length}` : ''})
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ─── COMPOSE MODAL ────────────────────────────────── */}
            {showCompose && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(6px)',
                    zIndex: 5000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #0d1b2a, #1b2838)',
                        border: '1px solid rgba(56,189,248,0.2)',
                        borderRadius: '1rem',
                        width: '100%',
                        maxWidth: 600,
                        maxHeight: '85vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '0.85rem 1.25rem',
                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#38bdf8' }}>
                                {composeInReplyTo ? '↩️ Odpowiedz' : '✉️ Nowa wiadomość'}
                            </h3>
                            <button
                                onClick={() => { setShowCompose(false); resetCompose(); }}
                                style={{
                                    background: 'rgba(255,255,255,0.08)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: '0.4rem',
                                    width: 28,
                                    height: 28,
                                    color: '#fff',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.85rem',
                                }}
                            >✕</button>
                        </div>

                        {/* Form */}
                        <div style={{ padding: '1rem 1.25rem', flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', width: 40, flexShrink: 0 }}>Do:</label>
                                <input
                                    value={composeTo}
                                    onChange={e => setComposeTo(e.target.value)}
                                    placeholder="adres@email.com"
                                    style={{
                                        flex: 1,
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '0.4rem',
                                        padding: '0.45rem 0.7rem',
                                        color: '#fff',
                                        fontSize: '0.85rem',
                                        outline: 'none',
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', width: 40, flexShrink: 0 }}>CC:</label>
                                <input
                                    value={composeCc}
                                    onChange={e => setComposeCc(e.target.value)}
                                    placeholder="opcjonalnie"
                                    style={{
                                        flex: 1,
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '0.4rem',
                                        padding: '0.45rem 0.7rem',
                                        color: '#fff',
                                        fontSize: '0.85rem',
                                        outline: 'none',
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', width: 40, flexShrink: 0 }}>Temat:</label>
                                <input
                                    value={composeSubject}
                                    onChange={e => setComposeSubject(e.target.value)}
                                    placeholder="Temat wiadomości"
                                    style={{
                                        flex: 1,
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '0.4rem',
                                        padding: '0.45rem 0.7rem',
                                        color: '#fff',
                                        fontSize: '0.85rem',
                                        outline: 'none',
                                    }}
                                />
                            </div>
                            <textarea
                                value={composeBody}
                                onChange={e => setComposeBody(e.target.value)}
                                placeholder="Treść wiadomości..."
                                rows={12}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '0.5rem',
                                    padding: '0.75rem',
                                    color: '#fff',
                                    fontSize: '0.85rem',
                                    resize: 'vertical',
                                    outline: 'none',
                                    flex: 1,
                                    minHeight: 150,
                                    lineHeight: 1.6,
                                }}
                            />

                            {/* Send result */}
                            {sendResult && (
                                <div style={{
                                    padding: '0.5rem 0.75rem',
                                    borderRadius: '0.4rem',
                                    fontSize: '0.82rem',
                                    background: sendResult.success ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
                                    color: sendResult.success ? '#4ade80' : '#ef4444',
                                    border: `1px solid ${sendResult.success ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}`,
                                }}>
                                    {sendResult.success ? '✅ Wiadomość wysłana!' : `❌ ${sendResult.error}`}
                                </div>
                            )}
                        </div>

                        {/* AI Feedback Bar */}
                        {composeAiOriginalText && (
                            <div style={{
                                padding: '0.6rem 1.25rem',
                                borderTop: '1px solid rgba(168,85,247,0.15)',
                                background: 'rgba(168,85,247,0.04)',
                            }}>
                                {/* Star rating */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                    <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>Oceń AI:</span>
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <button
                                            key={star}
                                            onClick={() => setComposeAiFeedbackRating(star)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: '1.1rem',
                                                padding: '0 0.1rem',
                                                opacity: star <= composeAiFeedbackRating ? 1 : 0.3,
                                                filter: star <= composeAiFeedbackRating ? 'none' : 'grayscale(1)',
                                                transition: 'all 0.15s',
                                            }}
                                        >⭐</button>
                                    ))}
                                </div>

                                {/* Quick tags */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.4rem' }}>
                                    {['Za długi', 'Za formalny', 'Za krótki', 'Brak cennika', 'Złe dane', 'Idealny'].map(tag => {
                                        const isActive = composeAiFeedbackTags.includes(tag);
                                        return (
                                            <button
                                                key={tag}
                                                onClick={() => setComposeAiFeedbackTags(prev =>
                                                    isActive ? prev.filter(t => t !== tag) : [...prev, tag]
                                                )}
                                                style={{
                                                    padding: '0.2rem 0.5rem',
                                                    borderRadius: '1rem',
                                                    fontSize: '0.72rem',
                                                    cursor: 'pointer',
                                                    border: `1px solid ${isActive ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.1)'}`,
                                                    background: isActive ? 'rgba(168,85,247,0.15)' : 'transparent',
                                                    color: isActive ? '#a855f7' : 'rgba(255,255,255,0.5)',
                                                    transition: 'all 0.15s',
                                                }}
                                            >{tag}</button>
                                        );
                                    })}
                                </div>

                                {/* Learn button */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <button
                                        disabled={composeAiFeedbackSending}
                                        onClick={async () => {
                                            setComposeAiFeedbackSending(true);
                                            setComposeAiFeedbackResult(null);
                                            try {
                                                // Extract current compose text (before separator)
                                                const sep = composeBody.indexOf('--- Oryginalna wiadomość ---');
                                                const currentText = sep > 0 ? composeBody.substring(0, sep).trim() : composeBody.trim();
                                                const res = await fetch('/api/employee/email-drafts', {
                                                    method: 'PUT',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        id: 'compose', // dummy — handled by learn_from_compose action
                                                        action: 'learn_from_compose',
                                                        original_html: composeAiOriginalText,
                                                        corrected_html: currentText,
                                                        rating: composeAiFeedbackRating || undefined,
                                                        tags: composeAiFeedbackTags.length > 0 ? composeAiFeedbackTags : undefined,
                                                        feedback_note: [
                                                            composeAiFeedbackTags.length > 0 ? `Tagi: ${composeAiFeedbackTags.join(', ')}` : '',
                                                            composeAiFeedbackRating > 0 ? `Ocena: ${composeAiFeedbackRating}/5` : '',
                                                        ].filter(Boolean).join(' | ') || undefined,
                                                    }),
                                                });
                                                const data = await res.json();
                                                if (data.success) {
                                                    setComposeAiFeedbackResult(`✅ Zapisano feedback! ${data.ai_analysis ? 'Analiza: ' + data.ai_analysis.substring(0, 100) + '...' : ''}`);
                                                } else {
                                                    setComposeAiFeedbackResult(`❌ ${data.error || 'Błąd zapisu'}`);
                                                }
                                            } catch (err: any) {
                                                setComposeAiFeedbackResult(`❌ ${err.message}`);
                                            } finally {
                                                setComposeAiFeedbackSending(false);
                                            }
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.3rem',
                                            padding: '0.35rem 0.75rem',
                                            background: composeAiFeedbackSending ? 'rgba(168,85,247,0.1)' : 'rgba(168,85,247,0.15)',
                                            border: '1px solid rgba(168,85,247,0.3)',
                                            borderRadius: '0.4rem',
                                            color: '#a855f7',
                                            cursor: composeAiFeedbackSending ? 'not-allowed' : 'pointer',
                                            fontSize: '0.78rem',
                                            fontWeight: 600,
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        {composeAiFeedbackSending ? '⏳' : '🧠'}
                                        {composeAiFeedbackSending ? 'Zapisuję...' : 'Ucz AI'}
                                    </button>
                                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>
                                        Wyedytuj tekst powyżej, oceń i kliknij &quot;Ucz AI&quot;
                                    </span>
                                </div>

                                {/* Feedback result */}
                                {composeAiFeedbackResult && (
                                    <div style={{
                                        marginTop: '0.4rem',
                                        padding: '0.35rem 0.6rem',
                                        borderRadius: '0.3rem',
                                        fontSize: '0.75rem',
                                        background: composeAiFeedbackResult.startsWith('✅') ? 'rgba(74,222,128,0.08)' : 'rgba(239,68,68,0.08)',
                                        color: composeAiFeedbackResult.startsWith('✅') ? '#4ade80' : '#ef4444',
                                        border: `1px solid ${composeAiFeedbackResult.startsWith('✅') ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)'}`,
                                    }}>
                                        {composeAiFeedbackResult}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Footer */}
                        <div style={{
                            padding: '0.75rem 1.25rem',
                            borderTop: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}>
                            {/* AI Generate button — left side */}
                            <div>
                                {(composeSubject || composeBody) && (
                                    <button
                                        onClick={generateAiReply}
                                        disabled={composeAiGenerating}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.4rem',
                                            padding: '0.5rem 1rem',
                                            background: composeAiGenerating
                                                ? 'rgba(168,85,247,0.15)'
                                                : 'rgba(168,85,247,0.1)',
                                            border: '1px solid rgba(168,85,247,0.25)',
                                            borderRadius: '0.5rem',
                                            color: '#a855f7',
                                            cursor: composeAiGenerating ? 'not-allowed' : 'pointer',
                                            fontSize: '0.82rem',
                                            fontWeight: 600,
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        {composeAiGenerating ? (
                                            <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                        ) : (
                                            <span>🤖</span>
                                        )}
                                        {composeAiGenerating ? 'Generuję...' : 'Wygeneruj odpowiedź AI'}
                                    </button>
                                )}
                            </div>
                            {/* Right side buttons */}
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => { setShowCompose(false); resetCompose(); }}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '0.5rem',
                                        color: 'rgba(255,255,255,0.6)',
                                        cursor: 'pointer',
                                        fontSize: '0.82rem',
                                    }}
                                >Anuluj</button>
                                <button
                                    onClick={handleSend}
                                    disabled={sending || !composeTo || !composeSubject}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        padding: '0.5rem 1.25rem',
                                        background: (sending || !composeTo || !composeSubject)
                                            ? 'rgba(56,189,248,0.2)'
                                            : 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        color: '#fff',
                                        cursor: (sending || !composeTo || !composeSubject) ? 'not-allowed' : 'pointer',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                    }}
                                >
                                    {sending ? (
                                        <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                                    ) : (
                                        <Send size={14} />
                                    )}
                                    {sending ? 'Wysyłanie...' : 'Wyślij'}
                                </button>
                                <button
                                    onClick={() => saveComposeDraft()}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(168,85,247,0.15)',
                                        border: '1px solid rgba(168,85,247,0.3)',
                                        borderRadius: '0.5rem',
                                        color: '#a855f7',
                                        cursor: 'pointer',
                                        fontSize: '0.82rem',
                                        fontWeight: 500,
                                    }}
                                    title="Zapisz jako szkic"
                                >
                                    <Save size={14} />
                                    Zapisz szkic
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── AI DRAFTS PANEL MODAL ──────────────────────── */}
            {showDraftsPanel && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 5000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #0d1b2a, #1b2838)',
                        border: '1px solid rgba(168,85,247,0.2)',
                        borderRadius: '1rem',
                        width: '100%',
                        maxWidth: 800,
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '1rem 1.25rem',
                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Sparkles size={18} style={{ color: '#a855f7' }} />
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#a855f7' }}>
                                    Drafty AI
                                </h3>
                                {pendingDraftsCount > 0 && (
                                    <span style={{
                                        fontSize: '0.7rem',
                                        padding: '0.15rem 0.5rem',
                                        borderRadius: '1rem',
                                        background: '#a855f7',
                                        color: '#fff',
                                        fontWeight: 700,
                                    }}>{pendingDraftsCount} oczekuje</span>
                                )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <button
                                    onClick={() => { setShowAiSettings(true); fetchAiConfig(); }}
                                    style={{
                                        background: 'rgba(255,255,255,0.08)',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        borderRadius: '0.4rem',
                                        padding: '0.3rem 0.6rem',
                                        color: 'rgba(255,255,255,0.6)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        fontSize: '0.72rem',
                                        transition: 'all 0.2s',
                                    }}
                                    title="AI Ustawienia"
                                >
                                    <Settings size={13} />
                                    {!isMobileView && 'Ustawienia'}
                                </button>
                                <button
                                    onClick={() => setShowDraftsPanel(false)}
                                    style={{
                                        background: 'rgba(255,255,255,0.08)',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        borderRadius: '0.4rem',
                                        width: 28,
                                        height: 28,
                                        color: '#fff',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.85rem',
                                    }}
                                >✕</button>
                            </div>
                        </div>

                        {/* Toast */}
                        {draftToast && (
                            <div style={{
                                margin: '0.5rem 1.25rem 0',
                                padding: '0.5rem 0.75rem',
                                borderRadius: '0.4rem',
                                fontSize: '0.82rem',
                                background: draftToast.includes('❌') ? 'rgba(239,68,68,0.1)' : 'rgba(74,222,128,0.1)',
                                color: draftToast.includes('❌') ? '#ef4444' : '#4ade80',
                                border: `1px solid ${draftToast.includes('❌') ? 'rgba(239,68,68,0.2)' : 'rgba(74,222,128,0.2)'}`,
                            }}>{draftToast}</div>
                        )}

                        {/* Draft list */}
                        <div style={{ flex: 1, overflow: 'auto', padding: '0.75rem 1.25rem' }}>
                            {aiDrafts.length === 0 ? (
                                <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                                    <Sparkles size={32} style={{ color: 'rgba(168,85,247,0.3)', marginBottom: '0.75rem' }} />
                                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Brak draftów AI</p>
                                    <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.78rem' }}>Asystent AI automatycznie analizuje nowe maile i generuje propozycje odpowiedzi.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {aiDrafts.map(draft => {
                                        const isPending = draft.status === 'pending';
                                        const isSent = draft.status === 'sent';
                                        const isEditing = editingDraftId === draft.id;
                                        const isLearned = draft.status === 'learned';
                                        const statusColors: Record<string, string> = {
                                            pending: '#a855f7',
                                            approved: '#38bdf8',
                                            sent: '#4ade80',
                                            rejected: '#ef4444',
                                            learned: '#f59e0b',
                                        };
                                        const statusLabels: Record<string, string> = {
                                            pending: '⏳ Oczekuje',
                                            approved: '✅ Zatwierdzony',
                                            sent: '📤 Wysłany',
                                            rejected: '❌ Odrzucony',
                                            learned: '🧠 Nauczone',
                                        };

                                        return (
                                            <div key={draft.id} style={{
                                                border: `1px solid ${isPending ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.06)'}`,
                                                borderRadius: '0.75rem',
                                                background: isPending ? 'rgba(168,85,247,0.04)' : 'rgba(255,255,255,0.02)',
                                                overflow: 'hidden',
                                            }}>
                                                {/* Original email info */}
                                                <div style={{
                                                    padding: '0.75rem 1rem',
                                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start',
                                                    gap: '0.5rem',
                                                    flexWrap: 'wrap',
                                                }}>
                                                    <div style={{ flex: 1, minWidth: 200 }}>
                                                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.25rem' }}>Oryginalny email:</div>
                                                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>{draft.email_subject}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.15rem' }}>
                                                            Od: {draft.email_from_name || draft.email_from_address} &lt;{draft.email_from_address}&gt;
                                                        </div>
                                                        {draft.email_snippet && (
                                                            <div style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.35rem', fontStyle: 'italic' }}>
                                                                „{draft.email_snippet.substring(0, 150)}...”
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{
                                                            fontSize: '0.68rem',
                                                            padding: '0.15rem 0.5rem',
                                                            borderRadius: '1rem',
                                                            background: `${statusColors[draft.status]}15`,
                                                            color: statusColors[draft.status],
                                                            fontWeight: 600,
                                                        }}>{statusLabels[draft.status]}</span>
                                                        <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)' }}>
                                                            {formatDate(draft.created_at)}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* AI reasoning */}
                                                {draft.ai_reasoning && (
                                                    <div style={{
                                                        padding: '0.5rem 1rem',
                                                        fontSize: '0.73rem',
                                                        color: 'rgba(168,85,247,0.7)',
                                                        background: 'rgba(168,85,247,0.04)',
                                                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                    }}>
                                                        <Sparkles size={10} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />
                                                        {draft.ai_reasoning}
                                                    </div>
                                                )}

                                                {/* Draft content */}
                                                <div style={{ padding: '0.75rem 1rem' }}>
                                                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginBottom: '0.3rem' }}>Temat odpowiedzi: <strong style={{ color: 'rgba(255,255,255,0.6)' }}>{draft.draft_subject}</strong></div>
                                                    {isEditing ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                            <textarea
                                                                value={editingDraftHtml}
                                                                onChange={e => setEditingDraftHtml(e.target.value)}
                                                                rows={8}
                                                                style={{
                                                                    background: 'rgba(255,255,255,0.05)',
                                                                    border: '1px solid rgba(168,85,247,0.2)',
                                                                    borderRadius: '0.5rem',
                                                                    padding: '0.75rem',
                                                                    color: '#fff',
                                                                    fontSize: '0.82rem',
                                                                    resize: 'vertical',
                                                                    outline: 'none',
                                                                    minHeight: 120,
                                                                    lineHeight: 1.6,
                                                                    fontFamily: 'inherit',
                                                                }}
                                                            />
                                                            {/* Learning note */}
                                                            <input
                                                                type="text"
                                                                value={learningNote}
                                                                onChange={e => setLearningNote(e.target.value)}
                                                                placeholder="Co było źle? (opcjonalnie)"
                                                                style={{
                                                                    background: 'rgba(255,255,255,0.04)',
                                                                    border: '1px solid rgba(245,158,11,0.2)',
                                                                    borderRadius: '0.4rem',
                                                                    padding: '0.4rem 0.6rem',
                                                                    color: 'rgba(255,255,255,0.6)',
                                                                    fontSize: '0.75rem',
                                                                    outline: 'none',
                                                                }}
                                                            />
                                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                                                <button
                                                                    onClick={() => setEditingDraftId(null)}
                                                                    style={{
                                                                        padding: '0.4rem 0.8rem',
                                                                        background: 'rgba(255,255,255,0.05)',
                                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                                        borderRadius: '0.4rem',
                                                                        color: 'rgba(255,255,255,0.5)',
                                                                        cursor: 'pointer',
                                                                        fontSize: '0.78rem',
                                                                    }}
                                                                >Anuluj</button>
                                                                <button
                                                                    onClick={() => handleReturnForLearning(draft.id)}
                                                                    disabled={learningDraftId === draft.id}
                                                                    style={{
                                                                        padding: '0.4rem 0.8rem',
                                                                        background: 'rgba(245,158,11,0.12)',
                                                                        border: '1px solid rgba(245,158,11,0.3)',
                                                                        borderRadius: '0.4rem',
                                                                        color: '#f59e0b',
                                                                        cursor: learningDraftId === draft.id ? 'not-allowed' : 'pointer',
                                                                        fontSize: '0.78rem',
                                                                        fontWeight: 600,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '0.25rem',
                                                                    }}
                                                                    title="Zapisz poprawki i wyślij do AI celem nauki"
                                                                >
                                                                    {learningDraftId === draft.id ? <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Brain size={11} />}
                                                                    {learningDraftId === draft.id ? 'Analizuję...' : '🧠 Ucz AI'}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDraftSave(draft.id)}
                                                                    style={{
                                                                        padding: '0.4rem 0.8rem',
                                                                        background: 'rgba(168,85,247,0.15)',
                                                                        border: '1px solid rgba(168,85,247,0.3)',
                                                                        borderRadius: '0.4rem',
                                                                        color: '#a855f7',
                                                                        cursor: 'pointer',
                                                                        fontSize: '0.78rem',
                                                                        fontWeight: 600,
                                                                    }}
                                                                >💾 Zapisz</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div
                                                            dangerouslySetInnerHTML={{ __html: sanitizeHtml(draft.draft_html) }}
                                                            style={{
                                                                fontSize: '0.82rem',
                                                                color: 'rgba(255,255,255,0.7)',
                                                                lineHeight: 1.6,
                                                                padding: '0.5rem',
                                                                background: 'rgba(255,255,255,0.02)',
                                                                borderRadius: '0.4rem',
                                                                border: '1px solid rgba(255,255,255,0.04)',
                                                                maxHeight: 200,
                                                                overflow: 'auto',
                                                            }}
                                                        />
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                {isPending && !isEditing && (
                                                    <div style={{
                                                        padding: '0.5rem 1rem 0.75rem',
                                                        display: 'flex',
                                                        gap: '0.5rem',
                                                        justifyContent: 'flex-end',
                                                        flexWrap: 'wrap',
                                                    }}>
                                                        <button
                                                            onClick={() => handleDraftAction(draft.id, 'reject')}
                                                            disabled={draftSending === draft.id}
                                                            style={{
                                                                padding: '0.4rem 0.8rem',
                                                                background: 'rgba(239,68,68,0.08)',
                                                                border: '1px solid rgba(239,68,68,0.2)',
                                                                borderRadius: '0.4rem',
                                                                color: '#ef4444',
                                                                cursor: 'pointer',
                                                                fontSize: '0.78rem',
                                                            }}
                                                        >❌ Odrzuć</button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingDraftId(draft.id);
                                                                setEditingDraftHtml(draft.draft_html);
                                                            }}
                                                            style={{
                                                                padding: '0.4rem 0.8rem',
                                                                background: 'rgba(255,255,255,0.05)',
                                                                border: '1px solid rgba(255,255,255,0.1)',
                                                                borderRadius: '0.4rem',
                                                                color: 'rgba(255,255,255,0.6)',
                                                                cursor: 'pointer',
                                                                fontSize: '0.78rem',
                                                            }}
                                                        >✏️ Edytuj</button>
                                                        <button
                                                            onClick={() => handleDraftAction(draft.id, 'send')}
                                                            disabled={draftSending === draft.id}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.3rem',
                                                                padding: '0.4rem 1rem',
                                                                background: draftSending === draft.id
                                                                    ? 'rgba(74,222,128,0.15)'
                                                                    : 'linear-gradient(135deg, #4ade80, #22c55e)',
                                                                border: 'none',
                                                                borderRadius: '0.4rem',
                                                                color: '#fff',
                                                                cursor: draftSending === draft.id ? 'not-allowed' : 'pointer',
                                                                fontSize: '0.78rem',
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            {draftSending === draft.id ? (
                                                                <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                                                            ) : (
                                                                <Send size={12} />
                                                            )}
                                                            {draftSending === draft.id ? 'Wysyłanie...' : 'Zatwierdź i wyślij'}
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Rating + Tags (for sent/rejected/learned drafts) */}
                                                {(isSent || draft.status === 'rejected' || isLearned) && (
                                                    <div style={{
                                                        padding: '0.5rem 1rem',
                                                        borderTop: '1px solid rgba(255,255,255,0.04)',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '0.4rem',
                                                    }}>
                                                        {/* Star rating */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginRight: '0.3rem' }}>Ocena:</span>
                                                            {[1, 2, 3, 4, 5].map(star => (
                                                                <button
                                                                    key={star}
                                                                    onClick={() => handleRateDraft(draft.id, star)}
                                                                    style={{
                                                                        background: 'none',
                                                                        border: 'none',
                                                                        cursor: 'pointer',
                                                                        fontSize: '0.9rem',
                                                                        padding: '0 0.05rem',
                                                                        opacity: (draft.admin_rating || 0) >= star ? 1 : 0.25,
                                                                        transition: 'opacity 0.15s',
                                                                    }}
                                                                    title={`Ocena ${star}/5`}
                                                                >⭐</button>
                                                            ))}
                                                        </div>
                                                        {/* Quick tags */}
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                            {QUICK_TAGS.map(tag => {
                                                                const isActive = (draft.admin_tags || []).includes(tag);
                                                                return (
                                                                    <button
                                                                        key={tag}
                                                                        onClick={() => handleTagDraft(draft.id, tag)}
                                                                        style={{
                                                                            padding: '0.15rem 0.5rem',
                                                                            fontSize: '0.65rem',
                                                                            borderRadius: '1rem',
                                                                            border: `1px solid ${isActive ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.08)'}`,
                                                                            background: isActive ? 'rgba(168,85,247,0.12)' : 'rgba(255,255,255,0.03)',
                                                                            color: isActive ? '#a855f7' : 'rgba(255,255,255,0.35)',
                                                                            cursor: 'pointer',
                                                                            transition: 'all 0.15s',
                                                                        }}
                                                                    >{tag}</button>
                                                                );
                                                            })}
                                                        </div>
                                                        {/* Sent info */}
                                                        {isSent && draft.sent_at && (
                                                            <div style={{ fontSize: '0.68rem', color: 'rgba(74,222,128,0.5)', marginTop: '0.15rem' }}>
                                                                Wysłano: {formatFullDate(draft.sent_at)}{draft.reviewed_by ? ` przez ${draft.reviewed_by}` : ''}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── AI SETTINGS MODAL ──────────────────────────── */}
            {showAiSettings && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(10px)',
                    zIndex: 6000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #0d1b2a, #1b2838)',
                        border: '1px solid rgba(168,85,247,0.25)',
                        borderRadius: '1rem',
                        width: '100%',
                        maxWidth: 700,
                        maxHeight: '85vh',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '1rem 1.25rem',
                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <GraduationCap size={18} style={{ color: '#f59e0b' }} />
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#f59e0b' }}>Szkolenie AI</h3>
                            </div>
                            <button onClick={() => setShowAiSettings(false)} style={{
                                background: 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: '0.4rem',
                                width: 28, height: 28,
                                color: '#fff', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.85rem',
                            }}>✕</button>
                        </div>

                        {/* Stats bar */}
                        {aiStats && (
                            <div style={{
                                padding: '0.5rem 1.25rem',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                                display: 'flex',
                                gap: '1rem',
                                flexWrap: 'wrap',
                                fontSize: '0.72rem',
                                color: 'rgba(255,255,255,0.4)',
                            }}>
                                <span>📊 Razem: <strong style={{ color: '#fff' }}>{aiStats.total}</strong></span>
                                <span>⏳ Oczekuje: <strong style={{ color: '#a855f7' }}>{aiStats.pending}</strong></span>
                                <span>📤 Wysłane: <strong style={{ color: '#4ade80' }}>{aiStats.sent}</strong></span>
                                <span>❌ Odrzucone: <strong style={{ color: '#ef4444' }}>{aiStats.rejected}</strong></span>
                                <span>🧠 Nauczone: <strong style={{ color: '#f59e0b' }}>{aiStats.learned}</strong></span>
                                {aiStats.avgRating && <span>⭐ Średnia: <strong style={{ color: '#fbbf24' }}>{aiStats.avgRating}/5</strong></span>}
                            </div>
                        )}

                        {/* Action buttons */}
                        <div style={{
                            padding: '0.6rem 1.25rem',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex',
                            gap: '0.5rem',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                        }}>
                            <button
                                disabled={cronDebugLoading}
                                onClick={async () => {
                                    setCronDebugLoading(true);
                                    setCronDebugResult(null);
                                    setCronRunResult(null);
                                    try {
                                        const res = await fetch('/api/cron/email-ai-drafts?manual=true&debug=true');
                                        const data = await res.json();
                                        setCronDebugResult(data);
                                    } catch (err: any) {
                                        setCronDebugResult({ error: err.message });
                                    } finally {
                                        setCronDebugLoading(false);
                                    }
                                }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                                    padding: '0.4rem 0.75rem',
                                    background: 'rgba(59,130,246,0.12)',
                                    border: '1px solid rgba(59,130,246,0.3)',
                                    borderRadius: '0.4rem',
                                    color: '#3b82f6',
                                    cursor: cronDebugLoading ? 'not-allowed' : 'pointer',
                                    fontSize: '0.78rem', fontWeight: 600,
                                    transition: 'all 0.15s',
                                }}
                            >
                                {cronDebugLoading ? '⏳' : '🔍'}
                                {cronDebugLoading ? 'Analizuję...' : 'Debug AI'}
                            </button>
                            <button
                                disabled={cronRunLoading}
                                onClick={async () => {
                                    setCronRunLoading(true);
                                    setCronRunResult(null);
                                    setCronDebugResult(null);
                                    try {
                                        const res = await fetch('/api/cron/email-ai-drafts?manual=true');
                                        const text = await res.text();
                                        let data: any;
                                        try {
                                            data = JSON.parse(text);
                                        } catch {
                                            throw new Error(res.ok ? 'Serwer zwrócił nieprawidłową odpowiedź' : `HTTP ${res.status}: ${text.substring(0, 200)}`);
                                        }
                                        if (!res.ok) {
                                            throw new Error(data.error || `HTTP ${res.status}`);
                                        }
                                        setCronRunResult(`✅ ${data.message || 'Gotowe'} — Wygenerowano: ${data.draftsCreated ?? 0}`);
                                        // Refresh drafts list
                                        try {
                                            const dr = await fetch('/api/employee/email-drafts?status=all');
                                            const dd = await dr.json();
                                            setAiDrafts(dd.drafts || []);
                                        } catch { }
                                    } catch (err: any) {
                                        setCronRunResult(`❌ ${err.message}`);
                                    } finally {
                                        setCronRunLoading(false);
                                    }
                                }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                                    padding: '0.4rem 0.75rem',
                                    background: 'rgba(74,222,128,0.12)',
                                    border: '1px solid rgba(74,222,128,0.3)',
                                    borderRadius: '0.4rem',
                                    color: '#4ade80',
                                    cursor: cronRunLoading ? 'not-allowed' : 'pointer',
                                    fontSize: '0.78rem', fontWeight: 600,
                                    transition: 'all 0.15s',
                                }}
                            >
                                {cronRunLoading ? '⏳' : '🚀'}
                                {cronRunLoading ? 'Generuję...' : 'Generuj drafty teraz'}
                            </button>
                            <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>
                                Debug = pokaż klasyfikację maili | Generuj = wygeneruj drafty odpowiedzi
                            </span>
                        </div>

                        {/* Cron run result */}
                        {cronRunResult && (
                            <div style={{
                                padding: '0.5rem 1.25rem',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                                fontSize: '0.78rem',
                                color: cronRunResult.startsWith('✅') ? '#4ade80' : '#ef4444',
                                background: cronRunResult.startsWith('✅') ? 'rgba(74,222,128,0.06)' : 'rgba(239,68,68,0.06)',
                            }}>
                                {cronRunResult}
                            </div>
                        )}

                        {/* Debug results panel */}
                        {cronDebugResult && (
                            <div style={{
                                padding: '0.75rem 1.25rem',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                                background: 'rgba(59,130,246,0.04)',
                                maxHeight: 200,
                                overflow: 'auto',
                                flexShrink: 0,
                            }}>
                                {cronDebugResult.error ? (
                                    <div style={{ color: '#ef4444', fontSize: '0.78rem' }}>❌ {cronDebugResult.error}</div>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem' }}>
                                            <span>📬 Skrzynka: <strong style={{ color: '#fff' }}>{cronDebugResult.totalInboxEmails}</strong></span>
                                            <span>✅ Przetw.: <strong style={{ color: '#fff' }}>{cronDebugResult.processedUidsCount}</strong></span>
                                            <span>🎯 Kandydaci: <strong style={{ color: '#4ade80' }}>{cronDebugResult.candidatesCount}</strong></span>
                                            <span>📏 Reguły: incl={cronDebugResult.senderRules?.include}, excl={cronDebugResult.senderRules?.exclude}</span>
                                        </div>
                                        <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>Klasyfikacja (ostatnie 20):</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                            {(cronDebugResult.emailClassification || []).map((e: any, idx: number) => (
                                                <div key={idx} style={{
                                                    padding: '0.3rem 0.5rem',
                                                    borderRadius: '0.25rem',
                                                    fontSize: '0.68rem',
                                                    background: e.wouldProcess ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.03)',
                                                    border: `1px solid ${e.wouldProcess ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.05)'}`,
                                                    color: e.wouldProcess ? '#4ade80' : 'rgba(255,255,255,0.4)',
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            <strong>{e.from}</strong> — {e.subject}
                                                        </span>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                                            {e.wouldProcess ? '✅ Do przetworzenia' : '⏭️ Pominięty'}
                                                            {e.wouldProcess && (
                                                                <button
                                                                    onClick={async (ev) => {
                                                                        ev.stopPropagation();
                                                                        const btn = ev.currentTarget;
                                                                        btn.disabled = true;
                                                                        btn.textContent = '⏳';
                                                                        try {
                                                                            await fetch('/api/employee/email-ai-config', {
                                                                                method: 'POST',
                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                body: JSON.stringify({ type: 'rule', email_pattern: e.from, rule_type: 'exclude', note: `Pominięty z debug panelu` }),
                                                                            });
                                                                            // Update this item in UI
                                                                            setCronDebugResult((prev: any) => ({
                                                                                ...prev,
                                                                                emailClassification: prev.emailClassification.map((item: any, i: number) =>
                                                                                    i === idx ? { ...item, wouldProcess: false, excludeRuleResult: `❌ excluded by "${e.from}"` } : item
                                                                                ),
                                                                                senderRules: { ...prev.senderRules, exclude: (prev.senderRules?.exclude || 0) + 1 },
                                                                            }));
                                                                            await fetchAiConfig();
                                                                        } catch {
                                                                            btn.textContent = '❌';
                                                                        }
                                                                    }}
                                                                    style={{
                                                                        padding: '0.15rem 0.4rem',
                                                                        background: 'rgba(239,68,68,0.15)',
                                                                        border: '1px solid rgba(239,68,68,0.3)',
                                                                        borderRadius: '0.2rem',
                                                                        color: '#ef4444',
                                                                        cursor: 'pointer',
                                                                        fontSize: '0.65rem',
                                                                        fontWeight: 600,
                                                                        transition: 'all 0.15s',
                                                                    }}
                                                                    title={`Dodaj ${e.from} do listy wykluczeń (nie blokuje ręcznego generowania)`}
                                                                >Pomiń</button>
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div style={{ marginTop: '0.1rem', fontSize: '0.62rem', opacity: 0.7 }}>
                                                        {e.label} | {e.isProcessed ? '🔄 Przetworzony' : '🆕 Nowy'} | {e.includeRuleResult} | {e.excludeRuleResult}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                                <button
                                    onClick={() => setCronDebugResult(null)}
                                    style={{
                                        marginTop: '0.4rem',
                                        padding: '0.2rem 0.4rem',
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '0.25rem',
                                        color: 'rgba(255,255,255,0.4)',
                                        cursor: 'pointer',
                                        fontSize: '0.65rem',
                                    }}
                                >Zamknij</button>
                            </div>
                        )}

                        {/* Tabs */}
                        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto' as const }}>
                            {([['guide', '📖 Poradnik'], ['knowledgebase', '📚 Baza wiedzy'], ['rules', '📋 Reguły'], ['instructions', '📝 Instrukcje'], ['learning', '🧠 Nauka']] as const).map(([tab, label]) => (
                                <button
                                    key={tab}
                                    onClick={() => setAiSettingsTab(tab)}
                                    style={{
                                        flex: 1,
                                        padding: '0.6rem',
                                        background: aiSettingsTab === tab ? 'rgba(245,158,11,0.08)' : 'transparent',
                                        border: 'none',
                                        borderBottom: aiSettingsTab === tab ? '2px solid #f59e0b' : '2px solid transparent',
                                        color: aiSettingsTab === tab ? '#f59e0b' : 'rgba(255,255,255,0.4)',
                                        cursor: 'pointer',
                                        fontSize: '0.78rem',
                                        fontWeight: aiSettingsTab === tab ? 600 : 400,
                                        transition: 'all 0.2s',
                                    }}
                                >{label}</button>
                            ))}
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, overflow: 'auto', padding: '1rem 1.25rem' }}>
                            {aiConfigLoading ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.3)' }}>
                                    <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
                                </div>
                            ) : aiSettingsTab === 'rules' ? (
                                /* ─── RULES TAB ─── */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                                        Określ, dla których adresów AI ma generować odpowiedzi (include) lub je pomijać (exclude). Używaj wzorców np. <code style={{ color: '#a855f7' }}>*@firma.pl</code>
                                    </p>

                                    {/* Add rule form */}
                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <input
                                            value={newRulePattern}
                                            onChange={e => setNewRulePattern(e.target.value)}
                                            placeholder="np. *@gmail.com"
                                            style={{
                                                flex: 1, minWidth: 150,
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '0.4rem',
                                                padding: '0.4rem 0.6rem',
                                                color: '#fff',
                                                fontSize: '0.78rem',
                                                outline: 'none',
                                            }}
                                        />
                                        <select
                                            value={newRuleType}
                                            onChange={e => setNewRuleType(e.target.value as 'include' | 'exclude')}
                                            style={{
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '0.4rem',
                                                padding: '0.4rem 0.5rem',
                                                color: '#fff',
                                                fontSize: '0.78rem',
                                            }}
                                        >
                                            <option value="exclude">🚫 Pomijaj</option>
                                            <option value="include">✅ Generuj</option>
                                        </select>
                                        <input
                                            value={newRuleNote}
                                            onChange={e => setNewRuleNote(e.target.value)}
                                            placeholder="Notatka..."
                                            style={{
                                                width: 100,
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '0.4rem',
                                                padding: '0.4rem 0.5rem',
                                                color: '#fff',
                                                fontSize: '0.78rem',
                                                outline: 'none',
                                            }}
                                        />
                                        <button
                                            onClick={addSenderRule}
                                            disabled={!newRulePattern.trim()}
                                            style={{
                                                padding: '0.4rem 0.7rem',
                                                background: 'rgba(74,222,128,0.12)',
                                                border: '1px solid rgba(74,222,128,0.25)',
                                                borderRadius: '0.4rem',
                                                color: '#4ade80',
                                                cursor: 'pointer',
                                                fontSize: '0.78rem',
                                                fontWeight: 600,
                                                display: 'flex', alignItems: 'center', gap: '0.2rem',
                                            }}
                                        ><Plus size={12} /> Dodaj</button>
                                    </div>

                                    {/* Rules list */}
                                    {senderRules.length === 0 ? (
                                        <p style={{ color: 'rgba(255,255,255,0.25)', textAlign: 'center', fontSize: '0.78rem', padding: '1rem' }}>Brak reguł — AI analizuje wszystkie maile.</p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                            {senderRules.map(rule => (
                                                <div key={rule.id} style={{
                                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                    padding: '0.4rem 0.6rem',
                                                    background: 'rgba(255,255,255,0.03)',
                                                    border: '1px solid rgba(255,255,255,0.06)',
                                                    borderRadius: '0.4rem',
                                                }}>
                                                    <span style={{
                                                        fontSize: '0.65rem',
                                                        padding: '0.1rem 0.4rem',
                                                        borderRadius: '0.3rem',
                                                        background: rule.rule_type === 'include' ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.12)',
                                                        color: rule.rule_type === 'include' ? '#4ade80' : '#ef4444',
                                                        fontWeight: 600,
                                                    }}>{rule.rule_type === 'include' ? '✅' : '🚫'}</span>
                                                    <code style={{ flex: 1, fontSize: '0.78rem', color: '#fff' }}>{rule.email_pattern}</code>
                                                    {rule.note && <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>{rule.note}</span>}
                                                    <button
                                                        onClick={() => deleteSenderRule(rule.id)}
                                                        style={{
                                                            background: 'none', border: 'none',
                                                            color: 'rgba(239,68,68,0.5)', cursor: 'pointer',
                                                            fontSize: '0.85rem', padding: '0.1rem',
                                                        }}
                                                    >✕</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : aiSettingsTab === 'instructions' ? (
                                /* ─── INSTRUCTIONS TAB ─── */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                                        Wpisz instrukcje, które AI będzie bezwzględnie przestrzegać podczas generowania odpowiedzi.
                                    </p>

                                    {/* Add instruction form */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        <textarea
                                            value={newInstruction}
                                            onChange={e => setNewInstruction(e.target.value)}
                                            placeholder='np. "Zawsze proponuj termin wizyty", "Nie podawaj cen bez konsultacji"'
                                            rows={2}
                                            style={{
                                                background: 'rgba(255,255,255,0.05)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '0.4rem',
                                                padding: '0.5rem 0.6rem',
                                                color: '#fff',
                                                fontSize: '0.78rem',
                                                outline: 'none',
                                                resize: 'vertical',
                                                minHeight: 50,
                                                fontFamily: 'inherit',
                                            }}
                                        />
                                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                            <select
                                                value={newInstrCategory}
                                                onChange={e => setNewInstrCategory(e.target.value as any)}
                                                style={{
                                                    background: 'rgba(255,255,255,0.05)',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '0.4rem',
                                                    padding: '0.35rem 0.5rem',
                                                    color: '#fff',
                                                    fontSize: '0.75rem',
                                                }}
                                            >
                                                <option value="rules">📏 Zasady</option>
                                                <option value="tone">🎭 Ton</option>
                                                <option value="content">📄 Treść</option>
                                                <option value="style">✍️ Styl</option>
                                                <option value="other">📎 Inne</option>
                                            </select>
                                            <button
                                                onClick={addInstruction}
                                                disabled={!newInstruction.trim()}
                                                style={{
                                                    padding: '0.35rem 0.7rem',
                                                    background: 'rgba(74,222,128,0.12)',
                                                    border: '1px solid rgba(74,222,128,0.25)',
                                                    borderRadius: '0.4rem',
                                                    color: '#4ade80',
                                                    cursor: 'pointer',
                                                    fontSize: '0.78rem',
                                                    fontWeight: 600,
                                                    display: 'flex', alignItems: 'center', gap: '0.2rem',
                                                }}
                                            ><Plus size={12} /> Dodaj</button>
                                        </div>
                                    </div>

                                    {/* Instructions list */}
                                    {aiInstructions.length === 0 ? (
                                        <p style={{ color: 'rgba(255,255,255,0.25)', textAlign: 'center', fontSize: '0.78rem', padding: '1rem' }}>Brak instrukcji — AI korzysta z domyślnych ustawień.</p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                            {aiInstructions.map(instr => {
                                                const catIcons: Record<string, string> = { tone: '🎭', content: '📄', rules: '📏', style: '✍️', other: '📎' };
                                                return (
                                                    <div key={instr.id} style={{
                                                        display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
                                                        padding: '0.5rem 0.6rem',
                                                        background: 'rgba(255,255,255,0.03)',
                                                        border: '1px solid rgba(255,255,255,0.06)',
                                                        borderRadius: '0.4rem',
                                                        opacity: instr.is_active ? 1 : 0.4,
                                                        transition: 'opacity 0.2s',
                                                    }}>
                                                        <span style={{ fontSize: '0.75rem' }}>{catIcons[instr.category] || '📎'}</span>
                                                        <span style={{ flex: 1, fontSize: '0.78rem', color: '#fff', lineHeight: 1.4 }}>{instr.instruction}</span>
                                                        <button
                                                            onClick={() => toggleInstruction(instr.id, instr.is_active)}
                                                            style={{
                                                                background: 'none', border: 'none',
                                                                cursor: 'pointer', padding: '0.1rem',
                                                                color: instr.is_active ? '#4ade80' : 'rgba(255,255,255,0.2)',
                                                                fontSize: '1rem',
                                                            }}
                                                            title={instr.is_active ? 'Wyłącz' : 'Włącz'}
                                                        >{instr.is_active ? '✅' : '⬜'}</button>
                                                        <button
                                                            onClick={() => deleteInstruction(instr.id)}
                                                            style={{
                                                                background: 'none', border: 'none',
                                                                color: 'rgba(239,68,68,0.5)', cursor: 'pointer',
                                                                fontSize: '0.85rem', padding: '0.1rem',
                                                            }}
                                                        >✕</button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ) : aiSettingsTab === 'learning' ? (
                                /* ─── LEARNING TAB ─── */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', margin: 0 }}>
                                        Historia poprawek i analiz AI. Każda korekta uczy asystenta na przyszłość.
                                    </p>

                                    {aiFeedback.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                                            <Brain size={28} style={{ color: 'rgba(245,158,11,0.25)', marginBottom: '0.5rem' }} />
                                            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>Brak historii nauki</p>
                                            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem' }}>Edytuj draft i kliknij &quot;🧠 Ucz AI&quot; aby dodać wpis.</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {aiFeedback.map(fb => (
                                                <div key={fb.id} style={{
                                                    border: '1px solid rgba(245,158,11,0.15)',
                                                    borderRadius: '0.5rem',
                                                    background: 'rgba(245,158,11,0.03)',
                                                    overflow: 'hidden',
                                                }}>
                                                    <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>
                                                            <span>🧠 Analiza AI</span>
                                                            <span>{formatDate(fb.created_at)}</span>
                                                        </div>
                                                        {fb.ai_analysis && (
                                                            <p style={{ margin: '0.4rem 0 0', fontSize: '0.78rem', color: 'rgba(245,158,11,0.8)', lineHeight: 1.5 }}>{fb.ai_analysis}</p>
                                                        )}
                                                        {fb.feedback_note && (
                                                            <p style={{ margin: '0.3rem 0 0', fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' }}>Uwaga: {fb.feedback_note}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : aiSettingsTab === 'guide' ? (
                                /* ─── GUIDE TAB ─── */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>
                                    <div style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: '0.6rem', padding: '0.75rem 1rem' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8', marginBottom: '0.4rem' }}>🤖 Jak działa Asystent AI?</div>
                                        <p style={{ margin: 0 }}>AI automatycznie analizuje każdy nowy email od pacjentów i generuje propozycję odpowiedzi. Jako pracownik możesz przeglądać, edytować i zatwierdzać drafty. Twoje poprawki uczą AI na przyszłość!</p>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                        <div style={{ fontWeight: 600, color: '#f59e0b', fontSize: '0.85rem' }}>📋 Krok po kroku:</div>
                                        {[
                                            { icon: '📨', title: 'Przychodzi email', desc: 'AI analizuje każdy nowy mail od pacjenta w kategorii Pozostałe. Powiadomienia, wiadomości ze strony i chatu są pomijane.' },
                                            { icon: '✨', title: 'AI generuje draft', desc: 'Na podstawie bazy wiedzy kliniki, instrukcji treningowych i wcześniejszych poprawek AI pisze propozycję odpowiedzi.' },
                                            { icon: '👁️', title: 'Przeglądasz w panelu Drafty AI', desc: 'Kliknij Drafty AI na górze listy emaili. Drafty ze statusem Oczekuje czekają na Twoją decyzję.' },
                                            { icon: '✅', title: 'Zatwierdzasz lub edytujesz', desc: 'Zatwierdź i wyślij (idealna odpowiedź), Edytuj (popraw treść), Odrzuć (nietrafiony draft).' },
                                            { icon: '🧠', title: 'Uczysz AI', desc: 'Po edycji kliknij Ucz AI — AI porówna oryginał z Twoją poprawioną wersją i wyciągnie wnioski. Następnym razem napisze lepiej!' },
                                            { icon: '⭐', title: 'Oceniasz jakość', desc: 'Na wysłanych/odrzuconych draftach daj ocenę 1-5 gwiazdek i szybkie tagi (np. Za długi, Brak cennika).' },
                                        ].map((item, idx) => (
                                            <div key={idx} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', padding: '0.5rem 0.6rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.04)' }}>
                                                <span style={{ fontSize: '1.2rem', minWidth: '1.8rem', textAlign: 'center' }}>{item.icon}</span>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.8rem', marginBottom: '0.15rem' }}>{item.title}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{item.desc}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '0.6rem', padding: '0.75rem 1rem' }}>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f59e0b', marginBottom: '0.3rem' }}>⚙️ Pozostałe zakładki:</div>
                                        <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                                            <li><strong>📚 Baza wiedzy</strong> — podgląd i edycja pełnej bazy z której AI korzysta (cennik, zespół, FAQ)</li>
                                            <li><strong>📋 Reguły</strong> — wybierz adresy email dla których AI generuje odpowiedzi</li>
                                            <li><strong>📝 Instrukcje</strong> — wpisz zasady których AI musi przestrzegać</li>
                                            <li><strong>🧠 Nauka</strong> — historia Twoich poprawek i analiz AI</li>
                                        </ul>
                                    </div>
                                </div>
                            ) : (
                                /* ─── KNOWLEDGE BASE TAB ─── */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', margin: 0 }}>To jest pełna baza wiedzy którą AI wykorzystuje do generowania odpowiedzi. Możesz ją przeglądać i edytować.</p>
                                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                        {!knowledgeBaseEditing ? (
                                            <button onClick={() => setKnowledgeBaseEditing(true)} style={{ padding: '0.35rem 0.7rem', background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: '0.4rem', color: '#a855f7', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>✏️ Edytuj bazę</button>
                                        ) : (
                                            <>
                                                <button onClick={() => { setKnowledgeBaseEditing(false); fetchAiConfig(); }} style={{ padding: '0.35rem 0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.4rem', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.75rem' }}>Anuluj</button>
                                                <button onClick={saveKnowledgeBase} disabled={knowledgeBaseSaving} style={{ padding: '0.35rem 0.7rem', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: '0.4rem', color: '#4ade80', cursor: knowledgeBaseSaving ? 'not-allowed' : 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>{knowledgeBaseSaving ? 'Zapisuję...' : '💾 Zapisz zmiany'}</button>
                                            </>
                                        )}
                                    </div>
                                    {knowledgeBaseEditing ? (
                                        <textarea value={knowledgeBase} onChange={e => setKnowledgeBase(e.target.value)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '0.5rem', padding: '0.75rem', color: '#fff', fontSize: '0.72rem', fontFamily: 'monospace', lineHeight: 1.5, minHeight: 400, resize: 'vertical', outline: 'none', whiteSpace: 'pre-wrap' }} />
                                    ) : (
                                        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.5rem', padding: '0.75rem', maxHeight: 500, overflow: 'auto' }}>
                                            <pre style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{knowledgeBase}</pre>
                                        </div>
                                    )}
                                    <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>ℹ️ Baza zawiera: zespół, ofertę, cennik, FAQ, dane kontaktowe. Zmiany wchodzą w życie przy następnym uruchomieniu AI (co godzinę).</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Pulse animation */}
            <style jsx>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
}
