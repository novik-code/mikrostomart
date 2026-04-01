/**
 * Prodentis PMS Adapter
 * ──────────────────────
 * Wraps the existing Prodentis REST API.
 * All current Prodentis fetch() calls are consolidated here.
 *
 * This is the production adapter for Mikrostomart (mikrostomart.pl).
 * For demo (demo.densflow.ai) the adapter is still used but responses
 * are intercepted by demoSanitize / isDemoMode guards in the routes.
 */

import type {
    PmsAdapter,
    PmsPatient,
    PmsAppointment,
    PmsSlot,
    PmsDoctor,
    PmsDocument,
} from './types';

export class ProdentisAdapter implements PmsAdapter {
    readonly name = 'prodentis';

    /** Primary: Cloudflare Tunnel (bypasses router port forwarding) */
    private get primaryUrl(): string {
        return process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';
    }

    /** Fallback: direct IP (requires port forwarding on router) */
    private get fallbackUrl(): string {
        return process.env.PRODENTIS_API_URL || 'http://83.230.40.14:3000';
    }

    private get apiKey(): string {
        return process.env.PRODENTIS_API_KEY || '';
    }

    private async fetchSingle<T>(baseUrl: string, path: string, options: RequestInit, timeoutMs: number): Promise<T> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const res = await fetch(`${baseUrl}${path}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.apiKey ? { 'X-API-Key': this.apiKey } : {}),
                    ...((options.headers as Record<string, string>) || {}),
                },
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!res.ok) {
                throw new Error(`Prodentis API error: ${res.status} ${res.statusText} on ${path}`);
            }
            return res.json() as Promise<T>;
        } catch (err) {
            clearTimeout(timeoutId);
            throw err;
        }
    }

    private async fetch<T>(path: string, options: RequestInit = {}, timeoutMs = 8000): Promise<T> {
        // Try primary (Cloudflare Tunnel) first
        try {
            return await this.fetchSingle<T>(this.primaryUrl, path, options, timeoutMs);
        } catch (primaryErr: any) {
            console.warn(`[Prodentis] Tunnel failed (${primaryErr.message}), trying fallback...`);
        }

        // Fallback to direct IP
        try {
            const result = await this.fetchSingle<T>(this.fallbackUrl, path, options, timeoutMs);
            console.log(`[Prodentis] Fallback (direct IP) succeeded for ${path}`);
            return result;
        } catch (fallbackErr: any) {
            console.error(`[Prodentis] Both tunnel and fallback failed for ${path}`);
            throw fallbackErr;
        }
    }

    // ── Patients ──────────────────────────────────────────────────────

    async getPatient(externalId: string): Promise<PmsPatient | null> {
        try {
            const data = await this.fetch<any>(`/api/patient/${externalId}/details`);
            return this.mapPatient(data);
        } catch {
            return null;
        }
    }

    async searchPatients(query: string): Promise<PmsPatient[]> {
        try {
            const data = await this.fetch<any>(`/api/patients/search?q=${encodeURIComponent(query)}&limit=20`);
            return (data.patients || []).map((p: any) => this.mapPatient(p));
        } catch {
            return [];
        }
    }

    async searchPatientsByPhone(phone: string): Promise<PmsPatient[]> {
        try {
            const data = await this.fetch<any>(`/api/patients/search?phone=${encodeURIComponent(phone)}&limit=10`);
            return (data.patients || []).map((p: any) => this.mapPatient(p));
        } catch {
            return [];
        }
    }

    async createPatient(data: Partial<PmsPatient>): Promise<PmsPatient> {
        const body = {
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            email: data.email,
            pesel: data.pesel,
            birthDate: data.birthDate,
            address: data.address,
        };
        const result = await this.fetch<any>('/api/patients', {
            method: 'POST',
            body: JSON.stringify(body),
        });
        return this.mapPatient(result);
    }

    async updatePatient(externalId: string, data: Partial<PmsPatient>): Promise<void> {
        await this.fetch(`/api/patient/${externalId}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    // ── Appointments ──────────────────────────────────────────────────

    async getAppointmentsByDate(date: string): Promise<PmsAppointment[]> {
        try {
            const data = await this.fetch<any>(`/api/appointments/by-date?date=${date}`);
            return (data.appointments || []).map((a: any) => this.mapAppointment(a));
        } catch {
            return [];
        }
    }

    async getAppointmentsByPatient(patientId: string): Promise<PmsAppointment[]> {
        try {
            const data = await this.fetch<any>(`/api/patient/${patientId}/appointments`);
            return (data.appointments || []).map((a: any) => this.mapAppointment(a));
        } catch {
            return [];
        }
    }

    async getAppointmentsByDoctor(doctorId: string, date: string): Promise<PmsAppointment[]> {
        try {
            const data = await this.fetch<any>(`/api/appointments/by-date?date=${date}&doctorId=${doctorId}`);
            return (data.appointments || [])
                .filter((a: any) => a.doctor?.id === doctorId)
                .map((a: any) => this.mapAppointment(a));
        } catch {
            return [];
        }
    }

    async createAppointment(data: Partial<PmsAppointment>): Promise<PmsAppointment> {
        const body = {
            doctorId: data.doctorId,
            patientId: data.patientId,
            date: data.date,
            startTime: data.time,
            duration: data.duration || 30,
            description: data.notes || '',
            source: 'online_booking',
            labels: ['ONLINE'],
        };
        const result = await this.fetch<any>('/api/schedule/appointment', {
            method: 'POST',
            body: JSON.stringify(body),
        });
        return {
            externalId: result.appointmentId || result.id,
            patientId: data.patientId || '',
            doctorId: data.doctorId || '',
            date: data.date || '',
            time: data.time || '',
            duration: data.duration || 30,
            type: 'ONLINE',
            status: 'PLANNED',
        };
    }

    async cancelAppointment(appointmentId: string): Promise<void> {
        await this.fetch(`/api/appointments/${appointmentId}/cancel`, { method: 'POST' });
    }

    async confirmAppointment(appointmentId: string): Promise<void> {
        await this.fetch(`/api/appointments/${appointmentId}/confirm`, { method: 'POST' });
    }

    // ── Slots ─────────────────────────────────────────────────────────

    async getAvailableSlots(doctorId: string, dateFrom: string, dateTo: string): Promise<PmsSlot[]> {
        try {
            const data = await this.fetch<any>(
                `/api/slots?doctorId=${doctorId}&from=${dateFrom}&to=${dateTo}`
            );
            return (data.slots || []).map((s: any) => ({
                date: s.date,
                time: s.time,
                doctorId: s.doctorId || doctorId,
                doctorName: s.doctorName,
                duration: s.duration || 30,
                available: s.available ?? true,
            }));
        } catch {
            return [];
        }
    }

    // ── Doctors ───────────────────────────────────────────────────────

    async getDoctors(): Promise<PmsDoctor[]> {
        try {
            const data = await this.fetch<any>('/api/doctors');
            return (data.doctors || []).map((d: any) => ({
                id: d.id,
                name: d.name?.replace(/\s*\(I\)\s*/g, ' ').trim() || d.name,
                specialization: d.specialization,
                email: d.email,
            }));
        } catch {
            return [];
        }
    }

    async getDoctorSchedule(doctorId: string, date: string): Promise<PmsAppointment[]> {
        return this.getAppointmentsByDoctor(doctorId, date);
    }

    // ── Documents ─────────────────────────────────────────────────────

    async uploadDocument(patientId: string, file: Buffer, filename: string): Promise<string> {
        // Prodentis does not have a standard document upload API — not implemented
        throw new Error('[ProdentisAdapter] uploadDocument not supported by Prodentis API');
    }

    async getPatientDocuments(patientId: string): Promise<PmsDocument[]> {
        try {
            const data = await this.fetch<any>(`/api/patient/${patientId}/documents`);
            return (data.documents || []).map((d: any) => ({
                id: d.id,
                name: d.name || d.filename,
                url: d.url || d.downloadUrl,
                uploadedAt: d.uploadedAt,
                type: d.type,
            }));
        } catch {
            return [];
        }
    }

    // ── Health ────────────────────────────────────────────────────────

    async healthCheck(): Promise<boolean> {
        try {
            await this.fetch('/api/health', {}, 3000);
            return true;
        } catch {
            return false;
        }
    }

    // ── Sync ──────────────────────────────────────────────────────────

    async syncAppointments(date: string): Promise<PmsAppointment[]> {
        return this.getAppointmentsByDate(date);
    }

    // ── Mapping helpers ───────────────────────────────────────────────

    private mapPatient(p: any): PmsPatient {
        return {
            externalId: p.id || p.prodentisId || p.externalId,
            firstName: p.firstName || p.imie || '',
            lastName: p.lastName || p.nazwisko || '',
            phone: p.phone || p.telefon || undefined,
            email: p.email || undefined,
            pesel: p.pesel || undefined,
            birthDate: p.birthDate || p.dataUrodzenia || undefined,
            address: p.address || p.adres || undefined,
        };
    }

    private mapAppointment(a: any): PmsAppointment {
        return {
            externalId: a.id || a.appointmentId,
            patientId: a.patient?.id || a.patientId || '',
            doctorId: a.doctor?.id || a.doctorId || '',
            doctorName: a.doctor?.name?.replace(/\s*\(I\)\s*/g, ' ').trim() || a.doctorName,
            date: a.date,
            time: (a.startTime || a.time || '').slice(0, 5),
            duration: a.duration || 30,
            type: a.type || a.appointmentType || 'UNKNOWN',
            status: a.status || 'UNKNOWN',
            notes: a.description || a.notes,
            colorCode: a.colorCode || a.color,
        };
    }
}
