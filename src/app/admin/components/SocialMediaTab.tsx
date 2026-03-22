"use client";
import { useState, useEffect, useRef } from "react";

// ── Types ──────────────────────────────────────────────────────────
interface SocialPlatform {
    id: string;
    platform: string;
    account_name: string | null;
    account_id: string | null;
    account_url: string | null;
    content_type: string;
    access_token: string | null;
    token_expires_at: string | null;
    is_active: boolean;
    config: any;
    created_at: string;
}

interface SocialSchedule {
    id: string;
    name: string;
    platform_ids: string[];
    content_type: string;
    ai_prompt: string | null;
    frequency: string;
    preferred_hour: number;
    preferred_days: number[];
    is_active: boolean;
    auto_publish: boolean;
    last_generated_at: string | null;
    created_at: string;
    platforms_info?: { id: string; platform: string; account_name: string }[];
}

interface SocialPost {
    id: string;
    schedule_id: string | null;
    status: string;
    platform_ids: string[];
    content_type: string;
    text_content: string | null;
    hashtags: string[];
    image_url: string | null;
    video_url: string | null;
    scheduled_for: string | null;
    published_at: string | null;
    platform_post_ids: any;
    publish_errors: any;
    admin_notes: string | null;
    created_at: string;
}

interface MediaItem {
    id: string;
    file_url: string;
    file_type: string;
    file_name: string | null;
    file_size: number | null;
    tags: string[];
    description: string | null;
    is_used: boolean;
    created_at: string;
}

type SubTab = 'schedules' | 'drafts' | 'library' | 'platforms' | 'topics';

interface SocialTopic {
    id: string;
    topic: string;
    category: string;
    is_active: boolean;
    used_count: number;
    last_used_at: string | null;
    created_by: string;
    created_at: string;
}

const PLATFORM_EMOJI: Record<string, string> = {
    facebook: '📘',
    instagram: '📸',
    tiktok: '🎵',
    youtube: '🎬',
};

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    draft: { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.4)', text: '#60a5fa' },
    approved: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.4)', text: '#4ade80' },
    published: { bg: 'rgba(34,197,94,0.2)', border: 'rgba(34,197,94,0.6)', text: '#22c55e' },
    rejected: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.4)', text: '#f87171' },
    failed: { bg: 'rgba(239,68,68,0.2)', border: 'rgba(239,68,68,0.6)', text: '#ef4444' },
    generating: { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.4)', text: '#fbbf24' },
    publishing: { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.4)', text: '#fbbf24' },
};

const CONTENT_TYPES = [
    { value: 'post_text_image', label: '📷 Post (tekst + grafika)' },
    { value: 'video_short', label: '🎬 Wideo (Short/Reel)' },
    { value: 'carousel', label: '🎠 Karuzela' },
];

const FREQUENCIES = [
    { value: 'daily', label: 'Codziennie' },
    { value: 'weekly', label: 'Co tydzień' },
    { value: 'custom', label: 'Niestandardowy' },
];

const DAY_LABELS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];

// ── Styles ──────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '0.75rem',
    padding: '1.25rem',
    marginBottom: '1rem',
};

const badgeStyle = (status: string): React.CSSProperties => {
    const c = STATUS_COLORS[status] || STATUS_COLORS.draft;
    return {
        display: 'inline-block',
        padding: '0.2rem 0.6rem',
        borderRadius: '999px',
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        fontSize: '0.75rem',
        fontWeight: 600,
    };
};

const btnStyle = (color: string = '#dcb14a'): React.CSSProperties => ({
    padding: '0.5rem 1rem',
    background: `linear-gradient(135deg, ${color}, ${color}cc)`,
    border: 'none',
    borderRadius: '0.5rem',
    color: color === '#dcb14a' ? 'black' : 'white',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
});

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.65rem 0.8rem',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(220,177,74,0.3)',
    borderRadius: '0.5rem',
    color: 'white',
    fontSize: '0.9rem',
    outline: 'none',
};

