import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { 
  Settings as SettingsIcon, 
  Shield, 
  Activity, 
  Database, 
  Save, 
  Key, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Wallet, 
  Lock
} from 'lucide-react';
import { fetchApi } from '../api';

interface SettingsProps {
  currentUser: User;
  onConfigChanged?: () => void;
}

export default function Settings({ currentUser, onConfigChanged }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<'blockchain' | 'sistema' | 'seguridad'>('blockchain');
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // System general config states
  const [companyName, setCompanyName] = useState('ChainStock ERP');
  const [lowStockThreshold, setLowStockThreshold] = useState(5);

  // Blockchain contract states
  const [contractAddress, setContractAddress] = useState('');
  const [contractAbi, setContractAbi] = useState('');
  const [isBlockchainActive, setIsBlockchainActive] = useState(false);

  // MetaMask real-time states
  const [metaMaskInstalled, setMetaMaskInstalled] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [activeNetwork, setActiveNetwork] = useState<string | null>(null);

  // Password alteration states
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState(false);

  // Load configuration from either Supabase backend or memory
  useEffect(() => {
    loadConfiguration();
    checkMetaMaskState();

    if (window.ethereum) {
      const handleAccounts = (accounts: string[]) => {
        setWalletAddress(accounts[0] || null);
      };
      const handleChain = (chainId: string) => {
        resolveNetworkName(chainId);
      };

      window.ethereum.on('accountsChanged', handleAccounts);
      window.ethereum.on('chainChanged', handleChain);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccounts);
        window.ethereum.removeListener('chainChanged', handleChain);
      };
    }
  }, []);

  const loadConfiguration = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const config = await fetchApi('/configuracion');
      if (config) {
        setCompanyName(config.nombre_empresa || 'ChainStock ERP');
        setLowStockThreshold(config.umbral_stock_bajo_defecto ?? 5);
        setContractAddress(config.blockchain_contrato_direccion || '');
        setContractAbi(config.blockchain_abi || '');
        setIsBlockchainActive(!!config.blockchain_activo);

        // Keep local storage items in sync for modules that read them directly
        localStorage.setItem('blockchain_address', config.blockchain_contrato_direccion || '');
        localStorage.setItem('blockchain_abi', config.blockchain_abi || '');
        localStorage.setItem('blockchain_active', config.blockchain_activo ? 'true' : 'false');
        localStorage.setItem('company_name', config.nombre_empresa || 'ChainStock ERP');
      }
    } catch (err: any) {
      console.warn("Error fetching config from backend. Standard values fallbacks.", err);
      // Fallback local persistence
      setCompanyName(localStorage.getItem('company_name') || 'ChainStock ERP');
      setLowStockThreshold(Number(localStorage.getItem('low_stock_threshold') || '5'));
      setContractAddress(localStorage.getItem('blockchain_address') || '');
      setContractAbi(localStorage.getItem('blockchain_abi') || '');
      setIsBlockchainActive(localStorage.getItem('blockchain_active') === 'true');
    } finally {
      setLoading(false);
    }
  };

  const checkMetaMaskState = async () => {
    if (window.ethereum) {
      setMetaMaskInstalled(true);
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[];
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
        const chainId = await window.ethereum.request({ method: 'eth_chainId' }) as string;
        resolveNetworkName(chainId);
      } catch (e) {
        console.error("Error reading MetaMask", e);
      }
    } else {
      setMetaMaskInstalled(false);
    }
  };

  const resolveNetworkName = (chainId: string) => {
    if (chainId === '0xaa36a7' || chainId === '11155111') {
      setActiveNetwork('Ethereum Sepolia Testnet');
    } else if (chainId === '0x1') {
      setActiveNetwork('Ethereum Mainnet');
    } else {
      setActiveNetwork(`Red ID: ${chainId}`);
    }
  };

  const handleConnectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          await handleSwitchNetwork();
        }
      } catch (err: any) {
        alert(`Error al conectar wallet: ${err.message || err}`);
      }
    } else {
      alert("No se detectó MetaMask. Instale la extensión en su navegador.");
    }
  };

  const handleSwitchNetwork = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }],
        });
        setActiveNetwork('Ethereum Sepolia Testnet');
      } catch (err: any) {
        if (err.code === 4902) {
          try {
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
            setActiveNetwork('Ethereum Sepolia Testnet');
          } catch (addErr) {
            console.error("Error adding Sepolia chain:", addErr);
          }
        }
      }
    }
  };

  // ABI Validation logic
  const parseAndValidateAbi = (abiStr: string): boolean => {
    if (!abiStr.trim()) return false;
    try {
      const parsed = JSON.parse(abiStr);
      let abiArray: any[] = [];
      if (Array.isArray(parsed)) {
        abiArray = parsed;
      } else if (parsed && Array.isArray(parsed.abi)) {
        abiArray = parsed.abi;
      } else if (parsed && parsed.compilerOutput && Array.isArray(parsed.compilerOutput.abi)) {
        abiArray = parsed.compilerOutput.abi;
      }

      if (abiArray.length === 0) return false;

      // Look for registrarBloqueDeAuditoria function
      const auditFunc = abiArray.find(
        (item: any) => 
          item.type === 'function' && 
          item.name === 'registrarBloqueDeAuditoria'
      );

      return !!auditFunc;
    } catch {
      return false;
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);

    if (isBlockchainActive) {
      if (!contractAddress.trim()) {
        setErrorMessage("Debe introducir la dirección del contrato cuando la Blockchain está activa.");
        return;
      }
      if (walletAddress && contractAddress.trim().toLowerCase() === walletAddress.toLowerCase()) {
        setErrorMessage("⚠️ ¡ALERTA DE SEGURIDAD!: Ha ingresado su dirección de billetera personal de MetaMask (EOA) en el campo 'Dirección del Contrato'. Esto causará el error 'External transactions to internal accounts cannot include data' porque MetaMask no puede enviar parámetros (data) de métodos a cuentas personales comunes. Asegúrese de compilar y desplegar su contrato 'GestorAuditoriaInventario' en Remix, y luego copie el 'Contract Address' desplegado, NO la dirección de su billetera personal.");
        return;
      }
      if (!contractAbi.trim()) {
        setErrorMessage("Debe pegar el ABI del contrato cuando la Blockchain está activa.");
        return;
      }
      if (!parseAndValidateAbi(contractAbi)) {
        setErrorMessage("El ABI pegado no es un JSON válido o no contiene la función obligatoria 'registrarBloqueDeAuditoria'.");
        return;
      }
    }

    setLoading(true);
    try {
      let cleanedAbi = contractAbi.trim();
      // Auto extraction wrapper JSON
      try {
        if (cleanedAbi.startsWith('{')) {
          const parsed = JSON.parse(cleanedAbi);
          if (parsed.abi) {
            cleanedAbi = JSON.stringify(parsed.abi, null, 2);
          } else if (parsed.compilerOutput?.abi) {
            cleanedAbi = JSON.stringify(parsed.compilerOutput.abi, null, 2);
          }
        }
      } catch { /* parse abort */ }

      // Persist to Postgres database
      await fetchApi('/configuracion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_empresa: companyName,
          umbral_stock_bajo_defecto: Number(lowStockThreshold),
          blockchain_contrato_direccion: contractAddress.trim(),
          blockchain_abi: cleanedAbi,
          blockchain_activo: isBlockchainActive
        })
      });

      // Maintain legacy LocalStorage keys for instant reactivity in other pages
      localStorage.setItem('blockchain_address', contractAddress.trim());
      localStorage.setItem('blockchain_abi', cleanedAbi);
      localStorage.setItem('blockchain_active', isBlockchainActive ? 'true' : 'false');
      localStorage.setItem('company_name', companyName);
      localStorage.setItem('low_stock_threshold', String(lowStockThreshold));

      setSaveSuccess(true);
      if (onConfigChanged) onConfigChanged();
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error guardando parámetros de configuración.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setPwdSuccess(false);

    if (pwdNew !== pwdConfirm) {
      setErrorMessage("La nueva contraseña y su confirmación no coinciden.");
      return;
    }

    setLoading(true);
    try {
      await fetchApi('/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clave_actual: pwdCurrent,
          clave_nueva: pwdNew
        })
      });

      setPwdSuccess(true);
      setPwdCurrent('');
      setPwdNew('');
      setPwdConfirm('');
      setTimeout(() => setPwdSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al cambiar la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultAbi = () => {
    const defaultAbiJson = `[
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "bloqueId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "hashActual",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "usuarioFirma",
        "type": "string"
      }
    ],
    "name": "NuevoBloqueRegistrado",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "cadenaBloques",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "numeroDeBloque",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "hashBloqueActual",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "hashBloqueAnterior",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "jsonDetalleMovimiento",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "firmaUsuarioCriptografica",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "administradorDeContrato",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_hashActual",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_hashAnterior",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_jsonDetalles",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_firmaUsuario",
        "type": "string"
      }
    ],
    "name": "registrarBloqueDeAuditoria",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalBloquesEnCadena",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]`;
    setContractAbi(defaultAbiJson);
  };

  return (
    <div className="space-y-6">
      {/* Navigation Submenu */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setActiveTab('blockchain'); setErrorMessage(null); }}
          className={`px-5 py-3 text-xs uppercase tracking-wider font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'blockchain' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4" /> Blockchain Sepolia
        </button>
        <button
          onClick={() => { setActiveTab('sistema'); setErrorMessage(null); }}
          className={`px-5 py-3 text-xs uppercase tracking-wider font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'sistema' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <SettingsIcon className="w-4 h-4" /> Sistema & Parámetros
        </button>
        <button
          onClick={() => { setActiveTab('seguridad'); setErrorMessage(null); }}
          className={`px-5 py-3 text-xs uppercase tracking-wider font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'seguridad' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Key className="w-4 h-4" /> Seguridad de Acceso
        </button>
      </div>

      {errorMessage && (
        <div id="settings-error" className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5 text-red-700 text-xs">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2.5 text-green-700 text-xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span>Parámetros de configuración actualizados y sincronizados de manera duradera.</span>
        </div>
      )}

      {/* BLOCKCHAIN TAB */}
      {activeTab === 'blockchain' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          {/* Form */}
          <form onSubmit={handleSaveConfig} className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 space-y-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-3">
              <Shield className="w-4 h-4 text-blue-600" /> Integración del Smart Contract
            </h3>

            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-4 rounded-lg">
              <div>
                <h4 className="text-xs font-bold text-slate-700">Auditabilidad Blockchain Activa</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Activa para exigir la firma criptográfica de MetaMask y acuñar bloques en Sepolia antes de modificar la DB.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={isBlockchainActive}
                  onChange={(e) => setIsBlockchainActive(e.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                Dirección del Contrato Desplegado (Sepolia Contract Address)
              </label>
              <input
                required={isBlockchainActive}
                type="text"
                placeholder="ej. 0xabcdef987654321..."
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-slate-600 uppercase">
                  ABI del Contrato Inteligente (JSON)
                </label>
                <button
                  type="button"
                  onClick={loadDefaultAbi}
                  className="text-[11px] text-blue-600 font-semibold hover:underline"
                >
                  Cargar ABI por Defecto
                </button>
              </div>
              <textarea
                required={isBlockchainActive}
                rows={8}
                placeholder="Pegue aquí el ABI (JSON) exportado de Remix IDE o Hardhat..."
                value={contractAbi}
                onChange={(e) => setContractAbi(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-slate-900 border-0 text-white rounded-lg text-xs font-bold hover:bg-black transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Guardar Configuración Blockchain
            </button>
          </form>

          {/* Connected state status details */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest pb-3 border-b border-slate-100 flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-600 animate-pulse" /> Estado de MetaMask
              </h3>
              
              <div className="space-y-4 mt-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">MetaMask Instalado:</span>
                  {metaMaskInstalled ? (
                    <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> SI
                    </span>
                  ) : (
                    <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> NO DETECTADO
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 text-xs py-2 border-t border-b border-dashed border-slate-100">
                  <span className="text-slate-400 font-medium">Dirección Conectada:</span>
                  {walletAddress ? (
                    <span className="font-mono text-[10px] text-slate-800 bg-slate-50 p-2 rounded border border-slate-150 break-all select-all">
                      {walletAddress}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[11px] italic">No hay cuentas asignadas o autenticadas</span>
                  )}
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Red Activa:</span>
                  {activeNetwork ? (
                    <span className="text-blue-600 font-bold bg-blue-50 px-2.5 py-1 rounded border border-blue-200 truncate max-w-[150px]">
                      {activeNetwork}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Desconectada</span>
                  )}
                </div>

                {(!walletAddress || activeNetwork !== 'Ethereum Sepolia Testnet') && metaMaskInstalled && (
                  <button
                    type="button"
                    onClick={handleConnectWallet}
                    className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer border-0"
                  >
                    <Wallet className="w-4 h-4" /> Conectar & Forzar Sepolia
                  </button>
                )}
              </div>
            </div>

            <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-5 space-y-2">
              <h4 className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> REGLA INMUTABLE RENDER
              </h4>
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                Al activar la blockchain real, no existirá fallback simulado. Cualquier escritura en la base de datos de productos o usuarios que falle el minado blockchain se abortará completamente para preservar la consistencia absoluta.
              </p>
            </div>


          </div>
        </div>
      )}

      {/* SYSTEM CONFIG TAB */}
      {activeTab === 'sistema' && (
        <form onSubmit={handleSaveConfig} className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl space-y-6 shadow-xs animate-fadeIn">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest pb-3 border-b border-slate-100 flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-blue-600" /> Parámetros del Entorno ERP
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                Nombre de la Empresa / Sistema
              </label>
              <input
                required
                type="text"
                placeholder="ej. ChainStock ERP Solutions"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                Alerta de Stock Bajo por Defecto
              </label>
              <input
                required
                type="number"
                min="1"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Umbral predeterminado sugerido al crear nuevos productos en el catálogo.
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-slate-900 border-0 text-white rounded-lg text-xs font-bold hover:bg-black transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Guardar Parámetros ERP
          </button>
        </form>
      )}

      {/* SECURITY TAB (CHANGE PASSWORD) */}
      {activeTab === 'seguridad' && (
        <form onSubmit={handleChangePassword} className="bg-white rounded-xl border border-slate-200 p-6 max-w-lg space-y-5 shadow-xs animate-fadeIn">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest pb-3 border-b border-slate-100 flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-600" /> Cambiar mi Contraseña
          </h3>

          {pwdSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>¡Su contraseña ha sido cambiada de manera exitosa! Use la nueva contraseña la próxima vez.</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
              Contraseña Actual
            </label>
            <input
              required
              type="password"
              placeholder="••••••••••••"
              value={pwdCurrent}
              onChange={(e) => setPwdCurrent(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 animate-fadeIn"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-dashed border-slate-100 pt-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                Nueva Contraseña
              </label>
              <input
                required
                type="password"
                placeholder="Min. 6 caracteres"
                value={pwdNew}
                onChange={(e) => setPwdNew(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                Confirmar Nueva Contraseña
              </label>
              <input
                required
                type="password"
                placeholder="Suma confirmación"
                value={pwdConfirm}
                onChange={(e) => setPwdConfirm(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 border-0 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
            Actualizar Mi Contraseña
          </button>
        </form>
      )}
    </div>
  );
}
