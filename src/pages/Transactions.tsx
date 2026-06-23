import React, { useState } from 'react';
import { Transaction } from '../types';
import { Search, Filter, X } from 'lucide-react';
import { cn } from '../components/Layout';

interface TransactionsProps {
  transactions: Transaction[];
}

export default function Transactions({ transactions }: TransactionsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState('todos'); // 'todos', 'IN', 'OUT', 'AJUSTE'
  const [filterUser, setFilterUser] = useState('todos');

  // Dynamic distinct users extraction
  const activeUsers = Array.from(new Set(transactions.map(t => t.usuario))).filter(Boolean) as string[];

  const filtered = transactions.filter(t => {
    const matchesSearch = (t.producto_nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.producto_sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.usuario || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.nota_referencia || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'todos' || t.tipo_transaccion === filterType;
    const matchesUser = filterUser === 'todos' || t.usuario === filterUser;

    return matchesSearch && matchesType && matchesUser;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative max-w-md w-full">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar movimientos..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex-1 sm:flex-none px-4 py-2 bg-white border text-slate-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors",
              showFilters ? "border-blue-500 text-blue-600 bg-blue-50/50" : "border-slate-200 hover:bg-slate-50"
            )}
          >
            <Filter className="w-4 h-4" /> Filtros {(filterType !== 'todos' || filterUser !== 'todos') ? '●' : ''}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in duration-200">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Tipo de Movimiento</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos los movimientos</option>
              <option value="IN">Entradas (IN)</option>
              <option value="OUT">Salidas (OUT)</option>
              <option value="AJUSTE">Ajustes manuales</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Usuario Responsable</label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos los usuarios</option>
              {activeUsers.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            {(filterType !== 'todos' || filterUser !== 'todos') && (
              <button
                type="button"
                onClick={() => {
                  setFilterType('todos');
                  setFilterUser('todos');
                }}
                className="w-full px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <X className="w-4 h-4" /> Limpiar Filtros
              </button>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Producto</th>
                <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Detalle</th>
                <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Usuario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6 text-sm text-slate-600">
                    {t.ocurrido_en ? new Date(t.ocurrido_en).toLocaleString() : ''}
                  </td>
                  <td className="py-4 px-6">
                    <span className={cn(
                      "inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border",
                      t.tipo_transaccion === 'IN' ? "bg-green-50 text-green-700 border-green-200" :
                        t.tipo_transaccion === 'OUT' ? "bg-red-50 text-red-700 border-red-200" :
                          "bg-blue-50 text-blue-700 border-blue-200"
                    )}>
                      {t.tipo_transaccion}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-800 text-sm">{t.producto_nombre}</span>
                      <span className="text-xs text-slate-500 font-mono mt-0.5">{t.producto_sku}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-600">{t.nota_referencia}</td>
                  <td className="py-4 px-6 text-sm font-medium text-slate-700">{t.usuario}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-sm">
            No se encontraron movimientos coincidiendo con la búsqueda o filtros aplicados.
          </div>
        )}
      </div>
    </div>
  );
}