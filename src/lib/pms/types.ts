/**
 * PMS Adapter Layer — Type Definitions
 * ─────────────────────────────────────
 * This file defines the universal contract (interface) that every PMS adapter
 * must implement. Adding a new PMS (Mediporta, KamSoft, Planmeca, Estomed...)
 * means implementing PmsAdapter — zero changes to business logic.
 *
 * Current adapters:
 *   - prodentis  → ProdentisAdapter (REST API, current production PMS)
 *   - standalone → StandaloneAdapter (Supabase-native, no external PMS)
 *
 * Adding new PMS:
 *   1. Create src/lib/pms/mediporta-adapter.ts implementing PmsAdapter
 *   2. Register in factory.ts
 *   3. Set NEXT_PUBLIC_PMS_PROVIDER=mediporta in .env
 */

// ── Patient ────────────────────────────────────────────────────────────────

export interface PmsPatient {
    externalId: string;      // ID in the PMS system
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
    pesel?: string;
    birthDate?: string;      // YYYY-MM-DD
    address?: string;
}

// ── Appointment ────────────────────────────────────────────────────────────

export interface PmsAppointment {
    externalId: string;
    patientId: string;
    doctorId: string;
    doctorName?: string;
    date: string;            // YYYY-MM-DD
    time: string;            // HH:mm
    duration: number;        // minutes
    type: string;            // e.g. "KONTROLA", "HIGIENIZACJA"
    status: string;          // e.g. "PLANNED", "CONFIRMED", "CANCELLED"
    notes?: string;
    colorCode?: string;      // Prodentis appointment color (gray = holiday etc.)
}

// ── Available Slot ─────────────────────────────────────────────────────────

export interface PmsSlot {
    date: string;            // YYYY-MM-DD
    time: string;            // HH:mm
    doctorId: string;
    doctorName?: string;
    duration: number;        // minutes
    available: boolean;
}

// ── Doctor ─────────────────────────────────────────────────────────────────

export interface PmsDoctor {
    id: string;
    name: string;
    specialization?: string;
    email?: string;
}

// ── Document ───────────────────────────────────────────────────────────────

export interface PmsDocument {
    id: string;
    name: string;
    url: string;
    uploadedAt?: string;
    type?: string;
}

// ── Adapter Contract ───────────────────────────────────────────────────────

export interface PmsAdapter {
    /** Identifier: "prodentis" | "standalone" | "mediporta" | ... */
    readonly name: string;

    // ── Patients ────────────────────────────────────────────────

    getPatient(externalId: string): Promise<PmsPatient | null>;
    searchPatients(query: string): Promise<PmsPatient[]>;
    searchPatientsByPhone(phone: string): Promise<PmsPatient[]>;
    createPatient(data: Partial<PmsPatient>): Promise<PmsPatient>;
    updatePatient(externalId: string, data: Partial<PmsPatient>): Promise<void>;

    // ── Appointments ────────────────────────────────────────────

    getAppointmentsByDate(date: string): Promise<PmsAppointment[]>;
    getAppointmentsByPatient(patientId: string): Promise<PmsAppointment[]>;
    getAppointmentsByDoctor(doctorId: string, date: string): Promise<PmsAppointment[]>;
    createAppointment(data: Partial<PmsAppointment>): Promise<PmsAppointment>;
    cancelAppointment(appointmentId: string): Promise<void>;
    confirmAppointment(appointmentId: string): Promise<void>;

    // ── Availability ────────────────────────────────────────────

    getAvailableSlots(doctorId: string, dateFrom: string, dateTo: string): Promise<PmsSlot[]>;

    // ── Doctors ─────────────────────────────────────────────────

    getDoctors(): Promise<PmsDoctor[]>;
    getDoctorSchedule(doctorId: string, date: string): Promise<PmsAppointment[]>;

    // ── Documents ───────────────────────────────────────────────

    uploadDocument(patientId: string, file: Buffer, filename: string): Promise<string>;
    getPatientDocuments(patientId: string): Promise<PmsDocument[]>;

    // ── Health / Status ─────────────────────────────────────────

    healthCheck(): Promise<boolean>;

    // ── Optional: Sync (batch operations) ───────────────────────

    syncPatients?(since?: Date): Promise<PmsPatient[]>;
    syncAppointments?(date: string): Promise<PmsAppointment[]>;
}
