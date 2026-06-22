import { User, Product, AuditBlock, DashboardStats, Transaction, Role } from './types';
import { subDays } from 'date-fns';

export const mockRoles: Role[] = [
  { id: 'r1', codigo: 'admin', descripcion: 'Administrador Principal' },
  { id: 'r2', codigo: 'operador', descripcion: 'Operador de Almacén' },
  { id: 'r3', codigo: 'auditor', descripcion: 'Auditor de Sistemas' },
];

export const mockUsers: User[] = [
  { id: 'u1', rol_id: 'r1', nombre_usuario: 'admin.master', nombre_completo: 'Administrador Principal', correo: 'admin@empresa.com', clave_hash: 'hash...', activo: true, ultimo_acceso: new Date().toISOString(), creado_en: subDays(new Date(), 30).toISOString(), actualizado_en: new Date().toISOString(), rol: 'admin' },
  { id: 'u2', rol_id: 'r2', nombre_usuario: 'op.almacen', nombre_completo: 'Operador de Almacen', correo: 'operador@empresa.com', clave_hash: 'hash...', activo: true, ultimo_acceso: new Date().toISOString(), creado_en: subDays(new Date(), 15).toISOString(), actualizado_en: new Date().toISOString(), rol: 'operador' },
  { id: 'u3', rol_id: 'r3', nombre_usuario: 'audit.sys', nombre_completo: 'Auditor de Sistemas', correo: 'auditor@empresa.com', clave_hash: 'hash...', activo: true, ultimo_acceso: new Date().toISOString(), creado_en: subDays(new Date(), 5).toISOString(), actualizado_en: new Date().toISOString(), rol: 'auditor' },
];

export const mockProducts: Product[] = [
  { 
    id: 'p1', 
    sku: 'YHT-982', 
    nombre: 'Router Cisco ISR 4331/K9', 
    descripcion: 'Router Cisco de servicios integrados (stock inicial de 8 unidades)', 
    categoria: 'Redes', 
    precio: 1250.00, 
    activo: true, 
    creado_en: '2026-06-21T14:44:54.000Z', 
    actualizado_en: '2026-06-21T14:44:54.000Z',
    inventario: { 
      id: 'inv1', 
      producto_id: 'p1', 
      stock_actual: 8, 
      stock_reservado: 0, 
      umbral_stock_bajo: 3, 
      alerta_stock_bajo_activa: false, 
      ultima_alerta: null 
    }
  },
  { 
    id: 'p2', 
    sku: 'THYG-5820', 
    nombre: 'SAMSUMGJJTTT', 
    descripcion: 'Dispositivo móvil / Terminal de lectura RFID', 
    categoria: 'Dispositivos', 
    precio: 250.00, 
    activo: false, 
    creado_en: '2026-06-15T10:00:00.000Z', 
    actualizado_en: '2026-06-17T23:32:17.000Z',
    inventario: { 
      id: 'inv2', 
      producto_id: 'p2', 
      stock_actual: 0, 
      stock_reservado: 0, 
      umbral_stock_bajo: 2, 
      alerta_stock_bajo_activa: false, 
      ultima_alerta: null 
    }
  },
  { 
    id: 'p3', 
    sku: 'SRV-DL380-G10', 
    nombre: 'Servidor ProLiant DL380 Gen10', 
    descripcion: 'Servidor Rack 2U HPe', 
    categoria: 'Servidores', 
    precio: 4500.00, 
    activo: true, 
    creado_en: '2026-06-10T12:00:00.000Z', 
    actualizado_en: '2026-06-21T12:00:00.000Z',
    inventario: { 
      id: 'inv3', 
      producto_id: 'p3', 
      stock_actual: 12, 
      stock_reservado: 0, 
      umbral_stock_bajo: 5, 
      alerta_stock_bajo_activa: false, 
      ultima_alerta: null 
    }
  }
];

