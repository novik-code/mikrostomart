/**
 * PMS Factory — selects the correct adapter based on NEXT_PUBLIC_PMS_PROVIDER env var.
 *
 * To add a new PMS:
 *   1. Create src/lib/pms/my-pms-adapter.ts (implements PmsAdapter)
 *   2. Add it to the `adapters` map below
 *   3. Set NEXT_PUBLIC_PMS_PROVIDER=my-pms in .env
 *
 * The factory is a singleton — one adapter instance per process lifetime.
 */

import type { PmsAdapter } from './types';

// Lazy imports to avoid loading all adapters at startup
const adapters: Record<string, () => Promise<PmsAdapter>> = {
    prodentis:  () => import('./prodentis-adapter').then(m => new m.ProdentisAdapter()),
    standalone: () => import('./standalone-adapter').then(m => new m.StandaloneAdapter()),
    // Add new PMS adapters here:
    // mediporta: () => import('./mediporta-adapter').then(m => new m.MediportaAdapter()),
    // kamsoft:   () => import('./kamsoft-adapter').then(m => new m.KamsoftAdapter()),
    // planmeca:  () => import('./planmeca-adapter').then(m => new m.PlanmecaAdapter()),
};

let instance: PmsAdapter | null = null;

/**
 * Returns the singleton PmsAdapter for the current environment.
 * Provider is determined by NEXT_PUBLIC_PMS_PROVIDER env var.
 * Defaults to 'standalone' if not set or unknown.
 */
export async function getPmsAdapter(): Promise<PmsAdapter> {
    if (instance) return instance;

    const provider = process.env.NEXT_PUBLIC_PMS_PROVIDER || 'prodentis';

    const factory = adapters[provider];
    if (!factory) {
        console.warn(
            `[PmsFactory] Unknown PMS provider: "${provider}". ` +
            `Available: ${Object.keys(adapters).join(', ')}. ` +
            `Falling back to "standalone".`
        );
        instance = await adapters.standalone();
        return instance;
    }

    instance = await factory();
    console.log(`[PmsFactory] Adapter loaded: ${instance.name}`);
    return instance;
}

/**
 * Reset the singleton — useful for testing or hot-reload scenarios.
 */
export function resetPmsAdapter(): void {
    instance = null;
}
