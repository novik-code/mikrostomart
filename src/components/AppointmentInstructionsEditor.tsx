'use client';

import { useState, useEffect } from 'react';
import styles from './AppointmentInstructionsEditor.module.css';

interface AppointmentInstruction {
    id: string;
    appointment_type: string;
    title: string;
    subtitle: string | null;
    icon: string | null;
    content: string;
    preparation_time: string | null;
    what_to_bring: string[] | null;
    important_notes: string[] | null;
}

export default function AppointmentInstructionsEditor() {
    const [instructions, setInstructions] = useState<AppointmentInstruction[]>([]);
    const [selectedInstruction, setSelectedInstruction] = useState<AppointmentInstruction | null>(null);
    const [editedInstruction, setEditedInstruction] = useState<AppointmentInstruction | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        fetchInstructions();
    }, []);

    const fetchInstructions = async () => {
        try {
            const res = await fetch('/api/admin/appointment-instructions');
            if (res.ok) {
                const data = await res.json();
                setInstructions(data.instructions);
            }
        } catch (err) {
            console.error('Failed to fetch instructions:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectInstruction = (instruction: AppointmentInstruction) => {
        setSelectedInstruction(instruction);
        setEditedInstruction({ ...instruction });
        setPreviewMode(false);
        setSuccessMessage(null);
    };

    const handleSave = async () => {
        if (!editedInstruction) return;

        setSaving(true);
        try {
            const res = await fetch(`/api/admin/appointment-instructions/${editedInstruction.appointment_type}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editedInstruction)
            });

            if (res.ok) {
                const data = await res.json();
                // Update local state
                setInstructions(instructions.map(i =>
                    i.appointment_type === editedInstruction.appointment_type ? data.instruction : i
                ));
                setSelectedInstruction(data.instruction);
                setSuccessMessage('✅ Zapisano zmiany!');
                setTimeout(() => setSuccessMessage(null), 3000);
            }
        } catch (err) {
            console.error('Failed to save:', err);
            alert('Błąd podczas zapisu!');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        if (selectedInstruction) {
            setEditedInstruction({ ...selectedInstruction });
        }
    };

    const getTypeIcon = (type: string) => {
        const icons: Record<string, string> = {
            'chirurgia': '⚕️',
            'pierwsza-wizyta': '👋',
            'protetyka': '🦷',
            'endodoncja': '🔬',
            'konsultacja': '💬',
            'zachowawcze': '🦷',
            'ortodoncja': '🦷',
            'higienizacja': '✨',
            'kontrola': '📋',
            'laser': '💡'
        };
        return icons[type] || '📄';
    };

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            'chirurgia': 'Chirurgia',
            'pierwsza-wizyta': 'Pierwsza Wizyta',
            'protetyka': 'Protetyka',
            'endodoncja': 'Endodoncja',
            'konsultacja': 'Konsultacja',
            'zachowawcze': 'Zachowawcza',
            'ortodoncja': 'Ortodoncja',
            'higienizacja': 'Higienizacja',
            'kontrola': 'Kontrola',
            'laser': 'Laser'
        };
        return labels[type] || type;
    };

    if (loading) {
        return <div className={styles.loading}>Ładowanie...</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>📋 Instrukcje Wizyt</h2>
                <p>Edytuj treści landing pages dla każdego typu wizyty</p>
            </div>

            <div className={styles.layout}>
                {/* Left Sidebar - List */}
                <div className={styles.sidebar}>
                    <h3>Typy Wizyt</h3>
                    <div className={styles.instructionList}>
                        {instructions.map(instruction => (
                            <div
                                key={instruction.id}
                                className={`${styles.instructionCard} ${selectedInstruction?.id === instruction.id ? styles.active : ''}`}
                                onClick={() => handleSelectInstruction(instruction)}
                            >
                                <div className={styles.cardIcon}>{getTypeIcon(instruction.appointment_type)}</div>
                                <div className={styles.cardContent}>
                                    <h4>{getTypeLabel(instruction.appointment_type)}</h4>
                                    <p>{instruction.title}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content - Editor or Empty State */}
                <div className={styles.mainContent}>
                    {!selectedInstruction ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>📝</div>
                            <h3>Wybierz typ wizyty</h3>
                            <p>Kliknij typ wizyty z listy po lewej, aby edytować jego treść</p>
                        </div>
                    ) : (
                        <>
                            {/* Top Bar */}
                            <div className={styles.topBar}>
                                <div className={styles.topBarLeft}>
                                    <span className={styles.typeIcon}>{editedInstruction?.icon}</span>
                                    <h3>{editedInstruction?.title}</h3>
                                </div>
                                <div className={styles.topBarRight}>
                                    <button
                                        className={`${styles.tabButton} ${!previewMode ? styles.active : ''}`}
                                        onClick={() => setPreviewMode(false)}
                                    >
                                        ✏️ Edytuj
                                    </button>
                                    <button
                                        className={`${styles.tabButton} ${previewMode ? styles.active : ''}`}
                                        onClick={() => setPreviewMode(true)}
                                    >
                                        👁️ Podgląd
                                    </button>
                                </div>
                            </div>

                            {successMessage && (
                                <div className={styles.successMessage}>{successMessage}</div>
                            )}

                            {/* Editor/Preview */}
                            {!previewMode ? (
                                <div className={styles.editorSection}>
                                    <div className={styles.formGroup}>
                                        <label>Tytuł</label>
                                        <input
                                            type="text"
                                            value={editedInstruction?.title || ''}
                                            onChange={(e) => setEditedInstruction({ ...editedInstruction!, title: e.target.value })}
                                            className={styles.input}
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Podtytuł (opcjonalnie)</label>
                                        <input
                                            type="text"
                                            value={editedInstruction?.subtitle || ''}
                                            onChange={(e) => setEditedInstruction({ ...editedInstruction!, subtitle: e.target.value })}
                                            className={styles.input}
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Ikona (emoji)</label>
                                        <input
                                            type="text"
                                            value={editedInstruction?.icon || ''}
                                            onChange={(e) => setEditedInstruction({ ...editedInstruction!, icon: e.target.value })}
                                            className={styles.input}
                                            placeholder="⚕️"
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>Czas przygotowania (opcjonalnie)</label>
                                        <input
                                            type="text"
                                            value={editedInstruction?.preparation_time || ''}
                                            onChange={(e) => setEditedInstruction({ ...editedInstruction!, preparation_time: e.target.value })}
                                            className={styles.input}
                                            placeholder="np. 2 godziny przed"
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>
                                            Treść główna (HTML)
                                            <span className={styles.hint}>Możesz używać: &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;</span>
                                        </label>
                                        <textarea
                                            value={editedInstruction?.content || ''}
                                            onChange={(e) => setEditedInstruction({ ...editedInstruction!, content: e.target.value })}
                                            className={styles.textarea}
                                            rows={15}
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>
                                            Co zabrać? (jeden na linię)
                                            <span className={styles.hint}>Każda linia = osobny punkt</span>
                                        </label>
                                        <textarea
                                            value={editedInstruction?.what_to_bring?.join('\n') || ''}
                                            onChange={(e) => setEditedInstruction({
                                                ...editedInstruction!,
                                                what_to_bring: e.target.value.split('\n').filter(Boolean)
                                            })}
                                            className={styles.textarea}
                                            rows={5}
                                            placeholder="Dowód osobisty&#10;Lista leków&#10;Skierowanie"
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label>
                                            Ważne uwagi (jeden na linię)
                                            <span className={styles.hint}>Wyświetlą się jako żółte "badges"</span>
                                        </label>
                                        <textarea
                                            value={editedInstruction?.important_notes?.join('\n') || ''}
                                            onChange={(e) => setEditedInstruction({
                                                ...editedInstruction!,
                                                important_notes: e.target.value.split('\n').filter(Boolean)
                                            })}
                                            className={styles.textarea}
                                            rows={4}
                                            placeholder="NIE jeść 2h przed&#10;Punktualne przybycie"
                                        />
                                    </div>

                                    {/* Action Buttons */}
                                    <div className={styles.actionButtons}>
                                        <button
                                            onClick={handleCancel}
                                            className={styles.btnSecondary}
                                            disabled={saving}
                                        >
                                            Anuluj
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            className={styles.btnPrimary}
                                            disabled={saving}
                                        >
                                            {saving ? 'Zapisywanie...' : '💾 Zapisz Zmiany'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* Preview Mode */
                                <div className={styles.previewSection}>
                                    <div className={styles.previewContent}>
                                        <div className={styles.previewHero}>
                                            <div className={styles.previewIcon}>{editedInstruction?.icon}</div>
                                            <h1>{editedInstruction?.title}</h1>
                                            {editedInstruction?.subtitle && (
                                                <p className={styles.previewSubtitle}>{editedInstruction.subtitle}</p>
                                            )}
                                        </div>

                                        {editedInstruction?.important_notes && editedInstruction.important_notes.length > 0 && (
                                            <div className={styles.previewNotes}>
                                                {editedInstruction.important_notes.map((note, idx) => (
                                                    <div key={idx} className={styles.previewNote}>
                                                        <span>⚠️</span> {note}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {editedInstruction?.what_to_bring && editedInstruction.what_to_bring.length > 0 && (
                                            <div className={styles.previewBox}>
                                                <h3>🎒 Co zabrać ze sobą?</h3>
                                                <ul>
                                                    {editedInstruction.what_to_bring.map((item, idx) => (
                                                        <li key={idx}>{item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {editedInstruction?.preparation_time && (
                                            <div className={styles.previewBox}>
                                                <h3>⏰ Przygotowanie</h3>
                                                <p><strong>{editedInstruction.preparation_time}</strong></p>
                                            </div>
                                        )}

                                        <div
                                            className={styles.previewHtmlContent}
                                            dangerouslySetInnerHTML={{ __html: editedInstruction?.content || '' }}
                                        />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
