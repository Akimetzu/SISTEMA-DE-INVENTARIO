import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  const { data: roles, error: errRole } = await supabase.from('roles').select('*');
  console.log('Roles:', roles, errRole);
  const { data: users, error: errUser } = await supabase.from('usuarios').select('*');
  console.log('Usuarios:', users, errUser);
}
run();
