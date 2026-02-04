import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
    try {
        // Verify JWT
        const authHeader = request.headers.get('Authorization');
        const payload = verifyToken(authHeader);

        if (!payload) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Fetch patient details from Prodentis
        const prodentisUrl = process.env.PRODENTIS_API_URL || 'http://localhost:3000';
        const url = `${prodentisUrl}/api/patient/${payload.prodentisId}/details`;

        const response = await fetch(url);

        if (!response.ok) {
            console.error('[Me] Prodentis API error:', response.status);
            return NextResponse.json(
                { error: 'Failed to fetch patient data' },
                { status: 500 }
            );
        }

        const patientData = await response.json();

        // Fetch email, phone, and account_status from Supabase
        const { data: supabasePatient, error: supabaseError } = await supabase
            .from('patients')
            .select('email, phone, account_status')
            .eq('prodentis_id', payload.prodentisId)
            .single();

        if (supabaseError) {
            console.error('[Me] Supabase error:', supabaseError);
            // Continue without email if Supabase fails (graceful degradation)
        }

        // Merge Supabase data (email, phone, account_status) with Prodentis data
        const mergedData = {
            ...patientData,
            email: supabasePatient?.email || patientData.email || null,
            phone: supabasePatient?.phone || patientData.phone || null,
            account_status: supabasePatient?.account_status || null,
        };

        return NextResponse.json(mergedData);

    } catch (error: any) {
        console.error('[Me] Error:', error);
        return NextResponse.json(
            { error: 'Server error' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    try {
        // Verify JWT
        const authHeader = request.headers.get('Authorization');
        const payload = verifyToken(authHeader);

        if (!payload) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { email, phone } = body;

        // Build update object (only update provided fields)
        const updates: any = {};

        if (email !== undefined) {
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (email && !emailRegex.test(email)) {
                return NextResponse.json(
                    { error: 'Nieprawidłowy format adresu email' },
                    { status: 400 }
                );
            }
            updates.email = email;
        }

        if (phone !== undefined) {
            updates.phone = phone.replace(/[\s-]/g, ''); // Normalize phone
        }

        // Update in Supabase
        const { data, error } = await supabase
            .from('patients')
            .update(updates)
            .eq('prodentis_id', payload.prodentisId)
            .select()
            .single();

        if (error) {
            console.error('[Me PATCH] Supabase error:', error);
            return NextResponse.json(
                { error: 'Nie udało się zaktualizować profilu' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            patient: {
                email: data.email,
                phone: data.phone,
            }
        });

    } catch (error: any) {
        console.error('[Me PATCH] Error:', error);
        return NextResponse.json(
            { error: 'Server error' },
            { status: 500 }
        );
    }
}
