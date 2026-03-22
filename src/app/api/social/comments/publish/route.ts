import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { publishReply, CommentReplyRow } from '@/lib/socialComments';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// POST — publish a single approved reply or all approved replies
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, publish_all } = body;

        if (publish_all) {
            // Publish all approved replies
            const { data: approved, error: fetchErr } = await supabase
                .from('social_comment_replies')
                .select('*')
                .eq('status', 'approved');

            if (fetchErr) throw fetchErr;
            if (!approved || approved.length === 0) {
                return NextResponse.json({ message: 'Brak zatwierdzonych odpowiedzi', published: 0 });
            }

            let published = 0;
            let errors: string[] = [];

            for (const row of approved) {
                const result = await publishReply(row as CommentReplyRow);
                if (result.success) {
                    published++;
                } else {
                    errors.push(`${row.platform}/${row.comment_id}: ${result.error}`);
                }
            }

            return NextResponse.json({ published, total: approved.length, errors });
        }

        // Publish single reply
        if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

        const { data: row, error: fetchErr } = await supabase
            .from('social_comment_replies')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchErr || !row) {
            return NextResponse.json({ error: 'Odpowiedź nie znaleziona' }, { status: 404 });
        }

        if (row.status !== 'approved') {
            // Auto-approve if draft
            if (row.status === 'draft') {
                await supabase.from('social_comment_replies').update({ status: 'approved' }).eq('id', id);
            } else {
                return NextResponse.json(
                    { error: `Status "${row.status}" nie pozwala na publikację` },
                    { status: 400 },
                );
            }
        }

        const result = await publishReply(row as CommentReplyRow);

        if (result.success) {
            return NextResponse.json({ success: true, reply_id: result.reply_id });
        } else {
            return NextResponse.json({ error: result.error }, { status: 500 });
        }
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
