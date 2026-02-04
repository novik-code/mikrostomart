/**
 * Mock Patient Data for Testing Patient Portal
 * This will be replaced with real Prodentis API calls
 */

export interface MockPatient {
    id: string;
    prodentisId: string;
    firstName: string;
    lastName: string;
    pesel: string;
    phone: string;
    email: string;
    street: string;
    houseNumber: string;
    apartmentNumber?: string;
    city: string;
    zipCode: string;
    createdAt: string;
    lastLogin: string | null;
    lastSync: string | null;
}

export interface MockVisit {
    id: string;
    patientId: string;
    date: string;
    time: string;
    doctorName: string;
    description: string;
    procedures: string[];
    cost: number;
    paid: number;
    balance: number;
}

export const MOCK_PATIENTS: MockPatient[] = [
    {
        id: '1',
        prodentisId: 'P001234',
        firstName: 'Anna',
        lastName: 'Kowalska',
        pesel: '85010112345',
        phone: '570270470',
        email: 'anna.kowalska@example.com',
        street: 'Dworcowa',
        houseNumber: '15',
        apartmentNumber: '3',
        city: 'Mikołów',
        zipCode: '43-190',
        createdAt: '2025-12-15T10:30:00Z',
        lastLogin: '2026-02-03T14:20:00Z',
        lastSync: '2026-02-03T14:25:00Z'
    },
    {
        id: '2',
        prodentisId: 'P001235',
        firstName: 'Jan',
        lastName: 'Nowak',
        pesel: '90020298765',
        phone: '570810800',
        email: 'jan.nowak@example.com',
        street: 'Rynek',
        houseNumber: '8',
        city: 'Mikołów',
        zipCode: '43-190',
        createdAt: '2026-01-05T09:15:00Z',
        lastLogin: '2026-02-01T11:45:00Z',
        lastSync: '2026-02-01T11:50:00Z'
    },
    {
        id: '3',
        prodentisId: 'P001236',
        firstName: 'Maria',
        lastName: 'Wiśniewska',
        pesel: '78051287654',
        phone: '600123456',
        email: 'maria.wisniewska@example.com',
        street: 'Mickiewicza',
        houseNumber: '22',
        apartmentNumber: '12',
        city: 'Mikołów',
        zipCode: '43-190',
        createdAt: '2025-11-20T16:00:00Z',
        lastLogin: '2026-01-28T09:30:00Z',
        lastSync: '2026-01-28T09:35:00Z'
    }
];

export const MOCK_VISITS: MockVisit[] = [
    {
        id: 'V001',
        patientId: '1',
        date: '2026-01-15',
        time: '10:00',
        doctorName: 'Dr Marcin Nowosielski',
        description: 'Przegląd kontrolny, czyszczenie kamienia',
        procedures: ['Przegląd stomatologiczny', 'Scaling', 'Piaskowanie'],
        cost: 250.00,
        paid: 250.00,
        balance: 0.00
    },
    {
        id: 'V002',
        patientId: '1',
        date: '2025-11-20',
        time: '14:30',
        doctorName: 'Dr Ilona Piechaczek',
        description: 'Wypełnienie ubytku ząb 36',
        procedures: ['Znieczulenie', 'Wypełnienie kompozytowe'],
        cost: 180.00,
        paid: 180.00,
        balance: 0.00
    },
    {
        id: 'V003',
        patientId: '1',
        date: '2025-09-10',
        time: '09:15',
        doctorName: 'Dr Marcin Nowosielski',
        description: 'Leczenie kanałowe ząb 46',
        procedures: ['RTG', 'Znieczulenie', 'Leczenie kanałowe - wizyta 1/2'],
        cost: 450.00,
        paid: 300.00,
        balance: 150.00
    },
    {
        id: 'V004',
        patientId: '1',
        date: '2025-09-17',
        time: '15:00',
        doctorName: 'Dr Marcin Nowosielski',
        description: 'Leczenie kanałowe ząb 46 - kontynuacja',
        procedures: ['Leczenie kanałowe - wizyta 2/2', 'Wypełnienie czasowe'],
        cost: 350.00,
        paid: 350.00,
        balance: 0.00
    },
    {
        id: 'V005',
        patientId: '1',
        date: '2025-07-05',
        time: '11:00',
        doctorName: 'Małgorzata Maćków-Huras (Higiena)',
        description: 'Profilaktyka, instruktaż higieny',
        procedures: ['Scaling', 'Fluoryzacja', 'Instruktaż'],
        cost: 200.00,
        paid: 200.00,
        balance: 0.00
    },
    {
        id: 'V006',
        patientId: '2',
        date: '2026-01-28',
        time: '13:00',
        doctorName: 'Dr Katarzyna Halupczok',
        description: 'Ekstrakcja ząb 48 (ósemka)',
        procedures: ['RTG', 'Znieczulenie', 'Ekstrakcja'],
        cost: 300.00,
        paid: 300.00,
        balance: 0.00
    },
    {
        id: 'V007',
        patientId: '2',
        date: '2025-12-10',
        time: '10:30',
        doctorName: 'Dr Marcin Nowosielski',
        description: 'Konsultacja implantologiczna',
        procedures: ['Konsultacja', 'RTG panoramiczne', 'Plan leczenia'],
        cost: 150.00,
        paid: 150.00,
        balance: 0.00
    },
    {
        id: 'V008',
        patientId: '3',
        date: '2026-01-20',
        time: '16:00',
        doctorName: 'Dr Ilona Piechaczek',
        description: 'Wybielanie nakładkowe - wrażenia',
        procedures: ['Wrażenia', 'Dobór koloru', 'Instruktaż'],
        cost: 800.00,
        paid: 400.00,
        balance: 400.00
    }
];

