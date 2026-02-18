import { NextRequest, NextResponse } from "next/server";
import { getProducts, saveProduct, deleteProductAsync, Product } from "@/lib/productService";
import { verifyAdmin } from "@/lib/auth";
import OpenAI from "openai";

export const runtime = 'nodejs';
export const maxDuration = 60;

const TARGET_LOCALES = ['en', 'de', 'ua'] as const;
const LOCALE_LABELS: Record<string, string> = { en: 'English', de: 'German', ua: 'Ukrainian' };

// Auto-translate product text fields (name, description, category) from Polish to target locales
async function translateProductFields(
    name: string,
    description: string,
    category: string
): Promise<{
    nameTranslations: Record<string, string>;
    descriptionTranslations: Record<string, string>;
    categoryTranslations: Record<string, string>;
}> {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const nameTranslations: Record<string, string> = {};
    const descriptionTranslations: Record<string, string> = {};
    const categoryTranslations: Record<string, string> = {};

    for (const locale of TARGET_LOCALES) {
        const langName = LOCALE_LABELS[locale];
        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: `You are a professional translator for a medical/dental products e-commerce store. Translate the following product information from Polish to ${langName}. Return ONLY valid JSON with keys: name, description, category.`
                    },
                    {
                        role: 'user',
                        content: JSON.stringify({ name, description, category })
                    }
                ],
                response_format: { type: 'json_object' },
                temperature: 0.3,
                max_tokens: 1024,
            });

            const parsed = JSON.parse(completion.choices[0].message.content || '{}');
            if (parsed.name) nameTranslations[locale] = parsed.name;
            if (parsed.description) descriptionTranslations[locale] = parsed.description;
            if (parsed.category) categoryTranslations[locale] = parsed.category;

            console.log(`[Products i18n] Translated to ${langName} ✓`);
        } catch (err) {
            console.error(`[Products i18n] Translation to ${langName} failed:`, err);
        }
    }

    return { nameTranslations, descriptionTranslations, categoryTranslations };
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
    if (!(await verifyAdmin())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const product = body as Product;

        // Auto-translate if product has name/description/category and OPENAI_API_KEY is available
        if (process.env.OPENAI_API_KEY && product.name && product.description) {
            try {
                const translations = await translateProductFields(
                    product.name,
                    product.description,
                    product.category || ''
                );
                product.nameTranslations = translations.nameTranslations;
                product.descriptionTranslations = translations.descriptionTranslations;
                product.categoryTranslations = translations.categoryTranslations;
                console.log(`[Products i18n] Auto-translated "${product.name}" to ${TARGET_LOCALES.join(', ')}`);
            } catch (translationError) {
                console.error("[Products i18n] Translation failed, saving without translations:", translationError);
                // Continue without translations - don't block product save
            }
        }

        const savedProduct = await saveProduct(product);
        return NextResponse.json(savedProduct);
    } catch (error: any) {
        console.error("API POST Error:", error);
        return NextResponse.json({ error: error.message || "Invalid Data" }, { status: 400 });
    }
}

export async function DELETE(req: NextRequest) {
    if (!(await verifyAdmin())) {
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
