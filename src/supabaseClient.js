import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yyfbpgushcvelugwcchb.supabase.co'; // Found under Settings > General
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_WstWHLN_03lintpPDOEz7Q_ZSZuDXv5'; // Copy the key from the Publishable key box in your screenshot

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);