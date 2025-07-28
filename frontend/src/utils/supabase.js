import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://etvdufporvnfpgdzpcrr.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0dmR1ZnBvcnZuZnBnZHpwY3JyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjEzODI0MSwiZXhwIjoyMDY3NzE0MjQxfQ.ij-v-aNRdKuAOfReghfw_usAwlG8PFXdthre0_a8278';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
