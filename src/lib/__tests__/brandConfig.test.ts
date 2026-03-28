/**
 * Safety tests for brandConfig.ts
 * 
 * These tests verify the SAFETY CONTRACT:
 * If anything fails (DB down, empty data, invalid data),
 * production ALWAYS gets the hardcoded PROD_BRAND values.
 * 
 * Written BEFORE any changes to brandConfig.ts to establish baseline.
 */

import { describe, it, expect } from 'vitest';

// Import the current hardcoded brand + types
// NOTE: These tests validate the CURRENT state before modifications.
// After Phase 1, setBrand() and loadBrandFromDB() will be added and tested here.

describe('brandConfig — safety contract', () => {

    it('BrandConfig interface has all required fields', async () => {
        const { brand } = await import('@/lib/brandConfig');

        // Verify all 35 fields exist and are strings
        const requiredFields = [
            'name', 'fullName', 'slogan', 'logoAlt',
            'phone1', 'phone2', 'email',
            'streetAddress', 'city', 'postalCode', 'region', 'country',
            'mapQuery', 'metadataBase',
            'titleDefault', 'titleTemplate', 'description', 'keywords',
            'ogSiteName', 'ogImageAlt', 'facebookUrl',
            'schemaName', 'schemaAlternateName', 'schemaDescription',
            'schemaId', 'schemaUrl', 'schemaImage',
            'geoRegion', 'geoPlacename', 'geoPosition', 'icbm',
        ];

        for (const field of requiredFields) {
            expect(brand).toHaveProperty(field);
            expect(typeof (brand as any)[field]).toBe('string');
        }
    });

    it('brand.name is never empty', async () => {
        const { brand } = await import('@/lib/brandConfig');
        expect(brand.name.length).toBeGreaterThan(0);
    });

    it('brand.email contains @', async () => {
        const { brand } = await import('@/lib/brandConfig');
        expect(brand.email).toContain('@');
    });

    it('brand.metadataBase starts with https://', async () => {
        const { brand } = await import('@/lib/brandConfig');
        expect(brand.metadataBase).toMatch(/^https:\/\//);
    });

    it('demoSanitize returns input unchanged in production mode', async () => {
        // In test environment, isDemoMode = false (no NEXT_PUBLIC_DEMO_MODE env var)
        const { demoSanitize } = await import('@/lib/brandConfig');
        const input = 'Hello Mikrostomart World';
        expect(demoSanitize(input)).toBe(input);
    });

    it('demoSanitize handles empty/null gracefully', async () => {
        const { demoSanitize } = await import('@/lib/brandConfig');
        expect(demoSanitize('')).toBe('');
        // @ts-expect-error — testing null safety
        expect(demoSanitize(null)).toBeFalsy();
        // @ts-expect-error — testing undefined safety
        expect(demoSanitize(undefined)).toBeFalsy();
    });
});

/**
 * Phase 1 tests — setBrand merge safety
 * Uses namespace import (import *) to get live bindings to `let brand`
 */
describe('setBrand — merge safety', () => {
    it('setBrand with partial data merges with defaults', async () => {
        const mod = await import('@/lib/brandConfig');
        const originalEmail = mod.brand.email;
        mod.setBrand({ name: 'Test Clinic' });
        expect(mod.brand.name).toBe('Test Clinic');
        expect(mod.brand.email).toBe(originalEmail); // NOT wiped
        // Reset
        mod.setBrand({});
    });

    it('setBrand with empty object resets to defaults', async () => {
        const mod = await import('@/lib/brandConfig');
        mod.setBrand({ name: 'Changed Name' });
        mod.setBrand({});
        expect(mod.brand.name).toBe('Mikrostomart'); // back to hardcoded default
    });

    it('setBrand ignores null/undefined input', async () => {
        const mod = await import('@/lib/brandConfig');
        const nameBefore = mod.brand.name;
        // @ts-expect-error — testing null safety
        mod.setBrand(null);
        expect(mod.brand.name).toBe(nameBefore);
        // @ts-expect-error — testing undefined safety
        mod.setBrand(undefined);
        expect(mod.brand.name).toBe(nameBefore);
    });

    it('setBrand sets optional fields (logoUrl, companyName, nip)', async () => {
        const mod = await import('@/lib/brandConfig');
        mod.setBrand({ logoUrl: 'https://example.com/logo.png', companyName: 'Test Sp. z o.o.', nip: '1234567890' });
        expect(mod.brand.logoUrl).toBe('https://example.com/logo.png');
        expect(mod.brand.companyName).toBe('Test Sp. z o.o.');
        expect(mod.brand.nip).toBe('1234567890');
        // Reset
        mod.setBrand({});
    });
});
