// ─── Task Types & Constants for Employee Zone ───────────────────
// Extracted from pracownik/page.tsx for modularity

export interface ChecklistItem {
    label: string;
    done: boolean;
    checked_by?: string;
    checked_by_name?: string;
}

export interface EmployeeTask {
    id: string;
    title: string;
    description: string | null;
    status: 'todo' | 'in_progress' | 'done' | 'archived';
    priority: 'low' | 'normal' | 'urgent';
    task_type: string | null;
    checklist_items: ChecklistItem[];
    image_url: string | null;
    image_urls?: string[];
    patient_id: string | null;
    patient_name: string | null;
    appointment_type: string | null;
    due_date: string | null;
    due_time: string | null;
    linked_appointment_date: string | null;
    linked_appointment_info: string | null;
    assigned_to_doctor_id: string | null;
    assigned_to_doctor_name: string | null;
    assigned_to: { id: string; name: string }[];
    created_by_email: string | null;
    created_at: string;
    updated_at: string;
    is_private: boolean;
    owner_user_id: string | null;
    google_event_id?: string | null;
}

export interface FutureAppointment {
    id: string;
    date: string;
    endDate: string | null;
    doctor: { id: string; name: string };
    appointmentType: string;
    duration: number | null;
}

export interface StaffMember {
    id: string;
    name: string;
    email?: string;
}

export interface TaskTypeTemplate {
    id: string;
    key: string;
    label: string;
    icon: string;
    items: string[];
    sort_order: number;
    is_active: boolean;
}

// ─── Task Type Color Map (for kanban/list visual differentiation) ─────
export const TASK_TYPE_COLORS: Record<string, string> = {
    'modele_archiwalne': '#8B5CF6',
    'modele_analityczne': '#6366F1',
    'korona_zab': '#0EA5E9',
    'korona_implant': '#14B8A6',
    'chirurgia': '#EF4444',
    'ortodoncja': '#F97316',
    'plan_leczenia': '#22C55E',
    'inne': '#64748B',
};

export function getTaskTypeColor(taskType: string | null): string {
    if (!taskType) return '#64748B';
    return TASK_TYPE_COLORS[taskType] || '#64748B';
}

// Fallback used before DB templates are loaded
export const FALLBACK_TASK_TYPE_CHECKLISTS: Record<string, { label: string; icon: string; items: string[] }> = {
    'modele_archiwalne': { label: 'Modele Archiwalne', icon: '📦', items: ['Zgrać skany'] },
    'modele_analityczne': { label: 'Modele Analityczne / Wax Up', icon: '🔬', items: ['Zgrać skany'] },
    'korona_zab': { label: 'Korona na Zębie', icon: '🦷', items: ['Zgrać dane', 'Projekt', 'Frez', 'Piec', 'Charakteryzacja', 'Wycienienie', 'Spr'] },
    'korona_implant': { label: 'Korona na Implancie', icon: '🔩', items: ['Zgrać dane', 'Stworzyć model', 'Projekt', 'Frez', 'Piec', 'Charakteryzacja', 'Skleić z ti base', 'Spr'] },
    'chirurgia': { label: 'Chirurgia / Implantologia', icon: '🏥', items: ['Zgrać CBCT', 'Zgrać skany', 'Projekt szablonu', 'Podać rozmiar implantów', 'Zamówić implant', 'Zamówić multiunit', 'Druk', 'Sprawdzić dziurki', 'Sterylizacja', 'Wpłacony zadatek'] },
    'ortodoncja': { label: 'Ortodoncja', icon: '😁', items: ['Wgrać dane do CC', 'Pokazać wizualizacje', 'Akceptacja', 'Wpłata 50%', 'Zamówienie nakładek'] },
    'plan_leczenia': { label: 'Plan Leczenia', icon: '📝', items: ['Plan', 'Prezentacja', 'Sprawdzić', 'Druk', 'Oddanie'] },
    'inne': { label: 'Inne', icon: '📋', items: [] },
};
