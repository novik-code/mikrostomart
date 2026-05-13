'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
    const [previewOpen, setPreviewOpen] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const contentEditorRef = useRef<HTMLDivElement>(null);

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
        setPreviewOpen(false);
        setSuccessMessage(null);
        // Set contentEditable content after state update
        setTimeout(() => {
            if (contentEditorRef.current) {
                contentEditorRef.current.innerHTML = instruction.content || '';
            }
        }, 0);
    };

    const handleSave = async () => {
        if (!editedInstruction) return;

        // Sync contentEditable HTML to state before saving
        const currentContent = contentEditorRef.current?.innerHTML || '';
        const toSave = { ...editedInstruction, content: currentContent };

        setSaving(true);
        try {
            const res = await fetch(`/api/admin/appointment-instructions/${toSave.appointment_type}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(toSave)
            });

            if (res.ok) {
                const data = await res.json();
                setInstructions(instructions.map(i =>
                    i.appointment_type === toSave.appointment_type ? data.instruction : i
                ));
                setSelectedInstruction(data.instruction);
                setEditedInstruction(data.instruction);
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
            if (contentEditorRef.current) {
                contentEditorRef.current.innerHTML = selectedInstruction.content || '';
            }
        }
    };

    // Rich text toolbar commands
    const execCommand = useCallback((command: string, value?: string) => {
        document.execCommand(command, false, value);
        contentEditorRef.current?.focus();
    }, []);

    const insertLink = useCallback(() => {
        const url = prompt('Podaj URL:');
        if (url) {
            document.execCommand('createLink', false, url);
            contentEditorRef.current?.focus();
        }
    }, []);

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

    // Get current content for preview (from contentEditable)
    const getCurrentContent = () => {
        return contentEditorRef.current?.innerHTML || editedInstruction?.content || '';
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

                {/* Main Content - Editor */}
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
                                        className={styles.previewButton}
                                        onClick={() => setPreviewOpen(true)}
                                    >
                                        👁️ Podgląd
                                    </button>
                                </div>
                            </div>

                            {successMessage && (
                                <div className={styles.successMessage}>{successMessage}</div>
                            )}

                            {/* Editor Form */}
                            <div className={styles.editorSection}>
                                {/* Basic fields */}
                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}>
                                        <label>Tytuł</label>
                                        <input
                                            type="text"
                                            value={editedInstruction?.title || ''}
                                            onChange={(e) => setEditedInstruction({ ...editedInstruction!, title: e.target.value })}
                                            className={styles.input}
                                        />
                                    </div>
                                    <div className={styles.formGroupSmall}>
                                        <label>Ikona</label>
                                        <input
                                            type="text"
                                            value={editedInstruction?.icon || ''}
                                            onChange={(e) => setEditedInstruction({ ...editedInstruction!, icon: e.target.value })}
                                            className={styles.input}
                                            placeholder="⚕️"
                                        />
                                    </div>
                                </div>

                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}>
                                        <label>Podtytuł <span className={styles.optional}>(opcjonalnie)</span></label>
                                        <input
                                            type="text"
                                            value={editedInstruction?.subtitle || ''}
                                            onChange={(e) => setEditedInstruction({ ...editedInstruction!, subtitle: e.target.value })}
                                            className={styles.input}
                                        />
                                    </div>
                                    <div className={styles.formGroupSmall}>
                                        <label>Czas przygotowania</label>
                                        <input
                                            type="text"
                                            value={editedInstruction?.preparation_time || ''}
                                            onChange={(e) => setEditedInstruction({ ...editedInstruction!, preparation_time: e.target.value })}
                                            className={styles.input}
                                            placeholder="np. 2h przed"
                                        />
                                    </div>
                                </div>

                                {/* Rich Text Editor */}
                                <div className={styles.formGroup}>
                                    <label>Treść główna</label>
                                    <div className={styles.richEditor}>
                                        {/* Toolbar */}
                                        <div className={styles.toolbar}>
                                            <div className={styles.toolbarGroup}>
                                                <button
                                                    type="button"
                                                    className={styles.toolbarBtn}
                                                    onClick={() => execCommand('bold')}
                                                    title="Pogrubienie (Ctrl+B)"
                                                >
                                                    <strong>B</strong>
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.toolbarBtn}
                                                    onClick={() => execCommand('italic')}
                                                    title="Kursywa (Ctrl+I)"
                                                >
                                                    <em>I</em>
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.toolbarBtn}
                                                    onClick={() => execCommand('underline')}
                                                    title="Podkreślenie (Ctrl+U)"
                                                >
                                                    <u>U</u>
                                                </button>
                                            </div>

                                            <div className={styles.toolbarDivider} />

                                            <div className={styles.toolbarGroup}>
                                                <button
                                                    type="button"
                                                    className={styles.toolbarBtn}
                                                    onClick={() => execCommand('formatBlock', '<h2>')}
                                                    title="Nagłówek H2"
                                                >
                                                    H2
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.toolbarBtn}
                                                    onClick={() => execCommand('formatBlock', '<h3>')}
                                                    title="Nagłówek H3"
                                                >
                                                    H3
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.toolbarBtn}
                                                    onClick={() => execCommand('formatBlock', '<p>')}
                                                    title="Paragraf"
                                                >
                                                    ¶
                                                </button>
                                            </div>

                                            <div className={styles.toolbarDivider} />

                                            <div className={styles.toolbarGroup}>
                                                <button
                                                    type="button"
                                                    className={styles.toolbarBtn}
                                                    onClick={() => execCommand('insertUnorderedList')}
                                                    title="Lista punktowana"
                                                >
                                                    • ≡
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.toolbarBtn}
                                                    onClick={() => execCommand('insertOrderedList')}
                                                    title="Lista numerowana"
                                                >
                                                    1. ≡
                                                </button>
                                            </div>

                                            <div className={styles.toolbarDivider} />

                                            <div className={styles.toolbarGroup}>
                                                <button
                                                    type="button"
                                                    className={styles.toolbarBtn}
                                                    onClick={insertLink}
                                                    title="Wstaw link"
                                                >
                                                    🔗
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.toolbarBtn}
                                                    onClick={() => execCommand('removeFormat')}
                                                    title="Usuń formatowanie"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>

                                        {/* Content Editable Area */}
                                        <div
                                            ref={contentEditorRef}
                                            className={styles.contentEditable}
                                            contentEditable
                                            suppressContentEditableWarning
                                            dangerouslySetInnerHTML={{ __html: editedInstruction?.content || '' }}
                                            onInput={() => {
                                                // Content is synced on save via ref
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* What to Bring */}
                                <div className={styles.formGroup}>
                                    <label>
                                        🎒 Co zabrać ze sobą?
                                        <span className={styles.optional}>Każda linia = osobny punkt</span>
                                    </label>
                                    <textarea
                                        value={editedInstruction?.what_to_bring?.join('\n') || ''}
                                        onChange={(e) => setEditedInstruction({
                                            ...editedInstruction!,
                                            what_to_bring: e.target.value.split('\n').filter(Boolean)
                                        })}
                                        className={styles.textarea}
                                        rows={4}
                                        placeholder="Dowód osobisty&#10;Lista leków&#10;Skierowanie"
                                    />
                                </div>

                                {/* Important Notes */}
                                <div className={styles.formGroup}>
                                    <label>
                                        ⚠️ Ważne uwagi
                                        <span className={styles.optional}>Każda linia = osobny punkt</span>
                                    </label>
                                    <textarea
                                        value={editedInstruction?.important_notes?.join('\n') || ''}
                                        onChange={(e) => setEditedInstruction({
                                            ...editedInstruction!,
                                            important_notes: e.target.value.split('\n').filter(Boolean)
                                        })}
                                        className={styles.textarea}
                                        rows={3}
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
                                        onClick={() => setPreviewOpen(true)}
                                        className={styles.btnPreview}
                                    >
                                        👁️ Podgląd
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
                        </>
                    )}
                </div>
            </div>

            {/* Preview Modal Overlay */}
            {previewOpen && editedInstruction && (
                <div className={styles.previewOverlay} onClick={() => setPreviewOpen(false)}>
                    <div className={styles.previewModal} onClick={(e) => e.stopPropagation()}>
                        <button className={styles.previewClose} onClick={() => setPreviewOpen(false)}>✕</button>
                        <div className={styles.previewLabel}>Podgląd — tak zobaczy to pacjent</div>

                        {/* Simulated Landing Page */}
                        <div className={styles.previewLanding}>
                            {/* Hero */}
                            <div className={styles.landingHero}>
                                <div className={styles.landingIcon}>{editedInstruction.icon}</div>
                                <h1>{editedInstruction.title}</h1>
                                {editedInstruction.subtitle && (
                                    <p className={styles.landingSubtitle}>{editedInstruction.subtitle}</p>
                                )}
                            </div>

                            {/* Important Notes */}
                            {editedInstruction.important_notes && editedInstruction.important_notes.length > 0 && (
                                <div className={styles.landingNotes}>
                                    {editedInstruction.important_notes.map((note, idx) => (
                                        <div key={idx} className={styles.landingNote}>
                                            <span>⚠️</span> {note}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* What to bring */}
                            {editedInstruction.what_to_bring && editedInstruction.what_to_bring.length > 0 && (
                                <div className={styles.landingBox}>
                                    <h3>🎒 Co zabrać ze sobą?</h3>
                                    <ul>
                                        {editedInstruction.what_to_bring.map((item, idx) => (
                                            <li key={idx}>✓ {item}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Preparation */}
                            {editedInstruction.preparation_time && (
                                <div className={styles.landingBox}>
                                    <h3>⏰ Przygotowanie</h3>
                                    <p><strong>{editedInstruction.preparation_time}</strong></p>
                                </div>
                            )}

                            {/* Main Content */}
                            <div
                                className={styles.landingContent}
                                dangerouslySetInnerHTML={{ __html: getCurrentContent() }}
                            />

                            {/* Simulated CTA */}
                            <div className={styles.landingCTA}>
                                <div className={styles.ctaButton}>✅ Potwierdzam obecność</div>
                                <div className={styles.ctaSecondary}>❌ Odwołaj wizytę</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
