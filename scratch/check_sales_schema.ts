
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase.rpc('get_table_info', { t_name: 'sales' });
  if (error) {
    // If RPC doesn't exist, try a simple query
    const { data: sales, error: queryError } = await supabase.from('sales').select('*').limit(1);
    if (queryError) {
      console.error('Error querying sales table:', queryError);
    } else {
      console.log('Columns in sales table:', Object.keys(sales?.[0] || {}));
    }
  } else {
    console.log('Table info:', data);
  }
}

checkSchema();
