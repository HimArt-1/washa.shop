const { createClient } = require('@supabase/supabase-js');

async function run() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase credentials');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Adding columns to orders table...');
    
    // We can't run raw SQL easily via the client unless we have a function.
    // But we can check if the columns exist by trying to select them.
    const { error: checkError } = await supabase
        .from('orders')
        .select('tracking_number')
        .limit(1);

    if (checkError && checkError.message.includes('column orders.tracking_number does not exist')) {
        console.log('Columns missing. Please run the SQL migration in the Supabase dashboard:');
        console.log(`
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS tracking_number TEXT,
ADD COLUMN IF NOT EXISTS courier_name TEXT,
ADD COLUMN IF NOT EXISTS waybill_url TEXT,
ADD COLUMN IF NOT EXISTS torod_order_id TEXT;
        `);
    } else if (checkError) {
        console.error('Error checking columns:', checkError);
    } else {
        console.log('Columns already exist.');
    }
}

run();
