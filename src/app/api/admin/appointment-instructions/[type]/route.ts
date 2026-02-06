import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/appointment-instructions/[type]
 * 
 * Update appointment instruction content
 */
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ type: string }> }
) {
    try {
        // TODO: Add admin authentication check

        const { type } = await params;
        const body = await req.json();

        const {
            title,
            subtitle,
            icon,
            content,
            preparation_time,
            what_to_bring,
            important_notes
        } = body;

        // Update instruction
        const { data, error } = await supabase
            .from('appointment_instructions')
            .update({
                title,
                subtitle,
                icon,
                content,
                preparation_time,
                what_to_bring,
                important_notes,
                updated_at: new Date().toISOString()
            })
            .eq('appointment_type', type)
            .select()
            .single();

        if (error) {
            throw new Error(`Database error: ${error.message}`);
        }

        return NextResponse.json({
            success: true,
            instruction: data
        });

    } catch (error) {
        console.error('[Admin Appointment Instructions] PUT error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
