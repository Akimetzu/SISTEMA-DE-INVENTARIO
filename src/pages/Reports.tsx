import React from 'react';
import { Download, FileSpreadsheet, ArrowRightLeft, ShieldCheck } from 'lucide-react';
import { Product, Transaction, AuditBlock, User } from '../types';

interface ReportsProps {
  currentUser: User;
  products: Product[];
  transactions: Transaction[];
  auditLogs: AuditBlock[];
}

export default function Reports({ currentUser, products, transactions, auditLogs }: ReportsProps) {
  const downloadCSV = (filename: string, headers: string[], data: any[][]) => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...data.map(e => e.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportInventory = () => {
    downloadCSV("inventario.csv", 
      ["SKU", "Nombre", "Categoria", "Precio", "Stock Actual", "Mínimo"], 
      products.map(p => [
        p.sku, 
        `"${p.nombre}"`, 
        p.categoria, 
        p.precio, 
        p.inventario?.stock_actual || 0, 
        p.inventario?.umbral_stock_bajo || 0
      ])
    );
  };

  const exportTransactions = () => {
    downloadCSV("transacciones.csv", 
      ["Fecha", "SKU", "Usuario", "Tipo", "Cant", "Antes", "Despues", "Ref"], 
      transactions.map(t => [
        t.ocurrido_en || '', 
        t.producto_sku || '', 
        t.usuario || '', 
        t.tipo_transaccion, 
        t.cantidad, 
        t.stock_antes, 
        t.stock_despues, 
        `"${t.nota_referencia}"`
      ])
    );
  };

  const exportAudit = () => {
     downloadCSV("auditoria_blockchain.csv", 
      ["Fecha", "TX ID", "Usuario", "Hash Anterior", "Hash Actual", "Tipo Tx"], 
      auditLogs.map(a => [
        a.timestamp_bloque, 
        a.transaccion_id, 
        a.usuario || '', 
        a.hash_anterior, 
        a.hash_actual, 
        a.transaccion_tipo || ''
      ])
    );
  };

  const canViewAudit = currentUser.rol === 'admin' || currentUser.rol === 'auditor';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Reportes y Exportaciones</h2>
          <p className="text-slate-500 text-sm mt-1">Descarga la vista consolidada de los datos del sistema en formato CSV.</p>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${canViewAudit ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6`}>
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center shadow-sm text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Inventario Actual</h3>
          <p className="text-slate-500 text-sm mb-6 flex-1">Exporta el listado completo de productos con su stock actual, precios y niveles de alerta.</p>
          <button onClick={exportInventory} className="w-full py-2.5 px-4 bg-white border-2 border-slate-200 hover:border-blue-500 text-slate-700 hover:text-blue-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
            <Download className="w-4 h-4" /> Descargar CSV
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center shadow-sm text-center">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-4">
            <ArrowRightLeft className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Movimientos (Kárdex)</h3>
          <p className="text-slate-500 text-sm mb-6 flex-1">Historial completo de entradas, salidas y ajustes de inventario con responsable.</p>
          <button onClick={exportTransactions} className="w-full py-2.5 px-4 bg-white border-2 border-slate-200 hover:border-blue-500 text-slate-700 hover:text-blue-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
            <Download className="w-4 h-4" /> Descargar CSV
          </button>
        </div>

        {canViewAudit && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center shadow-sm text-center">
            <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-4">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Registro de Auditoría</h3>
            <p className="text-slate-500 text-sm mb-6 flex-1">Bloques generados en el proceso de auditoría con la información criptográfica inmutable.</p>
            <button onClick={exportAudit} className="w-full py-2.5 px-4 bg-white border-2 border-slate-200 hover:border-purple-500 text-slate-700 hover:text-purple-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
              <Download className="w-4 h-4" /> Descargar CSV
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
// added this to fix missing ArrowRightLeft import, I'll update it now