export const mockTransactions: Transaction[] = [
  {
    id: 't-creation',
    inventario_id: 'inv1',
    producto_id: 'p1',
    usuario_id: 'u1',
    tipo_transaccion: 'IN',
    cantidad: 8,
    stock_antes: 0,
    stock_despues: 8,
    nota_referencia: 'Registro de producto nuevo: SKU YHT-982 con stock inicial 8',
    ocurrido_en: '2026-06-21T14:44:54.000Z',
    producto_sku: 'YHT-982',
    producto_nombre: 'Router Cisco ISR 4331/K9',
    usuario: 'admin.master'
  },
  {
    id: 't-genesis',
    inventario_id: 'inv2',
    producto_id: 'p2',
    usuario_id: 'u1',
    tipo_transaccion: 'OUT',
    cantidad: 5,
    stock_antes: 5,
    stock_despues: 0,
    nota_referencia: 'Producto eliminado del inventario: SKU THYG-5820 (Retiro de stock restante)',
    ocurrido_en: '2026-06-17T23:32:17.000Z',
    producto_sku: 'THYG-5820',
    producto_nombre: 'SAMSUMGJJTTT',
    usuario: 'admin.master'
  }
];

export const mockAuditLogs: AuditBlock[] = [
  {
    id: 'aud-2',
    transaccion_id: 't-creation',
    usuario_id: 'u1',
    hash_anterior: 'a412bfbbfc73d2fe58afb0859b6910435855cb47381a3f68c921487e0d655ae3',
    hash_actual: '2bd0901bbca8f733993a3394548dbbb692f893de353a2098b67fc3a4b9ee503d',
    timestamp_bloque: '2026-06-21T14:44:54.000Z',
    datos: JSON.stringify({
      sku: 'YHT-982',
      producto: 'Router Cisco ISR 4331/K9',
      tipo: 'IN',
      cantidad: 8,
      stock_antes: 0,
      stock_despues: 8,
      responsable: 'admin.master',
      timestamp: 1782053094
    }),
    firma_usuario: '0x326027f4a56a... (Suscrita por admin.master)',
    red_blockchain: 'Ethereum Sepolia',
    hash_transaccion: '0xf1f81745de56532de4c129cf43dfa7d9020b464328277a2b6dc0077155b',
    transaccion_tipo: 'IN',
    usuario: 'admin.master',
    detalles: 'Registro de producto nuevo: SKU YHT-982 con stock inicial 8'
  },
  {
    id: 'aud-1',
    transaccion_id: 't-genesis',
    usuario_id: 'u1',
    hash_anterior: '0000000000000000000000000000000000000000000000000000000000000000',
    hash_actual: 'a412bfbbfc73d2fe58afb0859b6910435855cb47381a3f68c921487e0d655ae3',
    timestamp_bloque: '2026-06-17T23:32:17.000Z',
    datos: JSON.stringify({
      sku: 'THYG-5820',
      producto: 'SAMSUMGJJTTT',
      tipo: 'OUT',
      cantidad: 5,
      stock_antes: 5,
      stock_despues: 0,
      responsable: 'admin.master',
      timestamp: 1781703137
    }),
    firma_usuario: '0x94fd8fc43d3e... (Suscrita por admin.master)',
    red_blockchain: 'Ethereum Sepolia',
    hash_transaccion: '0x24faa58a9f11e90129428e3948a79c75d44d9020b464328277a2b6dc0077155b',
    transaccion_tipo: 'OUT',
    usuario: 'admin.master',
    detalles: 'Producto eliminado del inventario: SKU THYG-5820 (Retiro de stock restante)'
  }
];

export const mockStats: DashboardStats = {
  totalProducts: 2,
  lowStockCount: 0,
  totalMovementsToday: 1,
  auditBlocksVerified: 2
};

export const chartData = [
  { name: 'Lun', entradas: 0, salidas: 0 },
  { name: 'Mar', entradas: 0, salidas: 0 },
  { name: 'Mié', entradas: 0, salidas: 5 }, // 17/6 es Miércoles
  { name: 'Jue', entradas: 0, salidas: 0 },
  { name: 'Vie', entradas: 0, salidas: 0 },
  { name: 'Sáb', entradas: 0, salidas: 0 },
  { name: 'Dom', entradas: 8, salidas: 0 }, // 21/6 es Domingo
];
