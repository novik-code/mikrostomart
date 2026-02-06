import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMS } from '@/lib/smsService';

/**
 * Admin API for SMS Reminders Management
 * 
 * GET    - List SMS reminders with filters
 * PUT    - Update/edit SMS draft message
 * POST   - Manual send (via /send subpath)
 * DELETE - Cancel/delete draft
 */

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/sms-reminders
 * 
 * Query params:
 * - status: draft (default) | sent | failed | all
 * - date: YYYY-MM-DD (filter by appointment date)
 * - limit: number (default 100)
 */
export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const status = url.searchParams.get('status') || 'draft';
        const date = url.searchParams.get('date');
        const limit = parseInt(url.searchParams.get('limit') || '100');

        let query = supabase
            .from('sms_reminders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        // Filter by status
        if (status !== 'all') {
            query = query.eq('status', status);
        }

        // Filter by appointment date
        if (date) {
            const dateStart = new Date(date);
            dateStart.setHours(0, 0, 0, 0);
            const dateEnd = new Date(date);
            dateEnd.setHours(23, 59, 59, 999);

            query = query
                .gte('appointment_date', dateStart.toISOString())
                .lte('appointment_date', dateEnd.toISOString());
        }

        const { data: reminders, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch reminders: ${error.message}`);
        }

        // Get stats
        const { data: allReminders } = await supabase
            .from('sms_reminders')
            .select('status');

        const stats = {
            total: allReminders?.length || 0,
            draft: allReminders?.filter(r => r.status === 'draft').length || 0,
            sent: allReminders?.filter(r => r.status === 'sent').length || 0,
            failed: allReminders?.filter(r => r.status === 'failed').length || 0,
            cancelled: allReminders?.filter(r => r.status === 'cancelled').length || 0
        };

        return NextResponse.json({
            reminders: reminders || [],
            stats
        });

    } catch (error) {
        console.error('[Admin SMS] GET error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/admin/sms-reminders
 * 
 * Body: { id, sms_message, edited_by }
 * 
 * Updates draft SMS message
 */
export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id, sms_message, edited_by } = body;

        if (!id || !sms_message) {
            return NextResponse.json(
                { error: 'Missing required fields: id, sms_message' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('sms_reminders')
            .update({
                sms_message,
                edited_by,
                edited_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('status', 'draft') // Only allow editing drafts
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update: ${error.message}`);
        }

        if (!data) {
            return NextResponse.json(
                { error: 'Draft not found or already sent' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            reminder: data
        });

    } catch (error) {
        console.error('[Admin SMS] PUT error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/admin/sms-reminders?id=uuid
 * 
 * Cancel/delete draft SMS
 */
export async function DELETE(req: Request) {
    try {
        const url = new URL(req.url);
        const id = url.searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Missing id parameter' },
                { status: 400 }
            );
        }

        // Mark as cancelled instead of deleting (keep audit trail)
        const { data, error } = await supabase
            .from('sms_reminders')
            .update({ status: 'cancelled' })
            .eq('id', id)
            .eq('status', 'draft')
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to cancel: ${error.message}`);
        }

        if (!data) {
            return NextResponse.json(
                { error: 'Draft not found or already sent' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Draft cancelled'
        });

    } catch (error) {
        console.error('[Admin SMS] DELETE error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
