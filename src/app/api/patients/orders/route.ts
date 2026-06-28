import { NextResponse, NextRequest } from 'next/server';
import { verifyTokenFromRequest } from '@/lib/jwt';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — historia zamówień zalogowanego pacjenta.
// Zamówienia nie mają patient_id → wiązanie po e-mailu (customer_details->>email).
// Zwracamy tylko realne zakupy (paid/refunded), bez porzuconych pending/failed.
export async function GET(request: NextRequest) {
    const payload = verifyTokenFromRequest(request);
    if (!payload) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { data: patient } = await supabase
            .from('patients')
            .select('email')
            .eq('prodentis_id', payload.prodentisId)
            .single();

        const email = patient?.email;
        if (!email) return NextResponse.json({ orders: [] });

        const { data, error } = await supabase
            .from('orders')
            .select('id, status, amount_total, total_amount, payment_provider, items, created_at')
            .eq('customer_details->>email', email)
            .in('status', ['paid', 'refunded'])
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        const orders = (data || []).map((o) => ({
            id: o.id,
            status: o.status,
            total: o.amount_total ?? o.total_amount ?? 0,
            provider: o.payment_provider ?? null,
            createdAt: o.created_at,
            items: Array.isArray(o.items)
                ? o.items.map((i: { name?: string; quantity?: number; unitPrice?: number; price?: number }) => ({
                      name: i.name ?? '',
                      quantity: i.quantity ?? 1,
                      unitPrice: i.unitPrice ?? i.price ?? 0,
                  }))
                : [],
        }));

        return NextResponse.json({ orders });
    } catch (error) {
        console.error('[Patient orders] Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
