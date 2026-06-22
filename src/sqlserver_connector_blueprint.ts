/**
 * BLUEPRINT DE CONEXIÓN A MICROSOFT SQL SERVER (PARA INTEGRACIÓN FUTURA)
 * 
 * Este archivo establece la interfaz de persistencia de datos (Repository Pattern).
 * El backend se puede migrar a Microsoft SQL Server de forma transparente simplemente
 * implementando esta interfaz utilizando la librería 'mssql' o un ORM compatible (como TypeORM o Prisma).
 */

export interface IDatabaseRepository {
  // Autenticación y Gestión de Usuarios
  obtenerUsuarioPorNombre(nombreUsuario: string): Promise<any>;
  registrarIntentoAcceso(datos: {
    nombre_usuario_intentado: string;
    usuario_id: string | null;
    exito: boolean;
    direccion_ip: string;
    agente_usuario: string;
  }): Promise<void>;
  
  // Productos e Inventario
  listarProductos(): Promise<any[]>;
  obtenerProductoPorId(id: string): Promise<any>;
  crearProducto(producto: any, stockInicial: number, umbralStockBajo: number): Promise<any>;
  actualizarProducto(id: string, producto: any): Promise<any>;
  desactivarProducto(id: string): Promise<boolean>;
  
  // Movimientos de Stock
  registrarTransaccion(transaccion: any): Promise<any>;
  listarTransacciones(): Promise<any[]>;
  
  // Eventos del Sistema
  registrarEventoCritico(usuarioId: string, tipo: string, detalle: string, productoId?: string): Promise<void>;
  registrarEventoNoCritico(usuarioId: string, tipo: string, detalle: string): Promise<void>;
  listarEventos(): Promise<any[]>;
  
  // Auditoría Blockchain
  registrarBloqueAuditoria(bloque: {
    hash_anterior: string;
    hash_actual: string;
    datos: string;
    firma_usuario: string;
    red_blockchain: string;
    hash_transaccion: string;
  }): Promise<any>;
  listarBloquesAuditoria(): Promise<any[]>;
}

/**
 * Ejemplo ilustrativo de cómo importar y configurar la librería oficial 'mssql' en Node.js/TypeScript:
 * 
 * import mssql from 'mssql';
 * 
 * const sqlConfig = {
 *   user: process.env.SQLSERVER_USER || 'sa',
 *   password: process.env.SQLSERVER_PASSWORD || '',
 *   server: process.env.SQLSERVER_HOST || 'localhost',
 *   port: parseInt(process.env.SQLSERVER_PORT || '1433'),
 *   database: process.env.SQLSERVER_DATABASE || 'chainstock_erp',
 *   options: {
 *     encrypt: process.env.SQLSERVER_ENCRYPT === 'true', // usar true para Azure
 *     trustServerCertificate: true // usar true en ambientes locales / auto-firmados
 *   }
 * };
 * 
 * export async function conectionSQLServer() {
 *   try {
 *     let pool = await mssql.connect(sqlConfig);
 *     console.log("Conectado exitosamente a Microsoft SQL Server");
 *     return pool;
 *   } catch (err) {
 *     console.error("Error en conexión a SQL Server: ", err);
 *     throw err;
 *   }
 * }
 */
