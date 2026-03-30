/**
 * Standalone PMS Adapter
 * ───────────────────────
 * Supabase-native implementation — no external PMS required.
 * Used for:
 *   - Demo environment (demo.densflow.ai) with NEXT_PUBLIC_PMS_PROVIDER=standalone
 *   - New clinics that don't yet have a PMS connected
 *   - Unit testing (no network calls)
 *
 * Data source: Supabase tables (patients, appointments, employees).
 * Booking is managed entirely within the platform.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
    PmsAdapter,
    PmsPatient,
    PmsAppointment,
    PmsSlot,
    PmsDoctor,
    PmsDocument,
} from './types';

export class StandaloneAdapter implements PmsAdapter {
    readonly name = 'standalone';

    private get supabase(): SupabaseClient {
        return createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );
    }

    // ── Patients ──────────────────────────────────────────────────────

    async getPatient(externalId: string): Promise<PmsPatient | null> {
        const { data } = await this.supabase
            .from('patients')
            .select('*')
            .eq('id', externalId)
            .single();
        return data ? this.mapPatient(data) : null;
    }

    async searchPatients(query: string): Promise<PmsPatient[]> {
        const { data } = await this.supabase
            .from('patients')
            .select('*')
            .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
            .limit(20);
        return (data || []).map(this.mapPatient);
    }

    async searchPatientsByPhone(phone: string): Promise<PmsPatient[]> {
        const { data } = await this.supabase
            .from('patients')
            .select('*')
            .ilike('phone', `%${phone}%`)
            .limit(10);
        return (data || []).map(this.mapPatient);
    }

    async createPatient(data: Partial<PmsPatient>): Promise<PmsPatient> {
        const { data: created, error } = await this.supabase
            .from('patients')
            .insert({
                first_name: data.firstName,
                last_name: data.lastName,
                phone: data.phone,
                email: data.email,
                pesel: data.pesel,
                birth_date: data.birthDate,
            })
            .select()
            .single();
        if (error) throw new Error(`[StandaloneAdapter] createPatient failed: ${error.message}`);
        return this.mapPatient(created);
    }

    async updatePatient(externalId: string, data: Partial<PmsPatient>): Promise<void> {
        const updates: Record<string, any> = {};
        if (data.firstName) updates.first_name = data.firstName;
        if (data.lastName) updates.last_name = data.lastName;
        if (data.phone) updates.phone = data.phone;
        if (data.email) updates.email = data.email;

        await this.supabase.from('patients').update(updates).eq('id', externalId);
    }

    // ── Appointments ──────────────────────────────────────────────────

    async getAppointmentsByDate(date: string): Promise<PmsAppointment[]> {
        const { data } = await this.supabase
            .from('reservations')
            .select('*')
            .eq('date', date);
        return (data || []).map(this.mapReservation);
    }

    async getAppointmentsByPatient(patientId: string): Promise<PmsAppointment[]> {
        const { data } = await this.supabase
            .from('reservations')
            .select('*')
            .eq('patient_id', patientId)
            .order('date', { ascending: false });
        return (data || []).map(this.mapReservation);
    }

    async getAppointmentsByDoctor(doctorId: string, date: string): Promise<PmsAppointment[]> {
        const { data } = await this.supabase
            .from('reservations')
            .select('*')
            .eq('date', date)
            .eq('specialist', doctorId);
        return (data || []).map(this.mapReservation);
    }

    async createAppointment(data: Partial<PmsAppointment>): Promise<PmsAppointment> {
        const { data: created, error } = await this.supabase
            .from('reservations')
            .insert({
                date: data.date,
                time: data.time,
                specialist: data.doctorId,
                patient_id: data.patientId,
                status: 'pending',
            })
            .select()
            .single();
        if (error) throw new Error(`[StandaloneAdapter] createAppointment failed: ${error.message}`);
        return this.mapReservation(created);
    }

    async cancelAppointment(appointmentId: string): Promise<void> {
        await this.supabase
            .from('reservations')
            .update({ status: 'cancelled' })
            .eq('id', appointmentId);
    }

    async confirmAppointment(appointmentId: string): Promise<void> {
        await this.supabase
            .from('reservations')
            .update({ status: 'confirmed' })
            .eq('id', appointmentId);
    }

    // ── Slots ─────────────────────────────────────────────────────────

    async getAvailableSlots(_doctorId: string, _dateFrom: string, _dateTo: string): Promise<PmsSlot[]> {
        // Standalone does not manage a slot system — returns empty
        // Individual clinics can implement this via calendar integrations
        return [];
    }

    // ── Doctors ───────────────────────────────────────────────────────

    async getDoctors(): Promise<PmsDoctor[]> {
        const { data } = await this.supabase
            .from('employees')
            .select('id, name, position')
            .eq('is_active', true)
            .eq('show_in_booking', true);
        return (data || []).map(e => ({
            id: e.id,
            name: e.name,
            specialization: e.position || undefined,
        }));
    }

    async getDoctorSchedule(doctorId: string, date: string): Promise<PmsAppointment[]> {
        return this.getAppointmentsByDoctor(doctorId, date);
    }

    // ── Documents ─────────────────────────────────────────────────────

    async uploadDocument(_patientId: string, _file: Buffer, _filename: string): Promise<string> {
        throw new Error('[StandaloneAdapter] Document upload not yet implemented');
    }

    async getPatientDocuments(_patientId: string): Promise<PmsDocument[]> {
        return [];
    }

    // ── Health ────────────────────────────────────────────────────────

    async healthCheck(): Promise<boolean> {
        try {
            const { error } = await this.supabase.from('employees').select('id').limit(1);
            return !error;
        } catch {
            return false;
        }
    }

    // ── Mapping helpers ───────────────────────────────────────────────

    private mapPatient(p: any): PmsPatient {
        return {
            externalId: p.id,
            firstName: p.first_name || '',
            lastName: p.last_name || '',
            phone: p.phone || undefined,
            email: p.email || undefined,
            pesel: p.pesel || undefined,
            birthDate: p.birth_date || undefined,
        };
    }

    private mapReservation(r: any): PmsAppointment {
        return {
            externalId: r.id,
            patientId: r.patient_id || '',
            doctorId: r.specialist || '',
            doctorName: r.specialist_name || r.specialist,
            date: r.date,
            time: r.time,
            duration: 30,
            type: r.service || 'UNKNOWN',
            status: r.status || 'pending',
            notes: r.description,
        };
    }
}
