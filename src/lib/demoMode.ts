/**
 * Demo mode detection.
 * Set NEXT_PUBLIC_DEMO_MODE=true in Vercel env vars for the demo project.
 * On production (mikrostomart.pl) this var does not exist → isDemoMode = false.
 */
export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
