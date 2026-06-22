import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Audit from './pages/Audit';
import Users from './pages/Users';
import Transactions from './pages/Transactions';
import Settings from './pages/Settings';
import { User, Product, AuditBlock, DashboardStats, Transaction } from './types';
import { ShieldCheck, User as UserIcon } from 'lucide-react';

import Events from './pages/Events';
import Reports from './pages/Reports';

import Login from './pages/Login';

import { fetchApi, setAuthToken } from './api';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');

  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditBlock[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Clear any residual tokens from previous iterations on mount to guarantee fresh sessions
    localStorage.removeItem('token');
    setAuthToken(null);
  }, []);

  useEffect(() => {
    if (user) {
      loadInitialData();
    }
  }, [user]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [prodRes, txRes, auditRes, userRes] = await Promise.all([
        fetchApi('/productos'),
        fetchApi('/transacciones'),
        fetchApi('/auditoria'),
        user.rol === 'admin' ? fetchApi('/usuarios') : Promise.resolve([])
      ]);
      setProducts(prodRes);
      setTransactions(txRes);
      setAuditLogs(auditRes);
      if (user.rol === 'admin') setUsers(userRes);
    } catch (e) {
      console.error("Error loading data", e);
    } finally {
      setLoading(false);
    }
  };

  const computedStats: DashboardStats = useMemo(() => {
    return {
      totalProducts: products.length,
      lowStockCount: products.filter(p => (p.inventario?.stock_actual || 0) <= (p.inventario?.umbral_stock_bajo || 0)).length,
      criticalEventsToday: 0,
      totalMovementsToday: transactions.filter(t => new Date(t.ocurrido_en || "").toDateString() === new Date().toDateString()).length,
      auditBlocksVerified: auditLogs.length,
    };
  }, [products, transactions, auditLogs]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setAuthToken(null);
    setUser(null);
    setCurrentView('dashboard');
  };

  const signTransactionBlock = async (tx: {
    producto_sku?: string;
    producto_nombre?: string;
    tipo_transaccion: string;
    cantidad?: number;
    stock_antes?: number;
    stock_despues?: number;
    nota_referencia: string;
    usuario_afectado?: string;
    correo_afectado?: string;
  }) => {
    if (!window.ethereum) {
      alert('MetaMask no está instalado o activo. Por favor, instale MetaMask para confirmar operaciones críticas de auditoría.');
      throw new Error('MetaMask no detectado');
    }

    const contractAddress = localStorage.getItem('blockchain_address') || '';
    const contractAbiRaw = localStorage.getItem('blockchain_abi') || '';

    if (!contractAddress || !contractAbiRaw) {
      alert('El Smart Contract del módulo de auditoría no ha sido configurado en el sistema.\n\nPor favor, vaya al módulo de Configuración para definir la dirección del contrato Sepolia y su ABI correspondiente.');
      throw new Error('Smart Contract no configurado');
    }

    const lastBlock = auditLogs[0];
    const rawHashAnterior = lastBlock?.hash_actual || '0000000000000000000000000000000000000000000000000000000000000000';
    let hashAnterior = rawHashAnterior;
    if (hashAnterior.toLowerCase().startsWith('0x')) {
      hashAnterior = hashAnterior.slice(2);
    }
    hashAnterior = hashAnterior.toLowerCase().substring(0, 64).padStart(64, '0');

    const detailsPayload = {
      sku: tx.producto_sku || '',
      producto: tx.producto_nombre || '',
      tipo: tx.tipo_transaccion,
      cantidad: tx.cantidad || 0,
      stock_antes: tx.stock_antes || 0,
      stock_despues: tx.stock_despues || 0,
      usuario: user?.nombre_usuario || 'Operador',
      usuario_afectado: tx.usuario_afectado || '',
      correo_afectado: tx.correo_afectado || '',
      ts: new Date().toISOString()
    };
    const detailsString = JSON.stringify(detailsPayload);

    let parsedAbi = null;
    try {
      const parsed = JSON.parse(contractAbiRaw);
      if (Array.isArray(parsed)) {
        parsedAbi = parsed;
      } else if (parsed && Array.isArray(parsed.abi)) {
        parsedAbi = parsed.abi;
      } else if (parsed && parsed.compilerOutput && Array.isArray(parsed.compilerOutput.abi)) {
        parsedAbi = parsed.compilerOutput.abi;
      } else {
        throw new Error();
      }
    } catch {
      alert('El ABI guardado no es un JSON válido o no contiene una estructura de contrato correcta. Restablézcalo en el menú de Configuración.');
      throw new Error('ABI de contrato inválido');
    }

    let firma = '';
    let txHash = '';
    let hashActual = '';
    let redBlockchain = 'Ethereum Sepolia';

    try {
      const { BrowserProvider, Contract, keccak256, toUtf8Bytes } = await import('ethers');
      const provider = new BrowserProvider(window.ethereum);
      
      // Request connection
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();

      // Ensure we are connected to Sepolia network (0xaa36a7)
      const chainId = await window.ethereum.request({ method: 'eth_chainId' }) as string;
      if (chainId !== '0xaa36a7' && chainId !== '11155111') {
        alert("Atención: MetaMask está conectado a otra red. Debe cambiar a la red Ethereum Sepolia Testnet.");
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }],
          });
        } catch (switchErr: any) {
          if (switchErr.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: '0xaa36a7',
                  chainName: 'Sepolia Test Network',
                  rpcUrls: ['https://rpc.sepolia.org'],
                  nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
                  blockExplorerUrls: ['https://sepolia.etherscan.io'],
                },
              ],
            });
          } else {
            throw switchErr;
          }
        }
      }

      firma = await signer.signMessage(detailsString);
      
      const rawHashActual = keccak256(toUtf8Bytes(hashAnterior + detailsString));
      hashActual = rawHashActual.toLowerCase().startsWith('0x') ? rawHashActual.slice(2) : rawHashActual;
      hashActual = hashActual.toLowerCase().substring(0, 64).padStart(64, '0');

      alert("MetaMask Activado: Se solicitará su firma/confirmación para acuñar el bloque de auditoría inmutable en la red Sepolia. Por favor apruebe la transacción en la ventana de MetaMask...");

      const contract = new Contract(contractAddress, parsedAbi, signer);
      const txResponse = await contract.registrarBloqueDeAuditoria(
        `0x${hashActual}`,
        `0x${hashAnterior}`,
        detailsString,
        firma
      );

      alert("Transacción de auditoría enviada a la Blockchain. Esperando confirmación de minado...");
      const receipt = await txResponse.wait();
      txHash = txResponse.hash;
      alert(`¡Bloque de auditoría acuñado exitosamente en la Blockchain de Sepolia!\nTx Hash: ${txHash}`);
    } catch (err: any) {
      console.error("MetaMask/Blockchain Error:", err);
      const errMsg = err.message || String(err);
      if (
        errMsg.includes("External transactions to internal accounts") ||
        errMsg.includes("cannot include data") ||
        err.code === -32602 ||
        (errMsg.includes('32602') && errMsg.includes('eth_sendTransaction'))
      ) {
        alert(`❌ ERROR DE CONFIGURACIÓN DE CONTRATO (Código: -32602):
"External transactions to internal accounts cannot include data"

¿POR QUÉ OCURRE ESTE ERROR?:
Ha ingresado su propia dirección de billetera personal de MetaMask en el campo "Dirección del Contrato" dentro de la sección de Configuración.
Las cuentas comunes personales (EOA) no pueden ejecutar transacciones que tengan parámetros de datos ("data" / métodos de contrato inteligente).

¿CÓMO ARREGLARLO EN 3 PASOS?:
1. Vaya a Remix IDE donde compiló e implementó el contrato "GestorAuditoriaInventario" en la pestaña "Deploy & Run Transactions" usando Injected Provider (MetaMask) en la red Sepolia.
2. Busque la sección del Contrato Desplegado en la columna izquierda y copie el "Contract Address" (no su dirección personal de billetera con la que paga gas).
3. Vaya a la pestaña "Configuración" -> "Blockchain" de este sistema ERP, reemplace el campo "Dirección del Contrato Desplegado" con la dirección copiada, guarde la configuración e intente de nuevo la acción.`);
      } else {
        alert(`Error al registrar en blockchain: ${err.message || err.reason || 'Transacción rechazada o fallida.'}`);
      }
      throw err;
    }

    return {
      firma,
      txHash,
      hashAnterior,
      hashActual,
      detailsString,
      redBlockchain
    };
  };

  const handleTransaction = async (tx: Omit<Transaction, 'id' | 'ocurrido_en'>) => {
    try {
      const signedRes = await signTransactionBlock({
        producto_sku: tx.producto_sku,
        producto_nombre: tx.producto_nombre,
        tipo_transaccion: tx.tipo_transaccion,
        cantidad: tx.cantidad,
        stock_antes: tx.stock_antes,
        stock_despues: tx.stock_despues,
        nota_referencia: tx.nota_referencia || 'Transacción de inventario'
      });

      await fetchApi('/transacciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...tx,
          firma_usuario: signedRes.firma,
          hash_transaccion: signedRes.txHash,
          hash_anterior: signedRes.hashAnterior,
          hash_actual: signedRes.hashActual,
          datos: signedRes.detailsString,
          red_blockchain: signedRes.redBlockchain
        })
      });
      await loadInitialData();
    } catch (e: any) {
      console.error("Error creating transaction", e);
    }
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard currentUser={user} products={products} transactions={transactions} auditLogs={auditLogs} stats={computedStats} setCurrentView={setCurrentView} />;
      case 'inventory': return (
        <Inventory 
          currentUser={user} 
          products={products} 
          setProducts={setProducts} 
          addTransaction={handleTransaction} 
          signTransactionBlock={signTransactionBlock} 
          loadInitialData={loadInitialData}
        />
      );
      case 'transactions': return <Transactions transactions={transactions} />;
      case 'audit': return <Audit auditLogs={auditLogs} />;
      case 'users': return <Users currentUser={user} users={users} setUsers={setUsers} signTransactionBlock={signTransactionBlock} />;
      case 'events': return <Events />;
      case 'reports': return <Reports currentUser={user} products={products} transactions={transactions} auditLogs={auditLogs} />;
      case 'settings': return <Settings currentUser={user} onConfigChanged={loadInitialData} />;
      default: 
        return (
          <div className="flex items-center justify-center h-64 border-2 border-dashed border-slate-200 rounded-xl bg-white">
            <p className="text-slate-500 font-medium">Módulo en construcción: {currentView}</p>
          </div>
        );
    }
  };

  return (
    <Layout 
      user={user} 
      currentView={currentView} 
      setCurrentView={setCurrentView}
      onLogout={handleLogout}
    >
      {renderView()}
    </Layout>
  );
}
