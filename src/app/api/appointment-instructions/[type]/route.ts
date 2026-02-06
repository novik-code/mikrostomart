import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

/**
 * GET /api/appointment-instructions/[type]
 * 
 * Public endpoint - fetches appointment preparation instructions
 * Used by landing pages
 */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ type: string }> }
) {
    try {
        const { type } = await params;

        const { data: instruction, error } = await supabase
            .from('appointment_instructions')
            .select('*')
            .eq('appointment_type', type)
            .maybeSingle();

        if (error) {
            throw new Error(`Database error: ${error.message}`);
        }

        if (!instruction) {
            return NextResponse.json(
                { error: 'Appointment type not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            instruction
        });

    } catch (error) {
        console.error('[Appointment Instructions API] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
