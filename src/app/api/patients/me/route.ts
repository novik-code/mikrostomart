import { NextResponse, NextRequest } from 'next/server';
import { verifyTokenFromRequest } from '@/lib/jwt';
import { createClient } from '@supabase/supabase-js';
import { isDemoMode } from '@/lib/demoMode';

export const dynamic = 'force-dynamic';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
    try {
        // Verify JWT (from httpOnly cookie or Authorization header)
        const payload = verifyTokenFromRequest(request);

        if (!payload) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        let patientData: any;

        if (isDemoMode) {
            // In demo mode, fetch patient data from Supabase directly
            console.log('[Me] DEMO MODE: Using Supabase patient data');
            const { data: patient, error: patientError } = await supabase
                .from('patients')
                .select('*')
                .eq('prodentis_id', payload.prodentisId)
                .single();

            if (patientError || !patient) {
                // Try by userId
                const { data: patientById } = await supabase
                    .from('patients')
                    .select('*')
                    .eq('id', payload.userId)
                    .single();

                patientData = patientById ? {
                    id: patientById.prodentis_id || patientById.id,
                    firstName: patientById.first_name || patientById.name?.split(' ')[0] || 'Demo',
                    lastName: patientById.last_name || patientById.name?.split(' ').slice(1).join(' ') || 'Pacjent',
                    phone: patientById.phone,
                    email: patientById.email,
                    dateOfBirth: patientById.date_of_birth || null,
                    appointments: [],
                    account_status: patientById.account_status || 'active',
                    locale: patientById.locale || 'pl',
                } : { id: payload.prodentisId, firstName: 'Demo', lastName: 'Pacjent', appointments: [] };
            } else {
                patientData = {
                    id: patient.prodentis_id || patient.id,
                    firstName: patient.first_name || patient.name?.split(' ')[0] || 'Demo',
                    lastName: patient.last_name || patient.name?.split(' ').slice(1).join(' ') || 'Pacjent',
                    phone: patient.phone,
                    email: patient.email,
                    dateOfBirth: patient.date_of_birth || null,
                    appointments: [],
                    account_status: patient.account_status || 'active',
                    locale: patient.locale || 'pl',
                };
            }

            return NextResponse.json(patientData);
        }

        // Fetch patient details from Prodentis
        const prodentisUrl = process.env.PRODENTIS_API_URL || process.env.PRODENTIS_TUNNEL_URL || 'https://pms.mikrostomartapi.com';
        const url = `${prodentisUrl}/api/patient/${payload.prodentisId}/details`;

        const response = await fetch(url);

        if (!response.ok) {
            console.error('[Me] Prodentis API error:', response.status);
            return NextResponse.json(
                { error: 'Failed to fetch patient data' },
                { status: 500 }
            );
        }

        patientData = await response.json();

        // Fetch email, phone, and account_status from Supabase
        const { data: supabasePatient, error: supabaseError } = await supabase
            .from('patients')
            .select('email, phone, account_status, locale')
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
            locale: supabasePatient?.locale || 'pl',
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

export async function PATCH(request: NextRequest) {
    try {
        // Verify JWT (from httpOnly cookie or Authorization header)
        const payload = verifyTokenFromRequest(request);

        if (!payload) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { email, phone, locale, notification_preferences } = body;

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

        if (locale !== undefined) {
            const validLocales = ['pl', 'en', 'de', 'ua'];
            if (!validLocales.includes(locale)) {
                return NextResponse.json(
                    { error: 'Nieprawidłowy język' },
                    { status: 400 }
                );
            }
            updates.locale = locale;
        }

        if (notification_preferences !== undefined) {
            updates.notification_preferences = notification_preferences;
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
                locale: data.locale,
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
