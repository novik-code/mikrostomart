// Typy współdzielone systemu rejestracji czasu pracy (KCP)

export type TimeEntryType = 'clock_in' | 'clock_out';

export interface WorkLocation {
    id: string;
    name: string;
    address: string | null;
    qr_secret: string;            // SERVER-ONLY, nigdy do klienta
    rotation_seconds: number;
    is_active: boolean;
    is_primary: boolean;
    created_at: string;
    updated_at: string;
}

export interface TimeEntry {
    id: string;
    employee_id: string;
    type: TimeEntryType;
    scanned_at: string;
    location_id: string | null;
    qr_token_used: string | null;
    qr_period: number | null;
    device_info: Record<string, unknown> | null;
    ip_address: string | null;
    user_agent: string | null;
    manual: boolean;
    manual_correction_by: string | null;
    manual_note: string | null;
    original_scanned_at: string | null;
    schedule_id: string | null;
    created_at: string;
}

export interface QrPayloadParts {
    locationId: string;
    period: number;
    token: string;
}

export interface QrCurrentResponse {
    payload: string;
    period: number;
    rotationSeconds: number;
    validUntil: number;            // ms epoch
    locationName: string;
    locationId: string;
    serverTime: number;            // ms epoch (do synchronizacji klienta)
}

export interface TimeStatusResponse {
    employee: {
        id: string;
        name: string;
        position: string | null;
    };
    isWorkingNow: boolean;          // true gdy ostatni wpis dzisiaj to clock_in
    expectedNextType: TimeEntryType;
    lastEntry: {
        id: string;
        type: TimeEntryType;
        scannedAt: string;
        locationName: string | null;
    } | null;
    today: {
        clockIns: number;
        clockOuts: number;
        firstClockIn: string | null;
        lastClockOut: string | null;
        workedMinutes: number;       // szacunek dla aktualnego stanu (suma par in→out)
        entries: Array<{
            id: string;
            type: TimeEntryType;
            scannedAt: string;
            manual: boolean;
        }>;
    };
}

export interface TimeScanRequest {
    qrPayload: string;
    deviceInfo?: Record<string, unknown>;
}

export interface TimeScanResponse {
    ok: true;
    type: TimeEntryType;
    scannedAt: string;
    employeeName: string;
    locationName: string | null;
    todayWorkedMinutes: number;
}
