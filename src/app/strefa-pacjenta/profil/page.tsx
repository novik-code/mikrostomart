'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePatientAuth } from '@/hooks/usePatientAuth';

interface PatientData {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    locale: string;
    address?: {
        street?: string;
        houseNumber?: string;
        apartmentNumber?: string;
        postalCode?: string;
        city?: string;
    };
}

export default function PatientProfile() {
    const { patient, isLoading, accountStatus, logout, getAuthToken } = usePatientAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [email, setEmail] = useState('');
    const [locale, setLocale] = useState('pl');
    const [message, setMessage] = useState('');
    const [emailLoaded, setEmailLoaded] = useState(false);
    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState('');
    // Notification preferences
    const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({
        sms_reminders: true,
        email_reminders: true,
        birthday_wishes: true,
        push_1h_before: true,
        post_visit_sms: true,
    });
    const [notifLoaded, setNotifLoaded] = useState(false);
    const [isSavingNotifs, setIsSavingNotifs] = useState(false);
    const [notifMessage, setNotifMessage] = useState('');
    // RODO delete account
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteMessage, setDeleteMessage] = useState('');
    const router = useRouter();

    // Sync email/locale from patient data once loaded
    if (patient && !emailLoaded) {
        setEmail(patient.email || '');
        setLocale(patient.locale || 'pl');
        setEmailLoaded(true);
    }

    // Sync notification preferences once
    if (patient && !notifLoaded && (patient as any).notification_preferences) {
        setNotifPrefs({ ...notifPrefs, ...(patient as any).notification_preferences });
        setNotifLoaded(true);
    }

    const handleSaveEmail = async () => {
        setIsSaving(true);
        setMessage('');

        try {
            const token = getAuthToken();
            const res = await fetch('/api/patients/me', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ email, locale }),
            });

            const data = await res.json();

            if (!res.ok) {
                setMessage('❌ ' + (data.error || 'Nie udało się zaktualizować emaila'));
                return;
            }

            setMessage('✅ Email został zaktualizowany!');
        } catch (err) {
            console.error('Failed to update email:', err);
            setMessage('❌ Wystąpił błąd podczas zapisywania');
        } finally {
            setIsSaving(false);
        }
    };

    const handleChangePassword = async () => {
        setPasswordMessage('');

        if (!currentPassword || !newPassword || !confirmPassword) {
            setPasswordMessage('❌ Wypełnij wszystkie pola');
            return;
        }
        if (newPassword.length < 6) {
            setPasswordMessage('❌ Nowe hasło musi mieć minimum 6 znaków');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordMessage('❌ Hasła nie są identyczne');
            return;
        }

        setIsChangingPassword(true);
        try {
            const token = getAuthToken();
            const res = await fetch('/api/patients/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await res.json();
            if (!res.ok) {
                setPasswordMessage('❌ ' + (data.error || 'Nie udało się zmienić hasła'));
                return;
            }
            setPasswordMessage('✅ Hasło zostało zmienione!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            console.error('Password change error:', err);
            setPasswordMessage('❌ Wystąpił błąd');
        } finally {
            setIsChangingPassword(false);
        }
    };

    if (isLoading || !patient) {
        return <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 2rem',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.9rem',
        }}>
            Ładowanie danych...
        </div>;
    }

    return (
        <>

            {/* Main Content */}
            {accountStatus === null || accountStatus === 'active' ? (
                <div style={{
                    maxWidth: '800px',
                    margin: '0 auto',
                    padding: '2rem',
                }}>
                    {/* Personal Info (Read-only) */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '1rem',
                        padding: '2rem',
                        marginBottom: '2rem',
                    }}>
                        <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                            Dane osobowe
                        </h2>

                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                    Imię i nazwisko
                                </label>
                                <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '500' }}>
                                    {patient.firstName} {patient.lastName}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                    Telefon
                                </label>
                                <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '500' }}>
                                    {patient.phone}
                                </div>
                            </div>

                            {patient.address && (
                                <div>
                                    <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                        Adres
                                    </label>
                                    <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: '500' }}>
                                        {patient.address.street} {patient.address.houseNumber}
                                        {patient.address.apartmentNumber && `/${patient.address.apartmentNumber}`}
                                        <br />
                                        {patient.address.postalCode} {patient.address.city}
                                    </div>
                                </div>
                            )}

                            <div style={{
                                background: 'rgba(59, 130, 246, 0.1)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                borderRadius: '0.75rem',
                                padding: '1rem',
                                fontSize: '0.9rem',
                                color: '#60a5fa',
                            }}>
                                ℹ️ Dane osobowe są pobierane z systemu Mikrostomart i nie mogą być zmieniane w portalu. W celu aktualizacji skontaktuj się z recepcją.
                            </div>
                        </div>
                    </div>

                    {/* Contact Info (Editable) */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '1rem',
                        padding: '2rem',
                    }}>
                        <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                            Dane kontaktowe
                        </h2>

                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            <div>
                                <label style={{
                                    display: 'block',
                                    color: 'rgba(255, 255, 255, 0.9)',
                                    fontSize: '0.9rem',
                                    fontWeight: '500',
                                    marginBottom: '0.5rem',
                                }}>
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="twoj@email.com"
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem 1rem',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '0.5rem',
                                        color: '#fff',
                                        fontSize: '1rem',
                                        outline: 'none',
                                    }}
                                />
                            </div>

                            {/* Language Preference */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    color: 'rgba(255, 255, 255, 0.9)',
                                    fontSize: '0.9rem',
                                    fontWeight: '500',
                                    marginBottom: '0.5rem',
                                }}>
                                    Preferowany język / Preferred language
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {[
                                        { code: 'pl', flag: '🇵🇱', label: 'Polski' },
                                        { code: 'en', flag: '🇬🇧', label: 'English' },
                                        { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
                                        { code: 'ua', flag: '🇺🇦', label: 'Українська' },
                                    ].map(lang => (
                                        <button
                                            key={lang.code}
                                            onClick={() => setLocale(lang.code)}
                                            style={{
                                                padding: '0.625rem 1rem',
                                                background: locale === lang.code
                                                    ? 'rgba(220, 177, 74, 0.2)'
                                                    : 'rgba(255, 255, 255, 0.05)',
                                                border: locale === lang.code
                                                    ? '2px solid rgba(220, 177, 74, 0.6)'
                                                    : '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '0.5rem',
                                                color: locale === lang.code ? '#dcb14a' : 'rgba(255, 255, 255, 0.7)',
                                                cursor: 'pointer',
                                                fontSize: '0.9rem',
                                                fontWeight: locale === lang.code ? 'bold' : 'normal',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            {lang.flag} {lang.label}
                                        </button>
                                    ))}
                                </div>
                                <p style={{
                                    color: 'rgba(255, 255, 255, 0.4)',
                                    fontSize: '0.8rem',
                                    marginTop: '0.5rem',
                                }}>
                                    Powiadomienia email i SMS będą wysyłane w wybranym języku
                                </p>
                            </div>

                            {message && (
                                <div style={{
                                    background: 'rgba(34, 197, 94, 0.1)',
                                    border: '1px solid rgba(34, 197, 94, 0.3)',
                                    borderRadius: '0.5rem',
                                    padding: '0.875rem',
                                    color: '#22c55e',
                                    fontSize: '0.9rem',
                                }}>
                                    {message}
                                </div>
                            )}

                            <button
                                onClick={handleSaveEmail}
                                disabled={isSaving}
                                style={{
                                    padding: '1rem',
                                    background: isSaving ? 'rgba(220, 177, 74, 0.5)' : 'linear-gradient(135deg, #dcb14a, #f0c96c)',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    color: '#000',
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    cursor: isSaving ? 'not-allowed' : 'pointer',
                                    opacity: isSaving ? 0.7 : 1,
                                    transition: 'transform 0.2s',
                                }}
                                onMouseEnter={(e) => !isSaving && (e.currentTarget.style.transform = 'translateY(-2px)')}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                {isSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
                            </button>
                        </div>
                    </div>

                    {/* Change Password */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '1rem',
                        padding: '2rem',
                        marginTop: '2rem',
                    }}>
                        <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                            🔒 Zmiana hasła
                        </h2>

                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <div>
                                <label style={{
                                    display: 'block',
                                    color: 'rgba(255, 255, 255, 0.9)',
                                    fontSize: '0.9rem',
                                    fontWeight: '500',
                                    marginBottom: '0.5rem',
                                }}>
                                    Aktualne hasło
                                </label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Wpisz aktualne hasło"
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem 1rem',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '0.5rem',
                                        color: '#fff',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    color: 'rgba(255, 255, 255, 0.9)',
                                    fontSize: '0.9rem',
                                    fontWeight: '500',
                                    marginBottom: '0.5rem',
                                }}>
                                    Nowe hasło
                                </label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Minimum 6 znaków"
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem 1rem',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '0.5rem',
                                        color: '#fff',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    color: 'rgba(255, 255, 255, 0.9)',
                                    fontSize: '0.9rem',
                                    fontWeight: '500',
                                    marginBottom: '0.5rem',
                                }}>
                                    Potwierdź nowe hasło
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Powtórz nowe hasło"
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem 1rem',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '0.5rem',
                                        color: '#fff',
                                        fontSize: '1rem',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                    }}
                                />
                            </div>

                            {passwordMessage && (
                                <div style={{
                                    background: passwordMessage.includes('✅') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    border: `1px solid ${passwordMessage.includes('✅') ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                    borderRadius: '0.5rem',
                                    padding: '0.875rem',
                                    color: passwordMessage.includes('✅') ? '#22c55e' : '#ef4444',
                                    fontSize: '0.9rem',
                                }}>
                                    {passwordMessage}
                                </div>
                            )}

                            <button
                                onClick={handleChangePassword}
                                disabled={isChangingPassword}
                                style={{
                                    padding: '1rem',
                                    background: isChangingPassword ? 'rgba(220, 177, 74, 0.5)' : 'linear-gradient(135deg, #dcb14a, #f0c96c)',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    color: '#000',
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    cursor: isChangingPassword ? 'not-allowed' : 'pointer',
                                    opacity: isChangingPassword ? 0.7 : 1,
                                    transition: 'transform 0.2s',
                                }}
                                onMouseEnter={(e) => !isChangingPassword && (e.currentTarget.style.transform = 'translateY(-2px)')}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                {isChangingPassword ? 'Zmieniam hasło...' : '🔒 Zmień hasło'}
                            </button>
                        </div>
                    </div>

                    {/* Notification Preferences */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '1rem',
                        padding: '2rem',
                        marginTop: '2rem',
                    }}>
                        <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                            🔔 Preferencje powiadomień
                        </h2>

                        <div style={{ display: 'grid', gap: '1rem' }}>
                            {[
                                { key: 'sms_reminders', label: '📱 Przypomnienia SMS o wizytach', desc: 'SMS dzień przed wizytą' },
                                { key: 'email_reminders', label: '📧 Przypomnienia email', desc: 'Powiadomienia email o wizytach' },
                                { key: 'push_1h_before', label: '📢 Push notification 1h przed', desc: 'Powiadomienie w przeglądarce 1h przed wizytą' },
                                { key: 'birthday_wishes', label: '🎂 Życzenia urodzinowe', desc: 'SMS z życzeniami w dniu urodzin' },
                                { key: 'post_visit_sms', label: '⭐ SMS po wizycie', desc: 'Ankieta satysfakcji po wizycie' },
                            ].map(item => (
                                <div key={item.key} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    borderRadius: '0.75rem',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                }}>
                                    <div>
                                        <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: '500' }}>{item.label}</div>
                                        <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{item.desc}</div>
                                    </div>
                                    <button
                                        onClick={() => setNotifPrefs(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                                        style={{
                                            width: '52px',
                                            height: '28px',
                                            borderRadius: '14px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            position: 'relative',
                                            transition: 'background 0.2s',
                                            background: notifPrefs[item.key] ? '#dcb14a' : 'rgba(255, 255, 255, 0.15)',
                                            flexShrink: 0,
                                        }}
                                    >
                                        <div style={{
                                            width: '22px',
                                            height: '22px',
                                            borderRadius: '50%',
                                            background: '#fff',
                                            position: 'absolute',
                                            top: '3px',
                                            left: notifPrefs[item.key] ? '27px' : '3px',
                                            transition: 'left 0.2s',
                                        }} />
                                    </button>
                                </div>
                            ))}

                            {notifMessage && (
                                <div style={{
                                    background: notifMessage.includes('✅') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    border: `1px solid ${notifMessage.includes('✅') ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                    borderRadius: '0.5rem',
                                    padding: '0.875rem',
                                    color: notifMessage.includes('✅') ? '#22c55e' : '#ef4444',
                                    fontSize: '0.9rem',
                                }}>
                                    {notifMessage}
                                </div>
                            )}

                            <button
                                onClick={async () => {
                                    setIsSavingNotifs(true);
                                    setNotifMessage('');
                                    try {
                                        const token = getAuthToken();
                                        const res = await fetch('/api/patients/me', {
                                            method: 'PATCH',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                                            },
                                            body: JSON.stringify({ notification_preferences: notifPrefs }),
                                        });
                                        if (!res.ok) throw new Error();
                                        setNotifMessage('✅ Preferencje zapisane!');
                                    } catch {
                                        setNotifMessage('❌ Nie udało się zapisać');
                                    } finally {
                                        setIsSavingNotifs(false);
                                    }
                                }}
                                disabled={isSavingNotifs}
                                style={{
                                    padding: '1rem',
                                    background: isSavingNotifs ? 'rgba(220, 177, 74, 0.5)' : 'linear-gradient(135deg, #dcb14a, #f0c96c)',
                                    border: 'none',
                                    borderRadius: '0.5rem',
                                    color: '#000',
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                    cursor: isSavingNotifs ? 'not-allowed' : 'pointer',
                                    opacity: isSavingNotifs ? 0.7 : 1,
                                    transition: 'transform 0.2s',
                                }}
                                onMouseEnter={(e) => !isSavingNotifs && (e.currentTarget.style.transform = 'translateY(-2px)')}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                {isSavingNotifs ? 'Zapisywanie...' : 'Zapisz preferencje'}
                            </button>
                        </div>
                    </div>

                    {/* RODO Section */}
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.03)',
                        border: '1px solid rgba(239, 68, 68, 0.15)',
                        borderRadius: '1rem',
                        padding: '2rem',
                        marginTop: '2rem',
                    }}>
                        <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                            🛡️ Twoje dane (RODO)
                        </h2>
                        <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            Zgodnie z RODO masz prawo do pobrania swoich danych oraz usunięcia konta.
                        </p>

                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                            <button
                                onClick={() => {
                                    const token = getAuthToken();
                                    const headers: Record<string, string> = {};
                                    if (token) headers['Authorization'] = `Bearer ${token}`;
                                    fetch('/api/patients/export-data', { headers })
                                        .then(res => res.blob())
                                        .then(blob => {
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `moje-dane-mikrostomart-${new Date().toISOString().split('T')[0]}.json`;
                                            a.click();
                                            URL.revokeObjectURL(url);
                                        });
                                }}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '0.5rem',
                                    color: 'rgba(255, 255, 255, 0.8)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                            >
                                💾 Pobierz moje dane
                            </button>

                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '0.5rem',
                                    color: '#ef4444',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                            >
                                ⚠️ Usuń konto
                            </button>
                        </div>

                        {showDeleteConfirm && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                borderRadius: '0.75rem',
                                padding: '1.5rem',
                            }}>
                                <p style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '0.75rem' }}>
                                    ⚠️ Czy na pewno chcesz usunąć konto?
                                </p>
                                <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                                    Ta operacja jest nieodwracalna. Wszystkie Twoje dane osobowe zostaną zanonimizowane.
                                    Historia wizyt zostanie zachowana w formie zanonimizowanej.
                                </p>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                                        Potwierdź hasłem:
                                    </label>
                                    <input
                                        type="password"
                                        value={deletePassword}
                                        onChange={(e) => setDeletePassword(e.target.value)}
                                        placeholder="Wpisz hasło"
                                        style={{
                                            width: '100%',
                                            maxWidth: '300px',
                                            padding: '0.75rem 1rem',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                            borderRadius: '0.5rem',
                                            color: '#fff',
                                            fontSize: '0.9rem',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                        }}
                                    />
                                </div>

                                {deleteMessage && (
                                    <div style={{
                                        color: '#ef4444',
                                        fontSize: '0.85rem',
                                        marginBottom: '1rem',
                                    }}>
                                        {deleteMessage}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button
                                        onClick={async () => {
                                            if (!deletePassword) {
                                                setDeleteMessage('Podaj hasło');
                                                return;
                                            }
                                            setIsDeleting(true);
                                            setDeleteMessage('');
                                            try {
                                                const token = getAuthToken();
                                                const res = await fetch('/api/patients/delete-account', {
                                                    method: 'POST',
                                                    headers: {
                                                        'Content-Type': 'application/json',
                                                        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                                                    },
                                                    body: JSON.stringify({ password: deletePassword }),
                                                });
                                                const data = await res.json();
                                                if (!res.ok) {
                                                    setDeleteMessage(data.error || 'Nie udało się usunąć konta');
                                                    return;
                                                }
                                                // Success — redirect to login
                                                localStorage.removeItem('patient_data');
                                                document.cookie = 'patient_token=; path=/; max-age=0';
                                                router.push('/strefa-pacjenta/login');
                                            } catch {
                                                setDeleteMessage('Wystąpił błąd');
                                            } finally {
                                                setIsDeleting(false);
                                            }
                                        }}
                                        disabled={isDeleting}
                                        style={{
                                            padding: '0.75rem 1.5rem',
                                            background: '#ef4444',
                                            border: 'none',
                                            borderRadius: '0.5rem',
                                            color: '#fff',
                                            fontWeight: 'bold',
                                            cursor: isDeleting ? 'not-allowed' : 'pointer',
                                            opacity: isDeleting ? 0.7 : 1,
                                        }}
                                    >
                                        {isDeleting ? 'Usuwanie...' : 'Tak, usuń konto'}
                                    </button>
                                    <button
                                        onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteMessage(''); }}
                                        style={{
                                            padding: '0.75rem 1.5rem',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.2)',
                                            borderRadius: '0.5rem',
                                            color: 'rgba(255, 255, 255, 0.8)',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Anuluj
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                // Pending or Rejected - Show restricted access
                <div style={{
                    maxWidth: '800px',
                    margin: '3rem auto',
                    padding: '3rem 2rem',
                    textAlign: 'center',
                }}>
                    <div style={{
                        fontSize: '4rem',
                        marginBottom: '1.5rem',
                    }}>
                        🔒
                    </div>
                    <h2 style={{
                        color: '#dcb14a',
                        fontSize: '1.8rem',
                        marginBottom: '1rem',
                    }}>
                        Dostęp ograniczony
                    </h2>
                    <p style={{
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '1.1rem',
                        lineHeight: 1.6,
                    }}>
                        Twoje konto wymaga zatwierdzenia przez administratora.<br />
                        Profil będzie dostępny po weryfikacji.
                    </p>
                </div>
            )}
        </>
    );
}
