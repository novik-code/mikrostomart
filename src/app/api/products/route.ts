import { NextRequest, NextResponse } from "next/server";
import { getProducts, saveProduct, deleteProductAsync, Product } from "@/lib/productService";

export const runtime = 'nodejs';

// Simple Auth Helper
function isAuthenticated(req: NextRequest): boolean {
    const authHeader = req.headers.get("x-admin-password");
    const envPassword = process.env.ADMIN_PASSWORD || "admin123";
    if (!process.env.ADMIN_PASSWORD) {
        console.warn("⚠️ Warning: ADMIN_PASSWORD not set. Using default 'admin123'.");
    }
    if (!envPassword) return false;
    return authHeader === envPassword;
}

export async function GET() {
    try {
        const products = await getProducts();
        return NextResponse.json(products);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    if (!isAuthenticated(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        // Validation could go here
        const savedProduct = await saveProduct(body as Product);
        return NextResponse.json(savedProduct);
    } catch (error: any) {
        console.error("API POST Error:", error);
        return NextResponse.json({ error: error.message || "Invalid Data" }, { status: 400 });
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

        const success = await deleteProductAsync(id);
        if (success) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: "Not Found or Failed" }, { status: 404 });
        }
    } catch (error) {
        return NextResponse.json({ error: "Server Error" }, { status: 500 });
    }
}
