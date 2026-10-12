import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://yyfbpgushcvelugwcchb.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_WstWHLN_03lintpPDOEz7Q_ZSZuDXv5';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);