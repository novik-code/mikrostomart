'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Activity, AlertTriangle, CheckCircle2, Clock, Smartphone, Send, XCircle } from 'lucide-react';

/**
 * Diagnostyka powiadomień push.
 *
 * Ekran, do którego od zawsze odsyłał alert z Telegrama („/pracownik → Diagnostyka
 * powiadomień"), a którego nie było — endpoint powstał, interfejs nie.
 *
 * 🔑 Odpowiada na pytanie „czy kanał działa", a nie „co komu wysłano". Treści powiadomień
 * i nazwisk tu nie ma — te są w Alertach i podlegają innym regułom dostępu.
 */

interface PathRow {
    path_key: string;
    label: string;
    max_silence_minutes: number | null;
    last_attempt_at: string | null;
    last_success_at: string | null;
    last_error: string | null;
    attempts_24h: number;
    failures_24h: number;
    silentMinutes: number | null;
    status: 'ok' | 'silent' | 'never' | 'waiting' | 'unknown';
}

interface TokenStats {
    total: number;
    byPlatform: Record<string, number>;
    newest: string | null;
}

interface ReceiptSummary {
    checked: number;
    delivered: number;
    failed: number;
    errors: Record<string, number>;
}

interface Diagnostics {
    generatedAt: string;
    paths: PathRow[];
    tokens: { patients: TokenStats; staff: TokenStats };
    receipts: {
        last24h: ReceiptSummary;
        last7d: ReceiptSummary;
        pending: number;
        perPath: Record<string, { delivered: number; failed: number; errors: Record<string, number> }>;
        recentFailures: Array<{
            at: string | null;
            path: string | null;
            audience: string;
            error: string;
            tokenTail: string | null;
        }>;
    };
    attempts24h: { total: number; byTag: Record<string, number>; byAudience: Record<string, number> };
    crons: Array<{ cron_name: string; last_run_at: string; status: string; message: string | null; duration_ms: number | null }>;
}

const STATUS_META: Record<PathRow['status'], { label: string; color: string; hint: string }> = {
    ok: { label: 'Działa', color: '#4ade80', hint: 'Ostatnia udana wysyłka mieści się w limicie ciszy.' },
    silent: { label: 'Milczy', color: '#f87171', hint: 'Ścieżka działała wcześniej, ale zamilkła dłużej, niż powinna.' },
    never: { label: 'Nigdy nie zadziałała', color: '#f87171', hint: 'Były próby wysyłki, ale żadna się nie powiodła.' },
    waiting: { label: 'Czeka na pierwszego odbiorcę', color: '#94a3b8', hint: 'Nie było jeszcze ani jednej próby — nikt uprawniony nie miał aplikacji. To nie jest awaria.' },
    unknown: { label: 'Zdarzeniowa', color: '#64748b', hint: 'Ścieżka bez limitu ciszy: brak ruchu znaczy tylko, że nikt nic nie zrobił.' },
};

