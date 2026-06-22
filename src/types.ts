export type RoleCode = 'admin' | 'operador' | 'auditor';

export interface Role {
  id: string;
  codigo: RoleCode;
  descripcion: string;
}

export interface User {
  id: string;
  rol_id: string;
  nombre_usuario: string;
  nombre_completo: string;
  correo: string;
  clave_hash: string;
  activo: boolean;
  ultimo_acceso: string | null;
  creado_en: string;
  actualizado_en: string;
  rol?: RoleCode; // For UI convenience
}

export interface Product {
  id: string;
  sku: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: number;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
  // Included from inventario relation to simplify current UI state, though strictly they are separate tables
  inventario?: Inventario; 
}

export interface Inventario {
  id: string;
  producto_id: string;
  stock_actual: number;
  stock_reservado: number;
  umbral_stock_bajo: number;
  alerta_stock_bajo_activa: boolean;
  ultima_alerta: string | null;
}

export interface Transaction {
  id: string;
  inventario_id: string;
  producto_id: string;
  usuario_id: string;
  tipo_transaccion: 'IN' | 'OUT' | 'AJUSTE';
  cantidad: number;
  stock_antes: number;
  stock_despues: number;
  nota_referencia: string;
  ocurrido_en?: string; // Additional field to simplify current UI timeline
  
  // Relations for current UI
  producto_sku?: string;
  producto_nombre?: string;
  usuario?: string;
}

export interface AuditBlock {
  id: string;
  transaccion_id: string;
  usuario_id: string;
  hash_anterior: string;
  hash_actual: string;
  timestamp_bloque: string;
  datos: string; // JSON string with transaction details
  firma_usuario: string;
  red_blockchain: string;
  hash_transaccion: string;
  
  // Relations for current UI
  transaccion_tipo?: string;
  usuario?: string;
  detalles?: string;
}

export interface IntentoAcceso {
  id: string;
  nombre_usuario_intento: string;
  usuario_id: string | null;
  exito: boolean;
  intentado_en: string;
  direccion_ip: string;
}

export interface RegistroEvento {
  id: string;
  usuario_id: string;
  producto_id: string | null;
  tipo_evento: string;
  categoria_evento: string;
  detalles: string;
  direccion_ip: string;
  agente_usuario: string;
}

export interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  totalMovementsToday: number;
  auditBlocksVerified: number;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}
