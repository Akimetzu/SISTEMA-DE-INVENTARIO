import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log("Seeding data...");
  const { data: roles, error: roleErr } = await supabase.from('roles').insert([
    { codigo: 'admin', descripcion: 'Administrador del Sistema' },
    { codigo: 'operador', descripcion: 'Operador de Inventario' },
    { codigo: 'auditor', descripcion: 'Auditor Externo' }
  ]).select();

  if (roleErr || !roles) {
    if (roleErr?.code === '23505') {
       console.log("Roles already exist");
    } else {
       console.log("Error inserting roles:", roleErr);
       return;
    }
  }

  const { data: fetchRoles } = await supabase.from('roles').select('*');
  if (!fetchRoles) return;
  const adminRole = fetchRoles.find(r => r.codigo === 'admin');
  const opRole = fetchRoles.find(r => r.codigo === 'operador');
  const audRole = fetchRoles.find(r => r.codigo === 'auditor');

  const hashedPwd = await bcrypt.hash('password123', 10);

  const { data: users, error: userErr } = await supabase.from('usuarios').insert([
    { 
       rol_id: adminRole.id,
       nombre_usuario: 'admin.master',
       nombre_completo: 'Administrador Principal',
       correo: 'admin@chainstock.com',
       clave_hash: hashedPwd,
       activo: true
    },
    { 
       rol_id: opRole.id,
       nombre_usuario: 'op.almacen',
       nombre_completo: 'Operador de Almacén',
       correo: 'operador@chainstock.com',
       clave_hash: hashedPwd,
       activo: true
    },
    { 
       rol_id: audRole.id,
       nombre_usuario: 'auditor.sup',
       nombre_completo: 'Auditor Superior',
       correo: 'auditor@chainstock.com',
       clave_hash: hashedPwd,
       activo: true
    }
  ]);

  if (userErr && userErr.code !== '23505') {
     console.error("Error inserting users:", userErr);
  } else {
     console.log("Seed complete");
  }
}
run();