function fmtWhen(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMin < 1) return 'przed chwilą';
    if (diffMin < 60) return `${diffMin} min temu`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)} godz. temu`;
    return `${Math.floor(diffMin / 1440)} dni temu (${d.toLocaleDateString('pl-PL')})`;
}

function fmtStamp(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: '1rem 1.1rem',
};

const th: React.CSSProperties = {
    textAlign: 'left',
    padding: '0.5rem 0.6rem',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    whiteSpace: 'nowrap',
};

const td: React.CSSProperties = {
    padding: '0.6rem',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: '0.85rem',
    verticalAlign: 'top',
};

interface PatientDevice {
    platform: string | null;
    tokenTail: string;
    registeredAt: string;
    lastSeenAt: string;
    state: 'ok' | 'dead' | 'unknown';
    lastError: string | null;
    lastCheckedAt: string | null;
}

interface PatientRow {
    prodentisId: string;
    phone: string | null;
    email: string | null;
    accountStatus: string | null;
    lastLogin: string | null;
    prefs: Record<string, boolean> | null;
    devices: PatientDevice[];
    pushLive: boolean;
    pushDead: boolean;
}

const PREF_LABELS: Record<string, string> = {
    push_1h_before: 'push godzinę przed',
    sms_reminders: 'SMS-y przypominające',
    email_reminders: 'e-maile',
    post_visit_sms: 'SMS po wizycie',
    birthday_wishes: 'życzenia urodzinowe',
};

export default function DiagnostykaPushTab({ isAdmin = false }: { isAdmin?: boolean }) {
    const [data, setData] = useState<Diagnostics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Sekcja z pacjentami — wyłącznie dla admina, osobna trasa i osobny audyt.
    const [patients, setPatients] = useState<PatientRow[] | null>(null);
    const [names, setNames] = useState<Record<string, string>>({});
    const [patientsError, setPatientsError] = useState<string | null>(null);

    const loadPatients = useCallback(async () => {
        if (!isAdmin) return;
        setPatientsError(null);
        try {
            const res = await fetch('/api/admin/push/patient-devices', { cache: 'no-store' });
            const body = await res.json();
            if (!res.ok) {
                setPatientsError(body?.error ?? `Błąd ${res.status}`);
                return;
            }
            const rows = (body.patients ?? []) as PatientRow[];
            setPatients(rows);

            /**
             * Nazwiska dociągamy OSOBNO i wsadowo. Tożsamość pacjenta nie jest
             * przechowywana poza Prodentisem (zasada D3), więc lista urządzeń zna
             * wyłącznie identyfikatory — nazwisko pojawia się dopiero na ekranie,
             * przez trasę, która ma własny audyt i pamięć podręczną.
             */
            const ids = rows.map(r => r.prodentisId).slice(0, 50);
            if (ids.length > 0) {
                const lr = await fetch(`/api/employee/patient-label?prodentisIds=${ids.join(',')}`, { cache: 'no-store' });
                if (lr.ok) {
                    const lb = await lr.json();
                    const map: Record<string, string> = {};
                    for (const p of (lb.patients ?? []) as Array<{ id: string; fullName: string }>) {
                        map[p.id] = p.fullName;
                    }
                    setNames(map);
                }
                // Brak nazwisk nie jest błędem tego ekranu — identyfikator wystarcza,
                // żeby administrator wiedział, o kogo chodzi.
            }
        } catch (e) {
            setPatientsError((e as Error).message);
        }
    }, [isAdmin]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/employee/push/diagnostics', { cache: 'no-store' });
            const body = await res.json();
            if (!res.ok) {
                setError(body?.error ?? `Błąd ${res.status}`);
                return;
            }
            setData(body);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);
    useEffect(() => { void loadPatients(); }, [loadPatients]);

    const problems = data?.paths.filter(p => p.status === 'silent' || p.status === 'never') ?? [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Nagłówek */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <Activity size={20} style={{ color: '#38bdf8' }} />
                <h2 style={{ margin: 0, color: '#fff', fontSize: '1.15rem' }}>Diagnostyka powiadomień</h2>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem' }}>
                    {data ? `stan na ${fmtStamp(data.generatedAt)}` : ''}
                </span>
                <button
                    onClick={() => void load()}
                    disabled={loading}
                    style={{
                        marginLeft: 'auto',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '0.45rem 0.9rem',
                        background: 'rgba(56,189,248,0.15)',
                        border: '1px solid rgba(56,189,248,0.4)',
                        borderRadius: 10,
                        color: '#38bdf8',
                        fontSize: '0.82rem',
                        cursor: loading ? 'default' : 'pointer',
                    }}
                >
                    <RefreshCw size={14} /> Odśwież
                </button>
            </div>

            {error && (
                <div style={{ ...card, borderColor: 'rgba(248,113,113,0.4)', background: 'rgba(248,113,113,0.1)', color: '#fca5a5' }}>
                    <AlertTriangle size={15} style={{ display: 'inline', marginRight: 6 }} /> {error}
                </div>
            )}

            {loading && !data ? (
                <div style={{ ...card, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Ładowanie…</div>
            ) : !data ? null : (
                <>
                    {/* Werdykt */}
                    <div
                        style={{
                            ...card,
                            borderColor: problems.length ? 'rgba(248,113,113,0.45)' : 'rgba(74,222,128,0.35)',
                            background: problems.length ? 'rgba(248,113,113,0.08)' : 'rgba(74,222,128,0.07)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                        }}
                    >
                        {problems.length ? <XCircle size={22} color="#f87171" /> : <CheckCircle2 size={22} color="#4ade80" />}
                        <div>
                            <div style={{ color: '#fff', fontWeight: 600 }}>
                                {problems.length
                                    ? `Problem na ${problems.length} ${problems.length === 1 ? 'ścieżce' : 'ścieżkach'}`
                                    : 'Żadna ścieżka nie zgłasza problemu'}
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', marginTop: 2 }}>
                                {problems.length
                                    ? problems.map(p => p.label).join(' · ')
                                    : 'Ścieżki „czeka na pierwszego odbiorcę" to nie awaria — po prostu nikt uprawniony nie miał jeszcze aplikacji.'}
                            </div>
                        </div>
                    </div>

                    {/* Kafelki liczbowe */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
                        <Stat
                            icon={<Send size={15} />}
                            label="Próby wysyłki (24 h)"
                            value={String(data.attempts24h.total)}
                            sub="wpisy w historii — sama próba, nie dowód dostarczenia"
                        />
                        <Stat
                            icon={<CheckCircle2 size={15} />}
                            label="Dostarczone (24 h)"
                            value={`${data.receipts.last24h.delivered} / ${data.receipts.last24h.checked}`}
                            sub="potwierdzenia z Expo"
                            color={data.receipts.last24h.failed > 0 ? '#fbbf24' : '#4ade80'}
                        />
                        <Stat
                            icon={<XCircle size={15} />}
                            label="Niedostarczone (24 h)"
                            value={String(data.receipts.last24h.failed)}
                            sub={Object.entries(data.receipts.last24h.errors).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'brak'}
                            color={data.receipts.last24h.failed > 0 ? '#f87171' : undefined}
                        />
                        <Stat
                            icon={<Clock size={15} />}
                            label="Czeka na potwierdzenie"
                            value={String(data.receipts.pending)}
                            sub="cron sprawdza receipty co 20 min"
                        />
                        <Stat
                            icon={<Smartphone size={15} />}
                            label="Aplikacja — pacjenci"
                            value={String(data.tokens.patients.total)}
                            sub={
                                Object.entries(data.tokens.patients.byPlatform).map(([k, v]) => `${k}: ${v}`).join(' · ') ||
                                'brak urządzeń'
                            }
                        />
                        <Stat
                            icon={<Smartphone size={15} />}
                            label="Aplikacja — personel"
                            value={String(data.tokens.staff.total)}
                            sub={
                                Object.entries(data.tokens.staff.byPlatform).map(([k, v]) => `${k}: ${v}`).join(' · ') ||
                                'brak urządzeń'
                            }
                        />
                    </div>

                    {/* Ścieżki */}
                    <div style={card}>
                        <h3 style={{ margin: '0 0 0.2rem', color: '#fff', fontSize: '0.95rem' }}>Ścieżki powiadomień</h3>
                        <p style={{ margin: '0 0 0.7rem', color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem' }}>
                            Rejestr odpowiada na pytanie, <b>kiedy dana droga OSTATNIO REALNIE zadziałała</b> — historia
                            wysyłek tego nie pokazuje, bo zapisuje się niezależnie od dostarczenia.
                        </p>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 680 }}>
                                <thead>
                                    <tr>
                                        <th style={th}>Ścieżka</th>
                                        <th style={th}>Stan</th>
                                        <th style={th}>Ostatni sukces</th>
                                        <th style={th}>Ostatnia próba</th>
                                        <th style={th}>Próby / błędy 24 h</th>
                                        <th style={th}>Limit ciszy</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.paths.map(p => {
                                        const meta = STATUS_META[p.status] ?? STATUS_META.unknown;
                                        const stats = data.receipts.perPath[p.path_key];
                                        return (
                                            <tr key={p.path_key}>
                                                <td style={td}>
                                                    <div style={{ fontWeight: 600 }}>{p.label}</div>
                                                    <code style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>{p.path_key}</code>
                                                    {stats && (
                                                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', marginTop: 3 }}>
                                                            receipty 7 dni: {stats.delivered} dostarczone
                                                            {stats.failed > 0 ? `, ${stats.failed} nie` : ''}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={td}>
                                                    <span style={{ color: meta.color, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                        ● {meta.label}
                                                    </span>
                                                    <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', maxWidth: 260, marginTop: 3 }}>
                                                        {meta.hint}
                                                    </div>
                                                    {p.last_error && (
                                                        <div style={{ color: '#fca5a5', fontSize: '0.72rem', marginTop: 3 }}>
                                                            {p.last_error}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={td}>{fmtWhen(p.last_success_at)}</td>
                                                <td style={td}>{fmtWhen(p.last_attempt_at)}</td>
                                                <td style={td}>
                                                    {p.attempts_24h}
                                                    {p.failures_24h > 0 && (
                                                        <span style={{ color: '#f87171' }}> / {p.failures_24h}</span>
                                                    )}
                                                </td>
                                                <td style={td}>
                                                    {p.max_silence_minutes == null
                                                        ? '—'
                                                        : `${Math.round(p.max_silence_minutes / 60)} h`}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Ostatnie niepowodzenia */}
                    <div style={card}>
                        <h3 style={{ margin: '0 0 0.2rem', color: '#fff', fontSize: '0.95rem' }}>Ostatnie niedostarczone</h3>
                        <p style={{ margin: '0 0 0.7rem', color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem' }}>
                            <b>DeviceNotRegistered</b> = użytkownik odinstalował aplikację albo zmienił urządzenie; taki token
                            cron usuwa sam. Potwierdzenie „ok" znaczy tylko, że Expo przekazało wiadomość do Apple/Google.
                        </p>
                        {data.receipts.recentFailures.length === 0 ? (
                            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem' }}>
                                Brak niedostarczonych powiadomień w ostatnich 7 dniach.
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 520 }}>
                                    <thead>
                                        <tr>
                                            <th style={th}>Kiedy</th>
                                            <th style={th}>Ścieżka</th>
                                            <th style={th}>Odbiorca</th>
                                            <th style={th}>Powód</th>
                                            <th style={th}>Urządzenie</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.receipts.recentFailures.map((f, i) => (
                                            <tr key={i}>
                                                <td style={td}>{fmtStamp(f.at)}</td>
                                                <td style={td}>{f.path ?? '—'}</td>
                                                <td style={td}>{f.audience}</td>
                                                <td style={{ ...td, color: '#fca5a5' }}>{f.error}</td>
                                                <td style={{ ...td, color: 'rgba(255,255,255,0.45)' }}>{f.tokenTail ?? '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Crony */}
                    <div style={card}>
                        <h3 style={{ margin: '0 0 0.7rem', color: '#fff', fontSize: '0.95rem' }}>Zadania cykliczne</h3>
                        {data.crons.length === 0 ? (
                            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem' }}>
                                Brak wpisów — żaden z cronów push nie zaraportował jeszcze przebiegu.
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
                                {data.crons.map(c => {
                                    const color = c.status === 'ok' ? '#4ade80' : c.status === 'warn' ? '#fbbf24' : '#f87171';
                                    return (
                                        <div key={c.cron_name} style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: '0.7rem 0.8rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                                <code style={{ color: '#fff', fontSize: '0.8rem' }}>{c.cron_name}</code>
                                                <span style={{ color, fontSize: '0.75rem', fontWeight: 600 }}>{c.status}</span>
                                            </div>
                                            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.73rem', marginTop: 3 }}>
                                                {fmtWhen(c.last_run_at)}
                                                {c.duration_ms != null ? ` · ${c.duration_ms} ms` : ''}
                                            </div>
                                            {c.message && (
                                                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', marginTop: 4 }}>
                                                    {c.message}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Pacjenci z aplikacją — TYLKO ADMIN */}
                    {isAdmin && (
                        <div style={{ ...card, borderColor: 'rgba(232,121,249,0.3)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <h3 style={{ margin: 0, color: '#fff', fontSize: '0.95rem' }}>Pacjenci z aplikacją</h3>
                                <span
                                    style={{
                                        padding: '0.15rem 0.55rem',
                                        borderRadius: 999,
                                        background: 'rgba(232,121,249,0.15)',
                                        border: '1px solid rgba(232,121,249,0.4)',
                                        color: '#e879f9',
                                        fontSize: '0.68rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                    }}
                                >
                                    tylko admin
                                </span>
                                <button
                                    onClick={() => void loadPatients()}
                                    style={{
                                        marginLeft: 'auto',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        padding: '0.3rem 0.7rem',
                                        background: 'transparent',
                                        border: '1px solid rgba(255,255,255,0.18)',
                                        borderRadius: 8,
                                        color: 'rgba(255,255,255,0.7)',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <RefreshCw size={12} /> Odśwież
                                </button>
                            </div>
                            <p style={{ margin: '0.4rem 0 0.8rem', color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem' }}>
                                Zawiera dane kontaktowe pacjentów, więc każde otwarcie tej sekcji trafia do dziennika audytu.
                                <b> „Push działa"</b> znaczy, że ostatnie potwierdzenie z urządzenia nie zgłosiło wyrejestrowania —
                                to co innego niż <b>preferencje</b>, które pacjent ustawia sam w profilu.
                            </p>

                            {patientsError ? (
                                <div style={{ color: '#fca5a5', fontSize: '0.85rem' }}>
                                    <AlertTriangle size={14} style={{ display: 'inline', marginRight: 6 }} />
                                    {patientsError}
                                </div>
                            ) : !patients ? (
                                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem' }}>Ładowanie…</div>
                            ) : patients.length === 0 ? (
                                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem' }}>
                                    Żaden pacjent nie ma jeszcze zarejestrowanego urządzenia.
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 760 }}>
                                        <thead>
                                            <tr>
                                                <th style={th}>Pacjent</th>
                                                <th style={th}>Kontakt</th>
                                                <th style={th}>Push</th>
                                                <th style={th}>Urządzenia</th>
                                                <th style={th}>Wyłączone w profilu</th>
                                                <th style={th}>Ostatnia aktywność</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {patients.map(p => {
                                                const off = Object.entries(p.prefs ?? {})
                                                    .filter(([, v]) => v === false)
                                                    .map(([k]) => PREF_LABELS[k] ?? k);
                                                const pushColor = p.pushLive ? '#4ade80' : p.pushDead ? '#f87171' : '#fbbf24';
                                                const pushLabel = p.pushLive
                                                    ? 'Działa'
                                                    : p.pushDead
                                                        ? 'Wyrejestrowany'
                                                        : 'Brak potwierdzeń';
                                                return (
                                                    <tr key={p.prodentisId}>
                                                        <td style={td}>
                                                            <div style={{ fontWeight: 600 }}>
                                                                {names[p.prodentisId] ?? '—'}
                                                            </div>
                                                            <code style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>
                                                                {p.prodentisId}
                                                            </code>
                                                            {p.accountStatus && p.accountStatus !== 'active' && (
                                                                <div style={{ color: '#fbbf24', fontSize: '0.7rem' }}>
                                                                    konto: {p.accountStatus}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{ ...td, fontSize: '0.78rem' }}>
                                                            <div>{p.phone ?? '—'}</div>
                                                            <div style={{ color: 'rgba(255,255,255,0.45)' }}>{p.email ?? '—'}</div>
                                                        </td>
                                                        <td style={td}>
                                                            <span style={{ color: pushColor, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                                ● {pushLabel}
                                                            </span>
                                                        </td>
                                                        <td style={{ ...td, fontSize: '0.76rem' }}>
                                                            {p.devices.map((d, i) => (
                                                                <div key={i} style={{ marginBottom: 3 }}>
                                                                    {d.platform ?? 'nieznana'}{' '}
                                                                    <code style={{ color: 'rgba(255,255,255,0.35)' }}>{d.tokenTail}</code>
                                                                    {d.state === 'dead' && (
                                                                        <span style={{ color: '#f87171' }}> · {d.lastError}</span>
                                                                    )}
                                                                    {d.state === 'unknown' && (
                                                                        <span style={{ color: 'rgba(255,255,255,0.4)' }}> · bez potwierdzeń</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </td>
                                                        <td style={{ ...td, fontSize: '0.76rem', color: off.length ? '#fbbf24' : 'rgba(255,255,255,0.4)' }}>
                                                            {off.length ? off.join(', ') : 'nic'}
                                                        </td>
                                                        <td style={{ ...td, fontSize: '0.78rem' }}>
                                                            {fmtWhen(p.devices[0]?.lastSeenAt ?? null)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Rozbicie prób */}
                    <div style={card}>
                        <h3 style={{ margin: '0 0 0.7rem', color: '#fff', fontSize: '0.95rem' }}>Próby wysyłki z ostatniej doby</h3>
                        {data.attempts24h.total === 0 ? (
                            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem' }}>
                                Brak jakichkolwiek prób w ostatniej dobie.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {Object.entries(data.attempts24h.byTag)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([tag, n]) => (
                                        <span
                                            key={tag}
                                            style={{
                                                padding: '0.3rem 0.7rem',
                                                background: 'rgba(255,255,255,0.06)',
                                                borderRadius: 999,
                                                color: '#fff',
                                                fontSize: '0.78rem',
                                            }}
                                        >
                                            {tag} · <b>{n}</b>
                                        </span>
                                    ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

function Stat({
    icon,
    label,
    value,
    sub,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
    color?: string;
}) {
    return (
        <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.55)', fontSize: '0.76rem' }}>
                {icon} {label}
            </div>
            <div style={{ color: color ?? '#fff', fontSize: '1.45rem', fontWeight: 700, marginTop: 4 }}>{value}</div>
            {sub && <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: '0.72rem', marginTop: 2 }}>{sub}</div>}
        </div>
    );
}
