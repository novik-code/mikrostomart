/**
 * PMS Adapter Layer — Public API
 * ────────────────────────────────
 * Import everything from here:
 *
 *   import { getPmsAdapter } from '@/lib/pms';
 *   import type { PmsPatient, PmsAppointment } from '@/lib/pms';
 */

export { getPmsAdapter, resetPmsAdapter } from './factory';
export type {
    PmsPatient,
    PmsAppointment,
    PmsSlot,
    PmsDoctor,
    PmsDocument,
    PmsAdapter,
} from './types';
