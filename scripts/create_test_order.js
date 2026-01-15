
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing keys in environment");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestOrder() {
    const order = {
        customer_details: {
            name: "Jan Testowy",
            email: "test@example.com",
            phone: "123456789",
            city: "Warszawa",
            street: "Testowa",
            houseNumber: "1",
            zipCode: "00-001"
        },
        items: [
            { name: "Test Product", price: 100, quantity: 1 }
        ],
        total_amount: 100,
        status: 'paid',
        payment_id: 'manual_test_' + Date.now(),
        created_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from('orders').insert(order).select();

    if (error) {
        console.error("Error creating order:", error);
    } else {
        console.log("Successfully created test order:", data);
    }
}

createTestOrder();