export const DOCTORS = [
    'Dr Marcin Nowosielski',
    'Dr Ilona Piechaczek',
    'Dr Katarzyna Halupczok',
    'Małgorzata Maćków-Huras (Higiena)'
];

export const PROCEDURES = [
    'Przegląd stomatologiczny',
    'Scaling',
    'Piaskowanie',
    'Fluoryzacja',
    'RTG',
    'Znieczulenie',
    'Wypełnienie kompozytowe',
    'Leczenie kanałowe',
    'Ekstrakcja',
    'Implant',
    'Korona',
    'Wybielanie',
    'Aparat ortodontyczny'
];

// Mock authentication state (in production, this would be JWT/session)
export class MockAuth {
    private static currentPatient: MockPatient | null = null;

    static login(phone: string, password: string): MockPatient | null {
        // For testing: any phone in MOCK_PATIENTS with password "test123"
        const patient = MOCK_PATIENTS.find(p => p.phone === phone);
        if (patient && password === 'test123') {
            this.currentPatient = patient;
            localStorage.setItem('mock_patient', JSON.stringify(patient));
            return patient;
        }
        return null;
    }

    static logout(): void {
        this.currentPatient = null;
        localStorage.removeItem('mock_patient');
    }

    static getCurrentPatient(): MockPatient | null {
        if (this.currentPatient) return this.currentPatient;

        const stored = localStorage.getItem('mock_patient');
        if (stored) {
            this.currentPatient = JSON.parse(stored);
            return this.currentPatient;
        }

        return null;
    }

    static isAuthenticated(): boolean {
        return this.getCurrentPatient() !== null;
    }

    static verifyPatient(phone: string, firstName: string, pesel: string): MockPatient | null {
        // Mock verification - check if patient exists in Prodentis
        return MOCK_PATIENTS.find(p =>
            p.phone === phone &&
            p.firstName.toLowerCase() === firstName.toLowerCase() &&
            p.pesel === pesel
        ) || null;
    }

    static register(patientData: Partial<MockPatient>, password: string): boolean {
        // In production, this would create a new account
        // For now, just simulate success
        console.log('Mock registration:', patientData);
        return true;
    }
}

// Helper to get visits for a patient
export function getPatientVisits(patientId: string): MockVisit[] {
    return MOCK_VISITS.filter(v => v.patientId === patientId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Calculate patient statistics
export function getPatientStats(patientId: string) {
    const visits = getPatientVisits(patientId);
    const totalCost = visits.reduce((sum, v) => sum + v.cost, 0);
    const totalPaid = visits.reduce((sum, v) => sum + v.paid, 0);
    const balance = visits.reduce((sum, v) => sum + v.balance, 0);

    return {
        totalVisits: visits.length,
        totalCost,
        totalPaid,
        balance,
        lastVisit: visits[0]?.date || null
    };
}
