/**
 * Map Prodentis appointment type names to landing page slugs
 */
export function mapAppointmentTypeToSlug(appointmentType: string): string {
    const mapping: Record<string, string> = {
        // Exact matches
        'chirurgia': 'chirurgia',
        'pierwsza wizyta': 'pierwsza-wizyta',
        'protetyka': 'protetyka',
        'endodoncja': 'endodoncja',
        'konsultacja': 'konsultacja',
        'zachowawcze': 'zachowawcze',
        'ortodoncja': 'ortodoncja',
        'higienizacja': 'higienizacja',
        'kontrola': 'kontrola',
        'laser': 'laser',

        // Common variations/aliases
        'leczenie kanałowe': 'endodoncja',
        'kanałowe': 'endodoncja',
        'konsult': 'konsultacja',
        'zabieg chirurgiczny': 'chirurgia',
        'wizyta chirurgiczna': 'chirurgia',
        'pierwsza': 'pierwsza-wizyta',
        'nowy pacjent': 'pierwsza-wizyta',
        'stomatologia zachowawcza': 'zachowawcze',
        'wypełnienie': 'zachowawcze',
        'wizyta kontrolna': 'kontrola',
        'przegląd': 'kontrola',
        'scaling': 'higienizacja',
        'czyszczenie': 'higienizacja',
        'aparat': 'ortodoncja',
        'korona': 'protetyka',
        'most': 'protetyka',
        'proteza': 'protetyka'
    };

    const normalized = appointmentType.toLowerCase().trim();

    // Direct match
    if (mapping[normalized]) {
        return mapping[normalized];
    }

    // Partial match (contains)
    for (const [key, value] of Object.entries(mapping)) {
        if (normalized.includes(key) || key.includes(normalized)) {
            return value;
        }
    }

    // Default fallback
    return 'konsultacja';
}
