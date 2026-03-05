// ─── Central Type Re-exports ────────────────────────────────────
// Import types from anywhere: import { EmployeeTask, ScheduleData } from '@/types';

// Employee Zone — Tasks
export type { ChecklistItem, EmployeeTask, FutureAppointment, StaffMember, TaskTypeTemplate } from '@/app/pracownik/components/TaskTypes';
export { TASK_TYPE_COLORS, getTaskTypeColor, FALLBACK_TASK_TYPE_CHECKLISTS } from '@/app/pracownik/components/TaskTypes';

// Employee Zone — Schedule
export type { Badge, ScheduleAppointment, Visit, ScheduleDay, ScheduleData } from '@/app/pracownik/components/ScheduleTypes';
export { PRODENTIS_COLORS, DEFAULT_COLOR, BADGE_LETTERS, TIME_SLOTS, getBadgeLetter, getAppointmentColor, timeToSlotIndex, timeToMinutes, getMonday, formatDateShort } from '@/app/pracownik/components/ScheduleTypes';

// Admin Panel
export type { Product } from '@/app/admin/components/AdminTypes';

// Consent Forms
export type { FieldPosition, PeselBoxes, ConsentFieldMap, ConsentType } from '@/lib/consentTypes';
export { CONSENT_TYPES, CONSENT_TYPE_KEYS, getConsentTypesFromDB } from '@/lib/consentTypes';

// Comparator
export type { QuestionOption, Question, TableCell, MethodTable, MethodMetrics, Method, GatingEffect, GatingRule, PriorityOption, PriorityWeights, Category, Comparator, ScoredMethod } from '@/app/porownywarka/comparatorTypes';

// Appointment Actions (existing in src/types/)
export * from './appointmentActions';
