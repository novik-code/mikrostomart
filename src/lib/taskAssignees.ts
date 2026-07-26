/**
 * Id osób przypisanych do zadania (`employee_tasks.assigned_to`) pochodzą z
 * `/api/employee/staff`, gdzie są DWOJAKIE:
 *   · auth `user_id` (UUID) — pracownik z kontem, można do niego wysłać push,
 *   · `emp-<employees.id>` — pracownik bez konta, brak kanału powiadomień.
 * Ta funkcja zwraca wyłącznie te pierwsze (bez duplikatów).
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assigneeUserIds(assignedTo: unknown): string[] {
    if (!Array.isArray(assignedTo)) return [];
    const ids = assignedTo
        .map((a) => (a && typeof a === 'object' && typeof (a as { id?: unknown }).id === 'string'
            ? (a as { id: string }).id
            : ''))
        .filter((id) => UUID_RE.test(id));
    return Array.from(new Set(ids));
}
