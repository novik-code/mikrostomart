// TypeScript types for appointment_actions table

export type AppointmentStatus =
    | 'unpaid_reservation'      // No deposit paid yet
    | 'deposit_paid'            // Deposit confirmed via Stripe
    | 'attendance_confirmed'    // Patient confirmed attendance <24h before
    | 'cancellation_pending'    // Patient requested cancellation
    | 'reschedule_pending';     // Patient requested reschedule

export interface AppointmentAction {
    id: string;

    // Patient link
    patient_id: string;
    prodentis_id: string;

    // Appointment details (from Prodentis API)
    appointment_date: string; // ISO 8601
    appointment_end_date: string; // ISO 8601
    doctor_id?: string;
    doctor_name?: string;

    // Status
    status: AppointmentStatus;

    // Deposit tracking
    deposit_paid: boolean;
    deposit_amount?: number;
    deposit_payment_intent_id?: string;
    deposit_paid_at?: string;

    // Attendance confirmation
    attendance_confirmed: boolean;
    attendance_confirmed_at?: string;

    // Cancellation
    cancellation_requested: boolean;
    cancellation_requested_at?: string;
    cancellation_reason?: string;

    // Reschedule
    reschedule_requested: boolean;
    reschedule_requested_at?: string;
    reschedule_reason?: string;

    // Admin
    admin_notes?: string;
    last_updated_by?: string;

    // Timestamps
    created_at: string;
    updated_at: string;
}

export interface AppointmentStatusResponse {
    status: AppointmentStatus;
    depositPaid: boolean;
    depositAmount?: number;
    attendanceConfirmed: boolean;
    cancellationPending: boolean;
    reschedulePending: boolean;
    hoursUntilAppointment: number;
    canConfirmAttendance: boolean; // True if <24h before appointment
    actions: {
        canPayDeposit: boolean;
        canConfirmAttendance: boolean;
        canCancel: boolean;
        canReschedule: boolean;
    };
}

export interface ConfirmAttendanceRequest {
    appointmentDate: string;
}

export interface CancelAppointmentRequest {
    reason?: string;
}

export interface RescheduleAppointmentRequest {
    reason?: string;
}

export interface AppointmentActionResponse {
    success: boolean;
    message: string;
    emailSent?: boolean;
    telegramSent?: boolean;
    redirectUrl?: string;
}
