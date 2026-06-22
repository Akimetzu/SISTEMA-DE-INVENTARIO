import React, { useState } from 'react';
import { Product, User, Transaction } from '../types';
import { Search, Filter, Plus, AlertCircle, X, Edit, Trash2 } from 'lucide-react';
import { cn } from '../components/Layout';

import { fetchApi } from '../api';

interface InventoryProps {
  currentUser: User;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  addTransaction: (tx: Omit<Transaction, 'id' | 'ocurrido_en'>) => Promise<void>;
  signTransactionBlock: (tx: any) => Promise<any>;
  loadInitialData: () => Promise<void>;
}

export default function Inventory({ 
  currentUser, 
  products, 
  setProducts, 
  addTransaction, 
  signTransactionBlock, 
  loadInitialData 
}: InventoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  const [productForm, setProductForm] = useState({
    sku: '',
    nombre: '',
    descripcion: '',
    categoria: '',
    precio: 0,
    stock_actual: 0,
    umbral_stock_bajo: 5
  });

  const filtered = products.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openAddModal = () => {
    if (currentUser.rol !== 'admin') return;
    setEditingProductId(null);
    setProductForm({ sku: '', nombre: '', descripcion: '', categoria: '', precio: 0, stock_actual: 0, umbral_stock_bajo: 5 });
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    if (currentUser.rol !== 'admin') return;
    setEditingProductId(product.id);
    setProductForm({
      sku: product.sku,
      nombre: product.nombre,
      descripcion: product.descripcion || '',
      categoria: product.categoria,
      precio: product.precio,
      stock_actual: product.inventario?.stock_actual || 0,
      umbral_stock_bajo: product.inventario?.umbral_stock_bajo || 0
    });
    setShowModal(true);
  };

  const confirmDeleteProduct = (id: string) => {
    if (currentUser.rol !== 'admin') return;
    setProductToDelete(id);
  };

  const executeDeleteProduct = async () => {
    if (productToDelete) {
      const product = products.find(p => p.id === productToDelete);
      if (product) {
        const stock_antes = product.inventario?.stock_actual || 0;
        const proposedTx = {
          producto_sku: product.sku,
          producto_nombre: product.nombre,
          tipo_transaccion: stock_antes > 0 ? 'OUT' as const : 'AJUSTE' as const,
          cantidad: stock_antes > 0 ? stock_antes : 1,
          stock_antes: stock_antes,
          stock_despues: 0,
          nota_referencia: `Elimino producto ${product.sku} del catálogo`
        };

        try {
          // STEP 1: Request MetaMask signature. Aborts if rejected.
          const signed = await signTransactionBlock(proposedTx);

          // STEP 2: Delete from Database (fully blockchain verified and registered on backend atomically)
          await fetchApi(`/productos/${productToDelete}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firma_usuario: signed.firma,
              hash_transaccion: signed.txHash,
              hash_anterior: signed.hashAnterior,
              hash_actual: signed.hashActual,
              datos: signed.detailsString,
              red_blockchain: signed.redBlockchain
            })
          });

          await loadInitialData();
          alert("¡Producto eliminado y confirmado en Blockchain de manera exitosa!");
        } catch (err: any) {
          console.error("Deletion aborted or failed during blockchain signing:", err);
          alert(err.message || "Operación cancelada en Blockchain. El producto NO ha sido eliminado.");
        }
      }
      setProductToDelete(null);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const sanitizedForm = {
        ...productForm,
        precio: Number(productForm.precio) || 0,
        stock_actual: Number(productForm.stock_actual) || 0,
        umbral_stock_bajo: Number(productForm.umbral_stock_bajo) || 0
      };

      if (editingProductId) {
        const originalProduct = products.find(p => p.id === editingProductId);
        const stock_antes = originalProduct?.inventario?.stock_actual ?? 0;
        const stock_despues = sanitizedForm.stock_actual;
        const diff = stock_despues - stock_antes;

        let proposedTx;
        if (diff !== 0) {
          proposedTx = {
            producto_sku: sanitizedForm.sku,
            producto_nombre: sanitizedForm.nombre,
            tipo_transaccion: diff > 0 ? 'IN' as const : 'OUT' as const,
            cantidad: Math.abs(diff),
            stock_antes: stock_antes,
            stock_despues: stock_despues,
            nota_referencia: `Ajuste manual de stock para ${sanitizedForm.sku} (${stock_antes} -> ${stock_despues})`
          };
        } else {
          proposedTx = {
            producto_sku: sanitizedForm.sku,
            producto_nombre: sanitizedForm.nombre,
            tipo_transaccion: 'AJUSTE' as const,
            cantidad: 1,
            stock_antes: stock_antes,
            stock_despues: stock_antes,
            nota_referencia: `Actualización de metadatos del producto con SKU: ${sanitizedForm.sku}`
          };
        }

        // STEP 1: Sign on Blockchain first
        const signed = await signTransactionBlock(proposedTx);

        // STEP 2: Only on successful signature, save product updates and register trans/audit to db atomically
        await fetchApi(`/productos/${editingProductId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...sanitizedForm,
            firma_usuario: signed.firma,
            hash_transaccion: signed.txHash,
            hash_anterior: signed.hashAnterior,
            hash_actual: signed.hashActual,
            datos: signed.detailsString,
            red_blockchain: signed.redBlockchain
          })
        });

        await loadInitialData();
        alert("¡Cambios del producto actualizados y confirmados en Blockchain!");
      } else {
        const stock_inicial = sanitizedForm.stock_actual;
        const proposedTx = {
          producto_sku: sanitizedForm.sku,
          producto_nombre: sanitizedForm.nombre,
          tipo_transaccion: stock_inicial > 0 ? 'IN' as const : 'AJUSTE' as const,
          cantidad: stock_inicial > 0 ? stock_inicial : 1,
          stock_antes: 0,
          stock_despues: stock_inicial,
          nota_referencia: `Registro de producto nuevo ${sanitizedForm.sku} con stock inicial ${stock_inicial}`
        };

        // STEP 1: Sign on Blockchain first
        const signed = await signTransactionBlock(proposedTx);

        // STEP 2: Only on successful signature, create product, inventory, and transaction atomically in DB
        await fetchApi('/productos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...sanitizedForm,
            firma_usuario: signed.firma,
            hash_transaccion: signed.txHash,
            hash_anterior: signed.hashAnterior,
            hash_actual: signed.hashActual,
            datos: signed.detailsString,
            red_blockchain: signed.redBlockchain
          })
        });

        await loadInitialData();
        alert("¡Nuevo producto registrado y confirmado en Blockchain de manera exitosa!");
      }
    setShowModal(false);
  } catch (err: any) {
    console.error("Product save aborted or failed:", err);
    alert(err.message || "Operación cancelada. No se han guardado los cambios en la base de datos ni en el sistema.");
  }
};

  return (
    <div className="space-y-6">
      {/* Page Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative max-w-md w-full">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por SKU, nombre..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors">
            <Filter className="w-4 h-4" /> Filtros
          </button>
          {currentUser.rol === 'admin' && (
            <button 
              onClick={openAddModal}
              className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Nuevo Producto
            </button>
          )}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU & Producto</th>
                <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Categoría</th>
                <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Precio</th>
                <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
                <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((product) => {
                const stockActual = product.inventario?.stock_actual || 0;
                const umbralStockBajo = product.inventario?.umbral_stock_bajo || 0;
                const isLowStock = stockActual <= umbralStockBajo;
                const isOutOfStock = stockActual === 0;
                
                return (
                  <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 text-sm">{product.nombre}</span>
                        <span className="text-xs text-slate-500 font-mono mt-0.5">{product.sku}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600">{product.categoria}</td>
                    <td className="py-4 px-6 text-sm text-slate-800 font-medium">${product.precio.toFixed(2)}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-bold",
                          isOutOfStock ? "text-red-600" : isLowStock ? "text-amber-600" : "text-green-600"
                        )}>
                          {stockActual}
                        </span>
                        <span className="text-xs text-slate-400">/ min {umbralStockBajo}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                          <AlertCircle className="w-3.5 h-3.5" /> Agotado
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                          <AlertCircle className="w-3.5 h-3.5" /> Stock Bajo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                          Normal
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {currentUser.rol === 'admin' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => openEditModal(product)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => confirmDeleteProduct(product.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Solo visualización</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-sm">
            No se encontraron productos coincidiendo con la búsqueda.
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">
                {editingProductId ? 'Editar Producto' : 'Añadir Nuevo Producto'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">SKU</label>
                  <input required type="text" value={productForm.sku} onChange={e => setProductForm({...productForm, sku: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ej. PRD-001" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Categoría</label>
                  <input required type="text" value={productForm.categoria} onChange={e => setProductForm({...productForm, categoria: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ej. Electrónica" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nombre del Producto</label>
                <input required type="text" value={productForm.nombre} onChange={e => setProductForm({...productForm, nombre: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nombre completo" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Descripción</label>
                <textarea rows={2} value={productForm.descripcion} onChange={e => setProductForm({...productForm, descripcion: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Descripción breve..." />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Precio ($)</label>
                  <input required type="number" min="0" step="0.01" value={isNaN(productForm.precio) ? '' : productForm.precio} onChange={e => {
                    const val = parseFloat(e.target.value);
                    setProductForm({...productForm, precio: isNaN(val) ? '' as any : val});
                  }} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Stock Actual</label>
                  <input required type="number" min="0" value={isNaN(productForm.stock_actual) ? '' : productForm.stock_actual} onChange={e => {
                    const val = parseInt(e.target.value, 10);
                    setProductForm({...productForm, stock_actual: isNaN(val) ? '' as any : val});
                  }} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Stock Mínimo</label>
                  <input required type="number" min="0" value={isNaN(productForm.umbral_stock_bajo) ? '' : productForm.umbral_stock_bajo} onChange={e => {
                    const val = parseInt(e.target.value, 10);
                    setProductForm({...productForm, umbral_stock_bajo: isNaN(val) ? '' as any : val});
                  }} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                  {editingProductId ? 'Guardar Cambios' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden p-6 text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Eliminar Producto</h3>
            <p className="text-sm text-slate-500 mb-6">¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setProductToDelete(null)} className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">Cancelar</button>
              <button onClick={executeDeleteProduct} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
