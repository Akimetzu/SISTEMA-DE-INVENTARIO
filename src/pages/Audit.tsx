import React, { useState, useEffect } from 'react';
import { AuditBlock } from '../types';
import { Shield, Fingerprint, Lock, CheckCircle2, Wallet, ExternalLink, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface AuditProps {
  auditLogs: AuditBlock[];
}

export default function Audit({ auditLogs }: AuditProps) {
  const [inIframe, setInIframe] = useState(false);

  useEffect(() => {
    try {
      if (window.self !== window.top) {
        setInIframe(true);
      }
    } catch {
      setInIframe(true);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 rounded-xl p-6 shadow-md text-white overflow-hidden relative animate-fadeIn">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <Shield className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Registro Inmutable de Auditoría Blockchain</h2>
              <p className="text-slate-400 text-sm mt-1 max-w-2xl">
                Visualización de bloques firmados y auditados de manera innegable y duradera. Las operaciones críticas de inventario pasan por firmas de MetaMask en Sepolia y se enlazan criptográficamente.
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <span className="text-xs bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg text-slate-300 font-mono block text-center">
              Bloques en Cadena: <strong className="text-blue-400">{auditLogs.length}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Frame / Sandbox Warning */}
      {inIframe && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 shadow-xs animate-fadeIn">
          <div className="p-1.5 bg-amber-100 rounded-lg text-amber-800 font-bold text-xs shrink-0 font-sans">
            ⚠ RESTRICCIÓN DE IFRAME
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-800">Seguridad de MetaMask en Entornos Embebidos</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Está visualizando esta página dentro de un marco embebido (iframe). Por seguridad inherente del navegador, <strong>las extensiones web como MetaMask NO pueden inyectarse</strong> ni conectarse en un iframe cruzado.
            </p>
            <p className="text-xs font-semibold text-amber-800">
              👉 Para operar con MetaMask, abra la aplicación directamente en su pestaña independiente del navegador.
            </p>
          </div>
        </div>
      )}


      {/* Block Explorer Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700">Explorador de Bloques (Node Sincronizado con Supabase y MetaMask)</h3>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Red Sincronizada
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-slate-200">
                <th className="py-3 px-6 text-xs font-bold text-slate-900 uppercase">Timestamp / Red</th>
                <th className="py-3 px-6 text-xs font-bold text-slate-900 uppercase">Firma / Operación</th>
                <th className="py-3 px-6 text-xs font-bold text-slate-900 uppercase">Hash Anterior</th>
                <th className="py-3 px-6 text-xs font-bold text-slate-900 uppercase">Hash Bloque (SHA-256)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map((block) => {
                let parsedData = null;
                try {
                  if (block.datos) parsedData = JSON.parse(block.datos);
                } catch { /* ignore */ }

                return (
                  <tr key={block.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-4 px-6 align-top">
                      <span className="text-sm text-slate-600 font-medium block">
                        {new Date(block.timestamp_bloque).toLocaleString()}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-purple-50 text-purple-600 border border-purple-100 mt-1 inline-block">
                        {block.red_blockchain || 'SEPOLIA TESTNET'}
                      </span>
                    </td>
                    <td className="py-4 px-6 align-top max-w-xs">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-slate-100 text-slate-600 truncate max-w-[120px]" title={block.firma_usuario || 'System'}>
                          Firma: {block.usuario || (block.firma_usuario ? block.firma_usuario.substring(0, 15) + '...' : 'System')}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-blue-50 text-blue-600 border border-blue-100">
                          {block.transaccion_tipo || parsedData?.tipo_transaccion || 'OPERACION'}
                        </span>
                      </div>
                      {block.detalles && (
                        <p className="text-sm text-slate-800 line-clamp-2" title={block.detalles}>
                          {block.detalles}
                        </p>
                      )}
                      {block.hash_transaccion && (
                        <p className="text-[10px] text-slate-400 font-mono mt-1 select-all" title={block.hash_transaccion}>
                          Tx Hash: {block.hash_transaccion}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-6 align-top max-w-[200px]">
                      <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200">
                        <Fingerprint className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono text-xs text-slate-500 truncate" title={block.hash_anterior}>
                          {block.hash_anterior}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 align-top max-w-[200px]">
                      <div className="flex items-center gap-2 bg-blue-50/50 px-2.5 py-1.5 rounded border border-blue-100 group-hover:border-blue-300 transition-colors">
                        <Shield className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="font-mono text-xs text-blue-700 truncate font-semibold animate-pulse" title={block.hash_actual}>
                          {block.hash_actual}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
