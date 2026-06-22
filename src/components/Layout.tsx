import React from 'react';
import { User } from '../types';
import { LayoutDashboard, Package, ArrowRightLeft, ShieldCheck, Activity, Settings, LogOut, Menu, Users as UsersIcon, FileText } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  user: User;
  currentView: string;
  setCurrentView: (view: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function Layout({ user, currentView, setCurrentView, onLogout, children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'operador', 'auditor'] },
    { id: 'inventory', label: 'Inventario', icon: Package, roles: ['admin', 'operador'] },
    { id: 'transactions', label: 'Movimientos', icon: ArrowRightLeft, roles: ['admin', 'operador'] },
    { id: 'audit', label: 'Auditoría Blockchain', icon: ShieldCheck, roles: ['admin', 'auditor'] },
    { id: 'events', label: 'Eventos del Sistema', icon: Activity, roles: ['admin', 'auditor'] },
    { id: 'reports', label: 'Reportes', icon: FileText, roles: ['admin', 'auditor', 'operador'] },
    { id: 'users', label: 'Usuarios y Roles', icon: UsersIcon, roles: ['admin'] },
    { id: 'settings', label: 'Configuración', icon: Settings, roles: ['admin'] },
  ];

  const allowedNav = navItems.filter(item => item.roles.includes(user.rol));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Topbar */}
      <div className="md:hidden flex items-center justify-between bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold tracking-tight">ChainStock ERP</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-300 hover:text-white">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "bg-slate-900 border-r border-slate-800 text-slate-300 w-64 flex-shrink-0 flex-col transition-transform duration-300 fixed inset-y-0 left-0 z-30 md:static md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 hidden md:flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold tracking-tight text-lg">ChainStock ERP</span>
        </div>

        <div className="px-6 pb-6 pt-4 md:pt-0">
          <div className="mb-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Menú Principal</div>
          <nav className="space-y-1">
            {allowedNav.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    setSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-blue-600/10 text-blue-400" 
                      : "hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? "text-blue-400" : "text-slate-400")} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-800 mt-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
              <span className="text-sm font-medium text-white">{user.nombre_usuario.substring(0,2).toUpperCase()}</span>
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium text-white truncate">{user.nombre_usuario}</span>
              <span className="text-xs text-slate-500 capitalize">{user.rol}</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Topbar */}
        <header className="hidden md:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-8 flex-shrink-0">
          <h1 className="text-xl font-semibold text-slate-800 capitalize">
            {allowedNav.find(n => n.id === currentView)?.label || currentView}
          </h1>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1.5 border border-green-200">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              SQL DB Online
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
      
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
