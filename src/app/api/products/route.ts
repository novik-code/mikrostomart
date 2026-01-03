import { NextRequest, NextResponse } from "next/server";
import { getProducts, saveProduct, deleteProduct, Product } from "@/lib/productService";

export const runtime = 'nodejs';

// Simple Auth Helper
function isAuthenticated(req: NextRequest): boolean {
    const authHeader = req.headers.get("x-admin-password");
    const envPassword = process.env.ADMIN_PASSWORD || "admin123";
    if (!process.env.ADMIN_PASSWORD) {
        console.warn("⚠️ Warning: ADMIN_PASSWORD not set. Using default 'admin123'.");
    }
    // If no password set in env, allow open access (dev mode) or block? 
    // Let's block if no password set to be safe, or allow if strict dev.
    // For this MVP, if env is missing, we might default to a simple pass or fail.
    if (!envPassword) return false;
    return authHeader === envPassword;
}

export async function GET() {
    const products = getProducts();
    return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
    if (!isAuthenticated(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        // Validation could go here
        const savedProduct = saveProduct(body as Product);
        return NextResponse.json(savedProduct);
    } catch (error) {
        return NextResponse.json({ error: "Invalid Data" }, { status: 400 });
    }
}

export async function DELETE(req: NextRequest) {
    if (!isAuthenticated(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        }

        const deleted = deleteProduct(id);
        if (deleted) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: "Not Found" }, { status: 404 });
        }
    } catch (error) {
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
