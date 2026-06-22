import React, { useState, useEffect } from 'react';
import { ShieldCheck, Activity, Key, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { RegistroEvento, IntentoAcceso } from '../types';
import { fetchApi } from '../api';
import { format } from 'date-fns';
import { cn } from '../components/Layout';

export default function Events() {
  const [activeTab, setActiveTab] = useState<'events' | 'accesses'>('events');
  const [events, setEvents] = useState<any[]>([]);
  const [accesses, setAccesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eventsData, accessesData] = await Promise.all([
        fetchApi('/eventos'),
        fetchApi('/accesos')
      ]);
      setEvents(eventsData);
      setAccesses(accessesData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatEventDetails = (ev: any) => {
    if (!ev.detalles) return 'Sin detalles adicionales';
    let detailsObj = ev.detalles;
    if (typeof detailsObj === 'string') {
      try {
        detailsObj = JSON.parse(detailsObj);
      } catch {
        return detailsObj;
      }
    }
    
    switch (ev.tipo_evento) {
      case 'PRODUCTO_CREADO':
        return `Creación de producto nuevo con SKU: ${detailsObj.sku || 'N/A'}`;
      case 'PRODUCTO_ACTUALIZADO':
        return `Actualización de datos del producto con SKU: ${detailsObj.sku || 'N/A'}`;
      case 'PRODUCTO_ELIMINADO':
        return `Eliminación de producto de inventario (ID/SKU: ${detailsObj.sku || detailsObj.id || 'N/A'})`;
      case 'STOCK_INGRESO':
        return `Ingreso autorizado de stock: ${detailsObj.amount || 0} unidades`;
      case 'STOCK_SALIDA':
        return `Egreso de inventario registrado: ${detailsObj.amount || 0} unidades`;
      case 'AJUSTE_STOCK':
        return `Ajuste manual de inventario: ${detailsObj.amount || 0} unidades`;
      case 'USUARIO_CREADO':
        return `Creación de nuevo usuario del sistema: ${detailsObj.username || 'N/A'}`;
      case 'USUARIO_COMPROMETIDO':
        return `Bloqueo de seguridad preventivo sobre cuenta: ${detailsObj.username || 'N/A'}`;
      default:
        // Pretty list
        if (typeof detailsObj === 'object') {
          return Object.entries(detailsObj)
            .map(([k, v]) => {
              const label = k.replace(/_/g, ' ');
              return `${label.charAt(0).toUpperCase() + label.slice(1)}: ${v}`;
            })
            .join(' | ');
        }
        return String(detailsObj);
    }
  };

  const getEventBadgeClass = (categoria: string) => {
    if (categoria === 'CRITICO') return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Registros del Sistema</h2>
          <p className="text-slate-500 text-sm mt-1">Auditoría de eventos y control de accesos.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('events')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                activeTab === 'events' ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <Activity className="w-4 h-4" />
              Eventos del Sistema
            </button>
            <button
              onClick={() => setActiveTab('accesses')}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                activeTab === 'accesses' ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <Key className="w-4 h-4" />
              Intentos de Acceso
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Cargando registros...</div>
          ) : activeTab === 'events' ? (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="py-3 px-6">ID / Fecha</th>
                  <th className="py-3 px-6">Evento</th>
                  <th className="py-3 px-6">Categoría</th>
                  <th className="py-3 px-6">Usuario</th>
                  <th className="py-3 px-6">Detalles</th>
                  <th className="py-3 px-6">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((ev, i) => (
                  <tr key={ev.id || i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6 text-slate-600">
                      <div className="font-mono text-xs mb-1">{ev.id?.substring(0,8)}</div>
                      <div className="text-xs text-slate-400">{format(new Date(ev.ocurrido_en), "dd MMM HH:mm")}</div>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-800">
                      {ev.tipo_evento}
                    </td>
                    <td className="py-4 px-6">
                      <span className={cn(
                        "inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide border",
                        getEventBadgeClass(ev.categoria_evento)
                      )}>
                        {ev.categoria_evento}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      {ev.usuarios?.nombre_usuario || ev.usuario_id || 'Sistema'}
                    </td>
                    <td className="py-4 px-6 text-slate-600 font-medium text-xs max-w-sm truncate" title={formatEventDetails(ev)}>
                      {formatEventDetails(ev)}
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-mono text-xs">
                      {ev.direccion_ip}
                    </td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-500 text-sm">No hay eventos recientes.</td></tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="py-3 px-6">Fecha</th>
                  <th className="py-3 px-6">Usuario Intentado</th>
                  <th className="py-3 px-6">Estado</th>
                  <th className="py-3 px-6">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accesses.map((acc, i) => (
                  <tr key={acc.id || i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6 text-slate-600">
                      {format(new Date(acc.intentado_en), "dd MMM yyyy HH:mm:ss")}
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-800">
                        {acc.nombre_usuario_intento}
                    </td>
                    <td className="py-4 px-6">
                        {acc.exito ? (
                           <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border bg-green-50 text-green-700 border-green-200">EXITOSO</span>
                        ) : (
                           <span className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border bg-red-50 text-red-700 border-red-200">FALLIDO</span>
                        )}
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-mono text-xs">
                        {acc.direccion_ip}
                    </td>
                  </tr>
                ))}
                 {accesses.length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-slate-500 text-sm">No hay accesos registrados.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
