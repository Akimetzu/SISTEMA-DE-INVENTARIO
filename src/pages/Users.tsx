import React, { useState } from 'react';
import { User, RoleCode } from '../types';
import { Search, Plus, UserCog, Shield, ShieldCheck, X, Edit, Trash2 } from 'lucide-react';
import { fetchApi } from '../api';

interface UsersProps {
  currentUser: User;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  signTransactionBlock: (payload: {
    producto_sku?: string;
    producto_nombre?: string;
    tipo_transaccion: string;
    cantidad?: number;
    stock_antes?: number;
    stock_despues?: number;
    nota_referencia: string;
    usuario_afectado?: string;
    correo_afectado?: string;
  }) => Promise<{
    firma: string;
    txHash: string;
    hashAnterior: string;
    hashActual: string;
    detailsString: string;
    redBlockchain: string;
  }>;
}

export default function Users({ currentUser, users, setUsers, signTransactionBlock }: UsersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [userForm, setUserForm] = useState({
    nombre_usuario: '',
    nombre_completo: '',
    correo: '',
    rol: 'operador' as RoleCode,
    clave: '',
  });

  const filtered = users.filter(u => 
    u.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.nombre_usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.correo || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openAddModal = () => {
    setEditingUserId(null);
    setUserForm({ nombre_usuario: '', nombre_completo: '', correo: '', rol: 'operador', clave: '' });
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUserId(user.id);
    setUserForm({
      nombre_usuario: user.nombre_usuario,
      nombre_completo: user.nombre_completo,
      correo: user.correo || '',
      rol: user.rol || 'operador',
      clave: '',
    });
    setShowModal(true);
  };

  const confirmDeleteUser = (id: string) => {
    setUserToDelete(id);
  };

  const executeDeleteUser = async () => {
    if (userToDelete) {
      try {
        await fetchApi(`/usuarios/${userToDelete}`, {
          method: 'DELETE'
        });
        setUsers(users.map(u => u.id === userToDelete ? { ...u, activo: false } : u));
      } catch (err) {
        console.error("Error deleting user", err);
        alert("Error al desactivar el usuario");
      }
      setUserToDelete(null);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingUserId) {
        const updated = await fetchApi(`/usuarios/${editingUserId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...userForm })
        });
        setUsers(users.map(u => u.id === editingUserId ? updated : u));
        setShowModal(false);
      } else {
        if (!userForm.clave || userForm.clave.length < 6) {
          alert("La contraseña para crear un usuario debe ser obligatoria y tener al menos 6 caracteres.");
          setLoading(false);
          return;
        }

        // Must run real MetaMask Sepolia transaction
        alert("Se solicitará su firma en MetaMask para registrar al nuevo usuario de manera inmutable en Sepolia. Si se rechaza la firma, no se guardará el usuario.");
        const signedBlock = await signTransactionBlock({
          tipo_transaccion: 'CREAR_USUARIO',
          nota_referencia: `Creación de operador/usuario: ${userForm.nombre_usuario}`,
          usuario_afectado: userForm.nombre_usuario,
          correo_afectado: userForm.correo
        });

        // Send parameters to backend
        const created = await fetchApi('/usuarios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...userForm,
            firma_blockchain: signedBlock.firma,
            tx_hash_blockchain: signedBlock.txHash,
            hash_anterior: signedBlock.hashAnterior,
            hash_actual: signedBlock.hashActual,
            datos_blockchain: signedBlock.detailsString,
            red_blockchain: signedBlock.redBlockchain
          })
        });

        setUsers([...users, created]);
        setShowModal(false);
      }
    } catch (err: any) {
      console.error("Error saving user", err);
      // Let the exact metamask rejection show
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: RoleCode) => {
    if (role === 'admin') return <Shield className="w-4 h-4 text-rose-500" />;
    if (role === 'auditor') return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
    return <UserCog className="w-4 h-4 text-blue-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative max-w-md w-full">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar usuarios..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {currentUser.rol === 'admin' && (
          <button 
            onClick={openAddModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nuevo Usuario
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Usuario</th>
                <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Detalles</th>
                <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Rol</th>
                <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                <th className="py-3 px-6 text-xs font-semibold text-slate-500 uppercase text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium text-xs border border-slate-200 shrink-0">
                        {u.nombre_usuario.substring(0,2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800 text-sm block">{u.nombre_usuario}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm text-slate-800">{u.nombre_completo}</div>
                    <div className="text-xs text-slate-500">{u.correo}</div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 border border-slate-200 text-slate-700 capitalize">
                      {getRoleIcon(u.rol || 'operador')}
                      {u.rol}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    {u.activo ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 border border-slate-200 text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Inactivo
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    {currentUser.rol === 'admin' ? (
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openEditModal(u)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => confirmDeleteUser(u.id)}
                          className={`p-1.5 rounded-lg transition-colors ${u.id === currentUser.id ? 'text-slate-300 cursor-not-allowed' : 'text-red-600 hover:bg-red-50'}`}
                          title={u.id === currentUser.id ? "No puedes eliminarte a ti mismo" : "Eliminar"}
                          disabled={u.id === currentUser.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Solo visualización</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-sm">
            No se encontraron usuarios coincidiendo con la búsqueda.
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">
                {editingUserId ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nombre de Usuario</label>
                <input required type="text" value={userForm.nombre_usuario} onChange={e => setUserForm({...userForm, nombre_usuario: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ej. admin.nuevo" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nombre Completo</label>
                <input required type="text" value={userForm.nombre_completo} onChange={e => setUserForm({...userForm, nombre_completo: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ej. Juan Pérez" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Correo Electrónico</label>
                <input required type="email" value={userForm.correo} onChange={e => setUserForm({...userForm, correo: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="usuario@empresa.com" />
              </div>
              {!editingUserId && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Contraseña (Mín. 6 car.)</label>
                  <input required type="password" value={userForm.clave} onChange={e => setUserForm({...userForm, clave: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" minLength={6} />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Rol en el Sistema</label>
                <select value={userForm.rol} onChange={e => setUserForm({...userForm, rol: e.target.value as RoleCode})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="operador">Operador (Gestión de Inventario)</option>
                  <option value="admin">Administrador (Acceso Total)</option>
                  <option value="auditor">Auditor (Solo Lectura/Trazabilidad)</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" disabled={loading} onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={loading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-70">
                  {loading ? 'Procesando...' : (editingUserId ? 'Guardar Cambios' : 'Crear Usuario')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden p-6 text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Eliminar Usuario</h3>
            <p className="text-sm text-slate-500 mb-6">¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setUserToDelete(null)} className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">Cancelar</button>
              <button onClick={executeDeleteUser} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
