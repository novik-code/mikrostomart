import fs from 'fs';
import path from 'path';

export interface Product {
    id: string;
    name: string;
    price: number;
    description: string;
    category: string;
    image: string; // Base64 string or URL
    gallery?: string[]; // Array of image URLs
    isVisible?: boolean;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function getProducts(): Product[] {
    if (!fs.existsSync(PRODUCTS_FILE)) {
        return [];
    }
    try {
        const data = fs.readFileSync(PRODUCTS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading products.json:", error);
        return [];
    }
}

export function saveProduct(product: Product): Product {
    const products = getProducts();
    const existingIndex = products.findIndex((p) => p.id === product.id);

    if (existingIndex >= 0) {
        // Update
        products[existingIndex] = product;
    } else {
        // Create
        products.push(product);
    }

    saveToFile(products);
    return product;
}

export function deleteProduct(id: string): boolean {
    let products = getProducts();
    const initialLength = products.length;
    products = products.filter((p) => p.id !== id);

    if (products.length < initialLength) {
        saveToFile(products);
        return true;
    }
    return false;
}

function saveToFile(products: Product[]) {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf-8');
}