const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function SocialMediaTab() {
    const [subTab, setSubTab] = useState<SubTab>('schedules');

    // Data
    const [platforms, setPlatforms] = useState<SocialPlatform[]>([]);
    const [schedules, setSchedules] = useState<SocialSchedule[]>([]);
    const [posts, setPosts] = useState<SocialPost[]>([]);
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [topics, setTopics] = useState<SocialTopic[]>([]);
    const [topicCategories, setTopicCategories] = useState<string[]>([]);

    // Loading
    const [loadingPlatforms, setLoadingPlatforms] = useState(false);
    const [loadingSchedules, setLoadingSchedules] = useState(false);
    const [loadingPosts, setLoadingPosts] = useState(false);
    const [loadingMedia, setLoadingMedia] = useState(false);
    const [loadingTopics, setLoadingTopics] = useState(false);

    // Filters
    const [postsFilter, setPostsFilter] = useState<string>('all');
    const [mediaTypeFilter, setMediaTypeFilter] = useState<string>('all');
    const [topicCategoryFilter, setTopicCategoryFilter] = useState<string>('all');
    const [showTopicForm, setShowTopicForm] = useState(false);
    const [editingTopic, setEditingTopic] = useState<SocialTopic | null>(null);
    const [topicForm, setTopicForm] = useState({ topic: '', category: 'ogólne' });
    const [generatingTopics, setGeneratingTopics] = useState(false);
    const [generateTopicsCount, setGenerateTopicsCount] = useState(10);
    const [generateTopicsCategory, setGenerateTopicsCategory] = useState('');

    // Forms
    const [showScheduleForm, setShowScheduleForm] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<SocialSchedule | null>(null);
    const [scheduleForm, setScheduleForm] = useState({
        name: '',
        platform_ids: [] as string[],
        content_type: 'post_text_image',
        ai_prompt: '',
        frequency: 'daily',
        preferred_hour: 10,
        preferred_days: [1, 2, 3, 4, 5, 6, 7],
        auto_publish: false,
    });

    const [showPlatformForm, setShowPlatformForm] = useState(false);
    const [platformForm, setPlatformForm] = useState({
        platform: 'facebook',
        account_name: '',
        account_url: '',
        content_type: 'all',
    });

    // Editing post
    const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
    const [editPostText, setEditPostText] = useState('');

    // Media upload
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadTags, setUploadTags] = useState('');

    // AI Generation
    const [generating, setGenerating] = useState(false);
    const [showGenerateForm, setShowGenerateForm] = useState(false);
    const [generateForm, setGenerateForm] = useState({
        content_type: 'post_text_image',
        custom_prompt: '',
        with_image: true,
    });

    // Publishing
    const [publishingId, setPublishingId] = useState<string | null>(null);

    // ── Fetch functions ──────────────────────────────────────────────
    const fetchPlatforms = async () => {
        setLoadingPlatforms(true);
        try {
            const res = await fetch('/api/social/platforms');
            const data = await res.json();
            setPlatforms(data.platforms || []);
        } catch (e) { console.error(e); }
        setLoadingPlatforms(false);
    };

    const fetchSchedules = async () => {
        setLoadingSchedules(true);
        try {
            const res = await fetch('/api/social/schedules');
            const data = await res.json();
            setSchedules(data.schedules || []);
        } catch (e) { console.error(e); }
        setLoadingSchedules(false);
    };

    const fetchPosts = async () => {
        setLoadingPosts(true);
        try {
            const statusParam = postsFilter === 'all' ? '' : `?status=${postsFilter}`;
            const res = await fetch(`/api/social/posts${statusParam}`);
            const data = await res.json();
            setPosts(data.posts || []);
        } catch (e) { console.error(e); }
        setLoadingPosts(false);
    };

    const fetchMedia = async () => {
        setLoadingMedia(true);
        try {
            const typeParam = mediaTypeFilter === 'all' ? '' : `?type=${mediaTypeFilter}`;
            const res = await fetch(`/api/social/media${typeParam}`);
            const data = await res.json();
            setMedia(data.media || []);
        } catch (e) { console.error(e); }
        setLoadingMedia(false);
    };

    const fetchTopics = async () => {
        setLoadingTopics(true);
        try {
            const res = await fetch('/api/social/topics');
            const data = await res.json();
            setTopics(data.topics || []);
            setTopicCategories(data.categories || []);
        } catch (e) { console.error(e); }
        setLoadingTopics(false);
    };

    // ── Initial load per sub-tab ──────────────────────────────────────
    useEffect(() => {
        if (subTab === 'platforms' && platforms.length === 0) fetchPlatforms();
        if (subTab === 'schedules') { fetchSchedules(); if (platforms.length === 0) fetchPlatforms(); }
        if (subTab === 'drafts') fetchPosts();
        if (subTab === 'library') fetchMedia();
        if (subTab === 'topics' && topics.length === 0) fetchTopics();
    }, [subTab]);

    useEffect(() => { if (subTab === 'drafts') fetchPosts(); }, [postsFilter]);
    useEffect(() => { if (subTab === 'library') fetchMedia(); }, [mediaTypeFilter]);

    // ── Schedule CRUD ─────────────────────────────────────────────────
    const resetScheduleForm = () => {
        setScheduleForm({ name: '', platform_ids: [], content_type: 'post_text_image', ai_prompt: '', frequency: 'daily', preferred_hour: 10, preferred_days: [1, 2, 3, 4, 5, 6, 7], auto_publish: false });
        setEditingSchedule(null);
        setShowScheduleForm(false);
    };

    const handleSaveSchedule = async () => {
        if (!scheduleForm.name || scheduleForm.platform_ids.length === 0) {
            alert('Nazwa i co najmniej jedna platforma wymagane');
            return;
        }
        try {
            const method = editingSchedule ? 'PUT' : 'POST';
            const body = editingSchedule ? { id: editingSchedule.id, ...scheduleForm } : scheduleForm;
            const res = await fetch('/api/social/schedules', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error('Błąd zapisu');
            resetScheduleForm();
            fetchSchedules();
        } catch (e: any) { alert(e.message); }
    };

    const handleToggleSchedule = async (s: SocialSchedule) => {
        try {
            await fetch('/api/social/schedules', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: s.id, is_active: !s.is_active }),
            });
            fetchSchedules();
        } catch (e) { console.error(e); }
    };

    const handleDeleteSchedule = async (id: string) => {
        if (!confirm('Usunąć harmonogram?')) return;
        try {
            await fetch(`/api/social/schedules?id=${id}`, { method: 'DELETE' });
            fetchSchedules();
        } catch (e) { console.error(e); }
    };

    const handleEditSchedule = (s: SocialSchedule) => {
        setEditingSchedule(s);
        setScheduleForm({
            name: s.name,
            platform_ids: s.platform_ids,
            content_type: s.content_type,
            ai_prompt: s.ai_prompt || '',
            frequency: s.frequency,
            preferred_hour: s.preferred_hour,
            preferred_days: s.preferred_days,
            auto_publish: s.auto_publish,
        });
        setShowScheduleForm(true);
    };

    // ── Post actions ──────────────────────────────────────────────────
    const handlePostAction = async (id: string, action: string, extra?: any) => {
        try {
            await fetch('/api/social/posts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action, ...extra }),
            });
            fetchPosts();
        } catch (e) { console.error(e); }
    };

    const handleSavePostEdit = async () => {
        if (!editingPost) return;
        try {
            await fetch('/api/social/posts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingPost.id, text_content: editPostText }),
            });
            setEditingPost(null);
            fetchPosts();
        } catch (e) { console.error(e); }
    };

    const handleDeletePost = async (id: string) => {
        if (!confirm('Usunąć post?')) return;
        try {
            await fetch(`/api/social/posts?id=${id}`, { method: 'DELETE' });
            fetchPosts();
        } catch (e) { console.error(e); }
    };

    // ── AI Generation ─────────────────────────────────────────────────
    const handleGenerateAI = async (autoPublish = false) => {
        setGenerating(true);
        try {
            const res = await fetch('/api/social/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content_type: generateForm.content_type,
                    custom_prompt: generateForm.custom_prompt || undefined,
                    with_image: generateForm.with_image,
                    auto_publish: autoPublish,
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Błąd generowania');
            }
            const data = await res.json();
            if (autoPublish && data.published) {
                alert(`✅ Post wygenerowany i opublikowany! ${data.generated.has_image ? '(z grafiką)' : ''}`);
            } else {
                alert(`✅ Wygenerowano draft! ${data.generated.has_image ? '(z grafiką)' : '(bez grafiki)'}`);
            }
            setShowGenerateForm(false);
            setGenerateForm({ content_type: 'post_text_image', custom_prompt: '', with_image: true });
            fetchPosts();
        } catch (e: any) {
            alert('❌ Błąd: ' + e.message);
        }
        setGenerating(false);
    };

    // ── Publish ─────────────────────────────────────────────────────────
    const handlePublish = async (postId: string) => {
        if (!confirm('Opublikować post na podłączonych platformach?')) return;
        setPublishingId(postId);
        try {
            const res = await fetch('/api/social/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ post_id: postId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            const summary = data.summary;
            alert(`Publikacja: ${summary.published}/${summary.total} platform OK${summary.failed > 0 ? `, ${summary.failed} błędów` : ''}`);
            fetchPosts();
        } catch (e: any) {
            alert('❌ Błąd publikacji: ' + e.message);
        }
        setPublishingId(null);
    };

    // ── Platform CRUD ─────────────────────────────────────────────────
    const handleAddPlatform = async () => {
        if (!platformForm.account_name) {
            alert('Nazwa konta wymagana');
            return;
        }
        try {
            const res = await fetch('/api/social/platforms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(platformForm),
            });
            if (!res.ok) throw new Error('Błąd dodawania');
            setPlatformForm({ platform: 'facebook', account_name: '', account_url: '', content_type: 'all' });
            setShowPlatformForm(false);
            fetchPlatforms();
        } catch (e: any) { alert(e.message); }
    };

    const handleTogglePlatform = async (p: SocialPlatform) => {
        try {
            await fetch('/api/social/platforms', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: p.id, is_active: !p.is_active }),
            });
            fetchPlatforms();
        } catch (e) { console.error(e); }
    };

    const handleDeletePlatform = async (id: string) => {
        if (!confirm('Usunąć platformę?')) return;
        try {
            await fetch(`/api/social/platforms?id=${id}`, { method: 'DELETE' });
            fetchPlatforms();
        } catch (e) { console.error(e); }
    };

    // ── Media upload ──────────────────────────────────────────────────
    const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setUploading(true);
        try {
            for (let i = 0; i < files.length; i++) {
                const fd = new FormData();
                fd.append('file', files[i]);
                if (uploadTags) fd.append('tags', uploadTags);
                await fetch('/api/social/media', { method: 'POST', body: fd });
            }
            setUploadTags('');
            fetchMedia();
        } catch (e) { console.error(e); }
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDeleteMedia = async (id: string) => {
        if (!confirm('Usunąć plik?')) return;
        try {
            await fetch(`/api/social/media?id=${id}`, { method: 'DELETE' });
            fetchMedia();
        } catch (e) { console.error(e); }
    };

    // ── Helpers ────────────────────────────────────────────────────────
    const formatDate = (d: string) => new Date(d).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const formatSize = (bytes: number | null) => {
        if (!bytes) return '—';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const toggleDay = (day: number) => {
        setScheduleForm(f => ({
            ...f,
            preferred_days: f.preferred_days.includes(day)
                ? f.preferred_days.filter(d => d !== day)
                : [...f.preferred_days, day].sort()
        }));
    };

    const togglePlatformId = (pid: string) => {
        setScheduleForm(f => ({
            ...f,
            platform_ids: f.platform_ids.includes(pid)
                ? f.platform_ids.filter(p => p !== pid)
                : [...f.platform_ids, pid]
        }));
    };

    // ═══════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════
    return (
        <div style={{ padding: '1.5rem', maxWidth: 960 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📱 Social Media
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Zarządzaj postami, harmonogramami i mediami na platformach społecznościowych.
            </p>

            {/* Sub-tab navigation */}
            <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {([
                    { id: 'schedules' as SubTab, label: '📅 Harmonogram' },
                    { id: 'drafts' as SubTab, label: '📝 Drafty' },
                    { id: 'library' as SubTab, label: '📁 Biblioteka' },
                    { id: 'topics' as SubTab, label: '💡 Tematy' },
                    { id: 'platforms' as SubTab, label: '🔗 Platformy' },
                ] as const).map(t => (
                    <button
                        key={t.id}
                        onClick={() => setSubTab(t.id)}
                        style={{
                            padding: '0.55rem 1.1rem',
                            borderRadius: '0.5rem',
                            border: subTab === t.id ? '1px solid rgba(220,177,74,0.5)' : '1px solid rgba(255,255,255,0.1)',
                            background: subTab === t.id ? 'rgba(220,177,74,0.15)' : 'rgba(255,255,255,0.04)',
                            color: subTab === t.id ? '#dcb14a' : 'var(--color-text-muted)',
                            fontWeight: subTab === t.id ? 700 : 400,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── SCHEDULES ─────────────────────────────────────────── */}
            {subTab === 'schedules' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Harmonogramy</h3>
                        <button onClick={() => { resetScheduleForm(); setShowScheduleForm(true); }} style={btnStyle()}>
                            + Nowy harmonogram
                        </button>
                    </div>

                    {/* Schedule form */}
                    {showScheduleForm && (
                        <div style={{ ...cardStyle, border: '1px solid rgba(220,177,74,0.3)' }}>
                            <h4 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>{editingSchedule ? '✏️ Edytuj harmonogram' : '➕ Nowy harmonogram'}</h4>

                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem', display: 'block' }}>Nazwa</label>
                                    <input value={scheduleForm.name} onChange={e => setScheduleForm(f => ({ ...f, name: e.target.value }))} placeholder="np. Dzienny post FB" style={inputStyle} />
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem', display: 'block' }}>Platformy</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {platforms.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => togglePlatformId(p.id)}
                                                style={{
                                                    padding: '0.4rem 0.8rem',
                                                    borderRadius: '0.4rem',
                                                    border: scheduleForm.platform_ids.includes(p.id) ? '1px solid rgba(220,177,74,0.6)' : '1px solid rgba(255,255,255,0.15)',
                                                    background: scheduleForm.platform_ids.includes(p.id) ? 'rgba(220,177,74,0.15)' : 'transparent',
                                                    color: scheduleForm.platform_ids.includes(p.id) ? '#dcb14a' : 'var(--color-text-muted)',
                                                    fontSize: '0.8rem',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {PLATFORM_EMOJI[p.platform]} {p.account_name || p.platform}
                                            </button>
                                        ))}
                                        {platforms.length === 0 && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Brak platform — dodaj w zakładce 🔗 Platformy</span>}
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem', display: 'block' }}>Typ treści</label>
                                        <select value={scheduleForm.content_type} onChange={e => setScheduleForm(f => ({ ...f, content_type: e.target.value }))} style={selectStyle}>
                                            {CONTENT_TYPES.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem', display: 'block' }}>Częstotliwość</label>
                                        <select value={scheduleForm.frequency} onChange={e => setScheduleForm(f => ({ ...f, frequency: e.target.value }))} style={selectStyle}>
                                            {FREQUENCIES.map(fr => <option key={fr.value} value={fr.value}>{fr.label}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem', display: 'block' }}>Godzina publikacji</label>
                                    <select value={scheduleForm.preferred_hour} onChange={e => setScheduleForm(f => ({ ...f, preferred_hour: parseInt(e.target.value) }))} style={{ ...selectStyle, maxWidth: 200 }}>
                                        {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem', display: 'block' }}>Dni tygodnia</label>
                                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                                        {DAY_LABELS.map((label, i) => (
                                            <button
                                                key={i}
                                                onClick={() => toggleDay(i + 1)}
                                                style={{
                                                    width: 38, height: 38,
                                                    borderRadius: '0.4rem',
                                                    border: scheduleForm.preferred_days.includes(i + 1) ? '1px solid rgba(220,177,74,0.6)' : '1px solid rgba(255,255,255,0.15)',
                                                    background: scheduleForm.preferred_days.includes(i + 1) ? 'rgba(220,177,74,0.2)' : 'transparent',
                                                    color: scheduleForm.preferred_days.includes(i + 1) ? '#dcb14a' : 'var(--color-text-muted)',
                                                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                                                }}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem', display: 'block' }}>AI Prompt (instrukcja dla AI)</label>
                                    <textarea
                                        value={scheduleForm.ai_prompt}
                                        onChange={e => setScheduleForm(f => ({ ...f, ai_prompt: e.target.value }))}
                                        placeholder="np. Pisz profesjonalne ale przystępne posty o zdrowiu jamy ustnej. Używaj emoji. Dodaj CTA na koniec."
                                        rows={3}
                                        style={{ ...inputStyle, resize: 'vertical' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={scheduleForm.auto_publish}
                                            onChange={e => setScheduleForm(f => ({ ...f, auto_publish: e.target.checked }))}
                                            style={{ accentColor: '#dcb14a' }}
                                        />
                                        Auto-publikuj (bez manualnej akceptacji)
                                    </label>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={handleSaveSchedule} style={btnStyle()}>
                                        {editingSchedule ? 'Zapisz zmiany' : 'Utwórz harmonogram'}
                                    </button>
                                    <button onClick={resetScheduleForm} style={{ ...btnStyle('#555'), color: 'white' }}>
                                        Anuluj
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Schedules list */}
                    {loadingSchedules ? (
                        <p style={{ color: 'var(--color-text-muted)' }}>Ładowanie...</p>
                    ) : schedules.length === 0 ? (
                        <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem' }}>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>📅 Brak harmonogramów</p>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Utwórz pierwszy harmonogram, aby zacząć automatyzację.</p>
                        </div>
                    ) : (
                        schedules.map(s => (
                            <div key={s.id} style={{ ...cardStyle, opacity: s.is_active ? 1 : 0.55 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {s.name}
                                            {!s.is_active && <span style={{ ...badgeStyle('rejected'), fontSize: '0.7rem' }}>wyłączony</span>}
                                        </h4>
                                        <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                                            {(s.platforms_info || []).map((pi, idx) => (
                                                <span key={idx} style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                    {PLATFORM_EMOJI[pi.platform]} {pi.account_name}
                                                </span>
                                            ))}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
                                            {CONTENT_TYPES.find(ct => ct.value === s.content_type)?.label} • {FREQUENCIES.find(f => f.value === s.frequency)?.label} • {String(s.preferred_hour).padStart(2, '0')}:00
                                            {s.auto_publish && <span style={{ color: '#fbbf24' }}> • ⚡ auto-publish</span>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                                        <button onClick={() => handleToggleSchedule(s)} style={{ ...btnStyle(s.is_active ? '#ef4444' : '#22c55e'), padding: '0.35rem 0.7rem', fontSize: '0.8rem', color: 'white' }}>
                                            {s.is_active ? '⏸ Wyłącz' : '▶ Włącz'}
                                        </button>
                                        <button onClick={() => handleEditSchedule(s)} style={{ ...btnStyle('#3b82f6'), padding: '0.35rem 0.7rem', fontSize: '0.8rem', color: 'white' }}>
                                            ✏️
                                        </button>
                                        <button onClick={() => handleDeleteSchedule(s.id)} style={{ ...btnStyle('#555'), padding: '0.35rem 0.7rem', fontSize: '0.8rem', color: 'white' }}>
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* ── DRAFTS ──────────────────────────────────────────────── */}
            {subTab === 'drafts' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Posty</h3>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <button onClick={() => setShowGenerateForm(!showGenerateForm)} style={{ ...btnStyle('#8b5cf6'), color: 'white', display: 'flex', alignItems: 'center', gap: '0.3rem' }} disabled={generating}>
                                {generating ? '⏳ Generuję...' : '🤖 Generuj post AI'}
                            </button>
                            <a href="/admin/video" style={{ ...btnStyle('#f59e0b'), color: '#000', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none', fontWeight: 700 }}>
                                📹 Video Shorts
                            </a>
                            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                {['all', 'draft', 'approved', 'published', 'rejected', 'failed'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setPostsFilter(f)}
                                        style={{
                                            padding: '0.35rem 0.7rem',
                                            borderRadius: '0.4rem',
                                            border: postsFilter === f ? '1px solid rgba(220,177,74,0.5)' : '1px solid rgba(255,255,255,0.1)',
                                            background: postsFilter === f ? 'rgba(220,177,74,0.15)' : 'transparent',
                                            color: postsFilter === f ? '#dcb14a' : 'var(--color-text-muted)',
                                            fontSize: '0.78rem', cursor: 'pointer',
                                        }}
                                    >
                                        {f === 'all' ? 'Wszystkie' : f.charAt(0).toUpperCase() + f.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* AI Generate form */}
                    {showGenerateForm && (
                        <div style={{ ...cardStyle, border: '1px solid rgba(139,92,246,0.4)', marginBottom: '1rem' }}>
                            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', color: '#a78bfa' }}>🤖 Generuj post AI</h4>
                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem', display: 'block' }}>Typ treści</label>
                                        <select value={generateForm.content_type} onChange={e => setGenerateForm(f => ({ ...f, content_type: e.target.value }))} style={selectStyle}>
                                            {CONTENT_TYPES.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                            <input type="checkbox" checked={generateForm.with_image} onChange={e => setGenerateForm(f => ({ ...f, with_image: e.target.checked }))} style={{ accentColor: '#8b5cf6' }} />
                                            Generuj grafikę
                                        </label>
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem', display: 'block' }}>Temat / instrukcja (opcjonalnie — AI wybierze losowy temat)</label>
                                    <textarea
                                        value={generateForm.custom_prompt}
                                        onChange={e => setGenerateForm(f => ({ ...f, custom_prompt: e.target.value }))}
                                        placeholder="np. Post o korzyściach z leczenia kanałowego pod mikroskopem"
                                        rows={2}
                                        style={{ ...inputStyle, resize: 'vertical' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    <button onClick={() => handleGenerateAI(false)} disabled={generating} style={{ ...btnStyle('#8b5cf6'), color: 'white', opacity: generating ? 0.6 : 1 }}>
                                        {generating ? '⏳ Generowanie (~30s)...' : '📝 Generuj draft'}
                                    </button>
                                    <button onClick={() => { if (confirm('Wygenerować post i od razu opublikować na FB/IG?')) handleGenerateAI(true); }} disabled={generating} style={{ ...btnStyle('#22c55e'), color: 'white', opacity: generating ? 0.6 : 1 }}>
                                        {generating ? '⏳...' : '🚀 Generuj i publikuj'}
                                    </button>
                                    <button onClick={() => setShowGenerateForm(false)} style={{ ...btnStyle('#555'), color: 'white' }}>Anuluj</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {loadingPosts ? (
                        <p style={{ color: 'var(--color-text-muted)' }}>Ładowanie...</p>
                    ) : posts.length === 0 ? (
                        <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem' }}>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>📝 Brak postów</p>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Kliknij "🤖 Generuj post AI" aby wygenerować pierwszy post.</p>
                        </div>
                    ) : (
                        posts.map(post => (
                            <div key={post.id} style={cardStyle}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <span style={badgeStyle(post.status)}>{post.status}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                            {CONTENT_TYPES.find(ct => ct.value === post.content_type)?.label || post.content_type}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                            {formatDate(post.created_at)}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                                        {post.status === 'draft' && (
                                            <>
                                                <button onClick={() => handlePostAction(post.id, 'approve')} style={{ ...btnStyle('#22c55e'), padding: '0.3rem 0.6rem', fontSize: '0.78rem', color: 'white' }}>✅ Akceptuj</button>
                                                <button onClick={() => handlePostAction(post.id, 'reject')} style={{ ...btnStyle('#ef4444'), padding: '0.3rem 0.6rem', fontSize: '0.78rem', color: 'white' }}>❌ Odrzuć</button>
                                            </>
                                        )}
                                        {post.status === 'approved' && (
                                            <button
                                                onClick={() => handlePublish(post.id)}
                                                disabled={publishingId === post.id}
                                                style={{ ...btnStyle('#f97316'), padding: '0.3rem 0.6rem', fontSize: '0.78rem', color: 'white', opacity: publishingId === post.id ? 0.6 : 1 }}
                                            >
                                                {publishingId === post.id ? '⏳...' : '📤 Publikuj'}
                                            </button>
                                        )}
                                        {post.status === 'failed' && (
                                            <button
                                                onClick={() => handlePublish(post.id)}
                                                disabled={publishingId === post.id}
                                                style={{ ...btnStyle('#f97316'), padding: '0.3rem 0.6rem', fontSize: '0.78rem', color: 'white', opacity: publishingId === post.id ? 0.6 : 1 }}
                                            >
                                                {publishingId === post.id ? '⏳ Ponawiam...' : '🔄 Ponów publikację'}
                                            </button>
                                        )}
                                        {post.status === 'rejected' && (
                                            <button onClick={() => handlePostAction(post.id, 'approve')} style={{ ...btnStyle('#22c55e'), padding: '0.3rem 0.6rem', fontSize: '0.78rem', color: 'white' }}>♻️ Przywróć</button>
                                        )}
                                        <button onClick={() => { setEditingPost(post); setEditPostText(post.text_content || ''); }} style={{ ...btnStyle('#3b82f6'), padding: '0.3rem 0.6rem', fontSize: '0.78rem', color: 'white' }}>✏️</button>
                                        <button onClick={() => handleDeletePost(post.id)} style={{ ...btnStyle('#555'), padding: '0.3rem 0.6rem', fontSize: '0.78rem', color: 'white' }}>🗑️</button>
                                    </div>
                                </div>

                                {/* Publish errors */}
                                {post.publish_errors && Object.keys(post.publish_errors).length > 0 && (
                                    <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.4rem', padding: '0.5rem 0.75rem', marginBottom: '0.5rem', fontSize: '0.78rem' }}>
                                        <strong style={{ color: '#f87171' }}>❌ Błędy publikacji:</strong>
                                        {Object.entries(post.publish_errors).map(([platform, error]: [string, any]) => (
                                            <div key={platform} style={{ marginTop: '0.2rem', color: 'var(--color-text-muted)' }}>
                                                <strong>{platform}:</strong> {typeof error === 'string' ? error : JSON.stringify(error)}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Content preview */}
                                {post.text_content && (
                                    <div style={{ fontSize: '0.88rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'rgba(255,255,255,0.85)', marginBottom: '0.5rem' }}>
                                        {post.text_content.length > 300 ? post.text_content.slice(0, 300) + '…' : post.text_content}
                                    </div>
                                )}
                                {post.hashtags && post.hashtags.length > 0 && (
                                    <div style={{ fontSize: '0.78rem', color: '#60a5fa' }}>
                                        {post.hashtags.map(h => `#${h}`).join(' ')}
                                    </div>
                                )}
                                {post.image_url && (
                                    <img src={post.image_url} alt="" style={{ maxWidth: 200, maxHeight: 200, borderRadius: '0.5rem', marginTop: '0.5rem', objectFit: 'cover' }} />
                                )}
                                {post.scheduled_for && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
                                        📅 Zaplanowano na: {formatDate(post.scheduled_for)}
                                    </div>
                                )}
                            </div>
                        ))
                    )}

                    {/* Edit modal */}
                    {editingPost && (
                        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setEditingPost(null)}>
                            <div style={{ background: '#1a1a2e', borderRadius: '1rem', padding: '2rem', width: '90%', maxWidth: 600, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
                                <h3 style={{ margin: '0 0 1rem' }}>✏️ Edytuj treść</h3>
                                <textarea
                                    value={editPostText}
                                    onChange={e => setEditPostText(e.target.value)}
                                    rows={10}
                                    style={{ ...inputStyle, resize: 'vertical' }}
                                />
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                    <button onClick={handleSavePostEdit} style={btnStyle()}>Zapisz</button>
                                    <button onClick={() => setEditingPost(null)} style={{ ...btnStyle('#555'), color: 'white' }}>Anuluj</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── LIBRARY ─────────────────────────────────────────────── */}
            {subTab === 'library' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Biblioteka mediów</h3>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <select value={mediaTypeFilter} onChange={e => setMediaTypeFilter(e.target.value)} style={{ ...selectStyle, width: 'auto', padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}>
                                <option value="all">Wszystkie</option>
                                <option value="image">📷 Zdjęcia</option>
                                <option value="video">🎬 Wideo</option>
                            </select>
                        </div>
                    </div>

                    {/* Upload area */}
                    <div style={{ ...cardStyle, border: '2px dashed rgba(220,177,74,0.3)', textAlign: 'center', padding: '2rem', cursor: 'pointer' }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            style={{ display: 'none' }}
                            onChange={handleMediaUpload}
                        />
                        {uploading ? (
                            <p style={{ color: '#dcb14a' }}>⏳ Przesyłanie...</p>
                        ) : (
                            <>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem', margin: '0 0 0.5rem' }}>📤 Kliknij aby przesłać pliki</p>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', margin: 0 }}>Obsługiwane: JPG, PNG, MP4, MOV</p>
                            </>
                        )}
                    </div>

                    {/* Tags input */}
                    <div style={{ marginBottom: '1rem' }}>
                        <input
                            value={uploadTags}
                            onChange={e => setUploadTags(e.target.value)}
                            placeholder="Tagi do następnego uploadu (oddzielone przecinkami)"
                            style={{ ...inputStyle, fontSize: '0.8rem' }}
                        />
                    </div>

                    {/* Media grid */}
                    {loadingMedia ? (
                        <p style={{ color: 'var(--color-text-muted)' }}>Ładowanie...</p>
                    ) : media.length === 0 ? (
                        <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem' }}>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>📁 Biblioteka pusta</p>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Prześlij zdjęcia lub wideo, aby zacząć.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
                            {media.map(m => (
                                <div key={m.id} style={{ ...cardStyle, padding: '0', overflow: 'hidden', marginBottom: 0 }}>
                                    {m.file_type === 'image' ? (
                                        <img src={m.file_url} alt={m.file_name || ''} style={{ width: '100%', height: 140, objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: 140, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>
                                            🎬
                                        </div>
                                    )}
                                    <div style={{ padding: '0.75rem' }}>
                                        <p style={{ fontSize: '0.78rem', margin: '0 0 0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.8)' }}>
                                            {m.file_name || 'Bez nazwy'}
                                        </p>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', margin: '0 0 0.3rem' }}>
                                            {formatSize(m.file_size)} • {formatDate(m.created_at).split(',')[0]}
                                        </p>
                                        {m.tags && m.tags.length > 0 && (
                                            <div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                                                {m.tags.map((t, i) => (
                                                    <span key={i} style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', background: 'rgba(220,177,74,0.1)', border: '1px solid rgba(220,177,74,0.2)', borderRadius: '999px', color: '#dcb14a' }}>
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        <button onClick={() => handleDeleteMedia(m.id)} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.3rem', color: '#f87171', cursor: 'pointer' }}>
                                            🗑️ Usuń
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── PLATFORMS ────────────────────────────────────────────── */}
            {subTab === 'platforms' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Połączone platformy</h3>
                        <button onClick={() => setShowPlatformForm(true)} style={btnStyle()}>
                            + Dodaj platformę
                        </button>
                    </div>

                    {/* Add platform form */}
                    {showPlatformForm && (
                        <div style={{ ...cardStyle, border: '1px solid rgba(220,177,74,0.3)' }}>
                            <h4 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>➕ Dodaj platformę</h4>
                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem', display: 'block' }}>Platforma</label>
                                        <select value={platformForm.platform} onChange={e => setPlatformForm(f => ({ ...f, platform: e.target.value }))} style={selectStyle}>
                                            <option value="facebook">📘 Facebook</option>
                                            <option value="instagram">📸 Instagram</option>
                                            <option value="tiktok">🎵 TikTok</option>
                                            <option value="youtube">🎬 YouTube</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem', display: 'block' }}>Typ treści</label>
                                        <select value={platformForm.content_type} onChange={e => setPlatformForm(f => ({ ...f, content_type: e.target.value }))} style={selectStyle}>
                                            <option value="all">Wszystko</option>
                                            <option value="video">Tylko wideo</option>
                                            <option value="posts">Tylko posty</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem', display: 'block' }}>Nazwa konta</label>
                                    <input value={platformForm.account_name} onChange={e => setPlatformForm(f => ({ ...f, account_name: e.target.value }))} placeholder="np. Mikrostomart Opole" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem', display: 'block' }}>URL profilu</label>
                                    <input value={platformForm.account_url} onChange={e => setPlatformForm(f => ({ ...f, account_url: e.target.value }))} placeholder="https://..." style={inputStyle} />
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={handleAddPlatform} style={btnStyle()}>Dodaj</button>
                                    <button onClick={() => setShowPlatformForm(false)} style={{ ...btnStyle('#555'), color: 'white' }}>Anuluj</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Platforms list */}
                    {loadingPlatforms ? (
                        <p style={{ color: 'var(--color-text-muted)' }}>Ładowanie...</p>
                    ) : platforms.length === 0 ? (
                        <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem' }}>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>🔗 Brak platform</p>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Dodaj co najmniej jedną platformę, aby tworzyć harmonogramy.</p>
                        </div>
                    ) : (
                        platforms.map(p => (
                            <div key={p.id} style={{ ...cardStyle, opacity: p.is_active ? 1 : 0.55 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontSize: '1.3rem' }}>{PLATFORM_EMOJI[p.platform]}</span>
                                            {p.account_name || p.platform}
                                            {!p.is_active && <span style={{ ...badgeStyle('rejected'), fontSize: '0.7rem' }}>wyłączony</span>}
                                        </h4>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
                                            {p.platform} • {p.content_type === 'all' ? 'Wszystko' : p.content_type === 'video' ? 'Tylko wideo' : 'Tylko posty'}
                                            {p.account_url && (
                                                <> • <a href={p.account_url} target="_blank" rel="noopener" style={{ color: '#60a5fa' }}>Profil ↗</a></>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                                            Token: {p.access_token ? '✅ ustawiony' : '⚠️ brak'}
                                            {p.token_expires_at && <> • Wygasa: {formatDate(p.token_expires_at)}</>}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                        {!p.access_token && (
                                            <a
                                                href={`/api/social/oauth/${p.platform === 'instagram' ? 'facebook' : p.platform}?platform_id=${p.id}`}
                                                style={{ ...btnStyle('#8b5cf6'), padding: '0.35rem 0.7rem', fontSize: '0.8rem', color: 'white', textDecoration: 'none', display: 'inline-block' }}
                                            >
                                                🔑 Połącz
                                            </a>
                                        )}
                                        {p.access_token && (
                                            <a
                                                href={`/api/social/oauth/${p.platform === 'instagram' ? 'facebook' : p.platform}?platform_id=${p.id}`}
                                                style={{ ...btnStyle('#3b82f6'), padding: '0.35rem 0.7rem', fontSize: '0.78rem', color: 'white', textDecoration: 'none', display: 'inline-block' }}
                                            >
                                                🔄 Odśwież
                                            </a>
                                        )}
                                        <button onClick={() => handleTogglePlatform(p)} style={{ ...btnStyle(p.is_active ? '#ef4444' : '#22c55e'), padding: '0.35rem 0.7rem', fontSize: '0.8rem', color: 'white' }}>
                                            {p.is_active ? '⏸' : '▶'}
                                        </button>
                                        <button onClick={() => handleDeletePlatform(p.id)} style={{ ...btnStyle('#555'), padding: '0.35rem 0.7rem', fontSize: '0.8rem', color: 'white' }}>
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}

                    {/* Info box */}
                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(220,177,74,0.06)', border: '1px solid rgba(220,177,74,0.2)', borderRadius: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                        <strong style={{ color: '#dcb14a' }}>ℹ️ Tokeny OAuth</strong><br />
                        Tokeny API (Page Access Token, OAuth tokens) zostaną dodane po implementacji OAuth callbacks (Faza 3).
                        Na razie dodaj platformy ręcznie z nazwą konta i URL — tokeny dopiszemy później.
                    </div>
                </div>
            )}

            {/* ── TOPICS ───────────────────────────────────────────── */}
            {subTab === 'topics' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Tematy do postów AI</h3>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => { setGeneratingTopics(true); fetch('/api/social/topics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'generate', count: generateTopicsCount, category: generateTopicsCategory }) }).then(r => r.json()).then(d => { if (d.generated) { alert(`✅ Wygenerowano ${d.generated} nowych tematów`); fetchTopics(); } else { alert('❌ ' + (d.error || 'Błąd')); } }).catch(e => alert('❌ ' + e.message)).finally(() => setGeneratingTopics(false)); }}
                                disabled={generatingTopics}
                                style={{ ...btnStyle('#8b5cf6'), color: 'white', opacity: generatingTopics ? 0.6 : 1 }}
                            >
                                {generatingTopics ? '⏳ Generuję...' : '🤖 Generuj nowe tematy AI'}
                            </button>
                            <button onClick={() => { setEditingTopic(null); setTopicForm({ topic: '', category: 'ogólne' }); setShowTopicForm(true); }} style={btnStyle()}>
                                + Dodaj temat
                            </button>
                        </div>
                    </div>

                    {/* AI Generate controls */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Ile tematów:</label>
                        <select value={generateTopicsCount} onChange={e => setGenerateTopicsCount(parseInt(e.target.value))} style={{ ...selectStyle, width: 80 }}>
                            {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Kategoria AI:</label>
                        <select value={generateTopicsCategory} onChange={e => setGenerateTopicsCategory(e.target.value)} style={{ ...selectStyle, width: 160 }}>
                            <option value="">Różne</option>
                            {['ogólne', 'implantologia', 'estetyka', 'higiena', 'endodoncja', 'protetyka', 'ortodoncja', 'chirurgia', 'laser', 'dzieci'].map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Category filter */}
                    <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        <button onClick={() => setTopicCategoryFilter('all')} style={{ padding: '0.3rem 0.6rem', borderRadius: '0.4rem', border: topicCategoryFilter === 'all' ? '1px solid rgba(220,177,74,0.5)' : '1px solid rgba(255,255,255,0.1)', background: topicCategoryFilter === 'all' ? 'rgba(220,177,74,0.15)' : 'transparent', color: topicCategoryFilter === 'all' ? '#dcb14a' : 'var(--color-text-muted)', fontSize: '0.78rem', cursor: 'pointer' }}>
                            Wszystkie ({topics.length})
                        </button>
                        {topicCategories.map(cat => {
                            const count = topics.filter(t => t.category === cat).length;
                            return (
                                <button key={cat} onClick={() => setTopicCategoryFilter(cat)} style={{ padding: '0.3rem 0.6rem', borderRadius: '0.4rem', border: topicCategoryFilter === cat ? '1px solid rgba(220,177,74,0.5)' : '1px solid rgba(255,255,255,0.1)', background: topicCategoryFilter === cat ? 'rgba(220,177,74,0.15)' : 'transparent', color: topicCategoryFilter === cat ? '#dcb14a' : 'var(--color-text-muted)', fontSize: '0.78rem', cursor: 'pointer' }}>
                                    {cat} ({count})
                                </button>
                            );
                        })}
                    </div>

                    {/* Add/Edit topic form */}
                    {showTopicForm && (
                        <div style={{ ...cardStyle, border: '1px solid rgba(220,177,74,0.3)', marginBottom: '1rem' }}>
                            <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem' }}>{editingTopic ? '✏️ Edytuj temat' : '➕ Nowy temat'}</h4>
                            <div style={{ display: 'grid', gap: '0.75rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem', display: 'block' }}>Temat</label>
                                    <input value={topicForm.topic} onChange={e => setTopicForm(f => ({ ...f, topic: e.target.value }))} placeholder="np. Jak uniknąć chorób przyzębia?" style={inputStyle} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.3rem', display: 'block' }}>Kategoria</label>
                                    <select value={topicForm.category} onChange={e => setTopicForm(f => ({ ...f, category: e.target.value }))} style={{ ...selectStyle, maxWidth: 200 }}>
                                        {['ogólne', 'implantologia', 'estetyka', 'higiena', 'endodoncja', 'protetyka', 'ortodoncja', 'chirurgia', 'laser', 'dzieci'].map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={async () => {
                                        if (!topicForm.topic) { alert('Wpisz temat'); return; }
                                        try {
                                            if (editingTopic) {
                                                await fetch('/api/social/topics', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingTopic.id, ...topicForm }) });
                                            } else {
                                                await fetch('/api/social/topics', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(topicForm) });
                                            }
                                            setShowTopicForm(false); setEditingTopic(null); setTopicForm({ topic: '', category: 'ogólne' }); fetchTopics();
                                        } catch (e: any) { alert(e.message); }
                                    }} style={btnStyle()}>
                                        {editingTopic ? 'Zapisz zmiany' : 'Dodaj temat'}
                                    </button>
                                    <button onClick={() => { setShowTopicForm(false); setEditingTopic(null); }} style={{ ...btnStyle('#555'), color: 'white' }}>Anuluj</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Topics list */}
                    {loadingTopics ? (
                        <p style={{ color: 'var(--color-text-muted)' }}>Ładowanie...</p>
                    ) : topics.length === 0 ? (
                        <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem' }}>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>💡 Brak tematów</p>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Dodaj tematy ręcznie lub wygeneruj za pomocą AI.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {topics
                                .filter(t => topicCategoryFilter === 'all' || t.category === topicCategoryFilter)
                                .map(t => (
                                    <div key={t.id} style={{ ...cardStyle, padding: '0.85rem 1rem', marginBottom: 0, opacity: t.is_active ? 1 : 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.topic}</div>
                                            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.45rem', borderRadius: '999px', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa' }}>{t.category}</span>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Użyto: {t.used_count}×</span>
                                                {t.created_by === 'ai' && <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '999px', background: 'rgba(59,130,246,0.12)', color: '#60a5fa' }}>🤖 AI</span>}
                                                {t.created_by === 'admin' && <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '999px', background: 'rgba(34,197,94,0.12)', color: '#4ade80' }}>👤 Admin</span>}
                                                {!t.is_active && <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '999px', background: 'rgba(239,68,68,0.12)', color: '#f87171' }}>wyłączony</span>}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                                            <button onClick={() => { setEditingTopic(t); setTopicForm({ topic: t.topic, category: t.category }); setShowTopicForm(true); }} style={{ ...btnStyle('#3b82f6'), padding: '0.3rem 0.55rem', fontSize: '0.75rem', color: 'white' }} title="Edytuj">✏️</button>
                                            <button onClick={async () => { await fetch('/api/social/topics', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id, is_active: !t.is_active }) }); fetchTopics(); }} style={{ ...btnStyle(t.is_active ? '#ef4444' : '#22c55e'), padding: '0.3rem 0.55rem', fontSize: '0.75rem', color: 'white' }} title={t.is_active ? 'Wyłącz' : 'Włącz'}>{t.is_active ? '⏸' : '▶'}</button>
                                            <button onClick={async () => { if (confirm('Usunąć temat?')) { await fetch(`/api/social/topics?id=${t.id}`, { method: 'DELETE' }); fetchTopics(); } }} style={{ ...btnStyle('#555'), padding: '0.3rem 0.55rem', fontSize: '0.75rem', color: 'white' }} title="Usuń">🗑️</button>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}

                    {/* Info */}
                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                        <strong style={{ color: '#a78bfa' }}>💡 Jak działają tematy?</strong><br />
                        Codziennie cron wybiera losowy temat z bazy (preferuje najmniej używane) i generuje post AI. Jeśli baza jest pusta, używa tematów domyślnych.<br />
                        <strong>Kategorie</strong> pomagają filtrować i organizować tematy. AI może generować tematy w konkretnej kategorii.
                    </div>
                </div>
            )}
        </div>
    );
}
