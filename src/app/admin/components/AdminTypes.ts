// ─── Admin Panel Types ───────────────────────────────────────────
// Extracted from admin/page.tsx for modularity

export type Product = {
    id: string;
    name: string;
    price: number;
    description: string;
    category: string;
    image: string;
    gallery?: string[];
    isVisible?: boolean;
};
