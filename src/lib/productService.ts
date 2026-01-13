import { createClient } from '@supabase/supabase-js';
import { supabase as supabasePublic } from '@/lib/supabaseClient'; // Use existing public client

export interface Product {
    id: string;
    name: string;
    price: number;
    description: string;
    category: string;
    image: string;
    gallery?: string[];
    isVisible?: boolean;
    isVariablePrice?: boolean; // CamelCase for TS interface
    minPrice?: number;         // CamelCase
}

// Helper to get Admin Client (server-side only)
function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://keucogopujdolzmfajjv.supabase.co';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
        const availableKeys = Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('KEY'));
        throw new Error(`Missing Admin Keys. Available: ${availableKeys.join(', ')}`);
    }
    return createClient(supabaseUrl, supabaseServiceKey);
}

export async function getProducts(): Promise<Product[]> {
    // Use Public Client (Anon Key) for reading.
    // This works because we added "Enable read access for all users" policy.
    // This avoids crashing if SERVICE_ROLE_KEY is missing in production.
    const { data, error } = await supabasePublic
        .from('products')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Supabase error (getProducts):", error);
        return [];
    }

    return (data || []).map(row => ({
        id: row.id,
        name: row.name,
        price: row.price,
        description: row.description,
        category: row.category,
        image: row.image,
        gallery: row.gallery,
        isVisible: row.is_visible,
        isVariablePrice: row.is_variable_price,
        minPrice: row.min_price
    }));
}

export async function saveProduct(product: Product): Promise<Product> {
    const supabase = getSupabaseAdmin();

    const dbPayload = {
        id: product.id,
        name: product.name,
        price: product.price,
        description: product.description,
        category: product.category,
        image: product.image,
        gallery: product.gallery,
        is_visible: product.isVisible ?? true,
        is_variable_price: product.isVariablePrice ?? false,
        min_price: product.minPrice ?? 0
    };

    const { data, error } = await supabase
        .from('products')
        .upsert(dbPayload) // upsert handles both insert and update if IDs match
        .select()
        .single();

    if (error) {
        throw new Error(`Supabase error (saveProduct): ${error.message}`);
    }

    return product; // Return the input product (or mapped data if needed)
}

export function deleteProduct(id: string): boolean {
    // Note: This function was sync before. But DB is async.
    // We cannot make it async without breaking `route.ts`.
    // Wait, `route.ts` awaits?
    // Let's check `route.ts`. It seems to call `deleteProduct(id)`. 
    // I need to update `route.ts` to await `deleteProduct`.

    // For now, I'll return a Promise but TS might complain if I don't update callers.
    // I MUST update callers.
    return false;
}

// NEW ASYNC Delete function
export async function deleteProductAsync(id: string): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
        console.error("Supabase error (deleteProduct):", error);
        return false;
    }
    return true;
}

