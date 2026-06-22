import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seedProducts() {
  const { data: fetchProd } = await supabase.from('productos').select('*');
  if (fetchProd && fetchProd.length > 0) {
      console.log("Products already exist");
      return;
  }
  
  const { data: pd1, error: e1 } = await supabase.from('productos').insert({
    sku: 'SRV-DL380-G10', nombre: 'Servidor ProLiant DL380 Gen10', categoria: 'Hardware/Servidores', precio: 4500.00
  }).select().single();
  const { data: pd2 } = await supabase.from('productos').insert({
    sku: 'SW-C9200L-48P', nombre: 'Cisco Catalyst 9200L 48-port', categoria: 'Redes/Switches', precio: 1200.00
  }).select().single();

  if (pd1) await supabase.from('inventario').insert({ producto_id: pd1.id, stock_actual: 5, umbral_stock_bajo: 2 });
  if (pd2) await supabase.from('inventario').insert({ producto_id: pd2.id, stock_actual: 1, umbral_stock_bajo: 2, alerta_stock_bajo_activa: true });
}

seedProducts();
