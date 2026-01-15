import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/auth";

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    if (!(await verifyAdmin())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://keucogopujdolzmfajjv.supabase.co';
        // Use service role key to ensure we can read all orders regardless of RLS
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseServiceKey) {
            console.error("CRITICAL: Missing SUPABASE_SERVICE_ROLE_KEY in API route");
            // Returning empty array instead of 500 might be safer for UI, but let's be explicit for debugging
            throw new Error("Misconfigured Server: Missing Service Role Key");
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
