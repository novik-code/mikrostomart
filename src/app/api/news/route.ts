import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export const runtime = 'nodejs';

// GET: Public list of news
export async function GET(req: NextRequest) {
    try {
        const { data, error } = await supabase
            .from('news')
            .select('*')
            .order('date', { ascending: false });

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
