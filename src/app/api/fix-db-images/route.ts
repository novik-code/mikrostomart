import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from '@/lib/authGuards';

export const runtime = 'nodejs';

/**
 * GET /api/fix-db-images — admin-only one-time migration endpoint.
 * Auth: admin required. Uses service-role key.
 */
export async function GET() {
    try {
        /**
         * 🔴 P-021: ROLA ADMIN, nie sama sesja. `verifyAdmin` — wbrew nazwie — sprawdza
         * wyłącznie istnienie sesji Supabase, więc trasę odpalał każdy zalogowany
         * pracownik. Ta jest debugowa i zapisuje obrazy produktów.
         */
        const auth = await requireAdmin();
        if (!auth.ok) return auth.response;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({ error: "Missing Admin Keys" }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Fix Hygiene (ID 3)
        await supabase.from('products').update({
            gallery: ['/voucher-hygiene-card.png', '/voucher-gift-box.png']
        }).eq('id', '3');

        // 2. Fix Whitening (ID 4)
        await supabase.from('products').update({
            image: '/voucher-whitening.png',
            gallery: ['/dental-tray-3d.png', '/perfect-smile.png']
        }).eq('id', '4');

        // 3. Fix Metamorphosis (ID voucher-metamorphosis)
        await supabase.from('products').update({
            gallery: ['/voucher-metamorphosis-lifestyle.png']
        }).eq('id', 'voucher-metamorphosis');

        return NextResponse.json({ success: true, message: "Images updated successfully" });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
