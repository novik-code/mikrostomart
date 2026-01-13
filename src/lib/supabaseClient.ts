
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://keucogopujdolzmfajjv.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_8-d5Xw02vEEw9t82HPbNDQ_FMSYTjOR';

export const supabase = createClient(supabaseUrl, supabaseKey);
