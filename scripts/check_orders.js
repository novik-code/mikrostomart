
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing keys in environment");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkOrders() {
    const { data, error } = await supabase.from('orders').select('*');
    if (error) console.error("Error fetching orders:", error);
    else console.log(`Found ${data.length} orders.`);

    const { data: pData, error: pError } = await supabase.from('products').select('*');
    if (pError) console.error("Error fetching products:", pError);
    else console.log(`Found ${pData.length} products.`);
}

checkOrders();
