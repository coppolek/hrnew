import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, Users, Database, Play, Plus, Trash2, UploadCloud, CheckCircle2, AlertCircle, FileArchive, Loader2 } from 'lucide-react';
import { activeFirebaseConfig } from '../firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, doc } from 'firebase/firestore';
import { fetchFromFirestore, syncToFirestore, defaultOracleConfig } from '../services/db';

export default function Settings() {
  const navigate = useNavigate();
  const [adminEmail, setAdminEmail] = useState('coppolek@gmail.com');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [dbType, setDbType] = useState(() => {
    const saved = localStorage.getItem('appDbType');
    const defaultType = import.meta.env.VITE_DEFAULT_DB_TYPE || 'oracle';
    return saved ? saved : defaultType;
  });

  const [oracleConfig, setOracleConfig] = useState(() => {
    const raw = localStorage.getItem('customOracleConfig');
    return raw ? { ...defaultOracleConfig, ...JSON.parse(raw) } : defaultOracleConfig;
  });

  const [walletStatus, setWalletStatus] = useState<{ installed: boolean, files: string[], services: string[] }>({
    installed: false,
    files: [],
    services: []
  });
  const [isUploadingWallet, setIsUploadingWallet] = useState(false);
  const [walletUploadMessage, setWalletUploadMessage] = useState<string | null>(null);
  const [oracleTestResult, setOracleTestResult] = useState<{ success: boolean, message: string } | null>(null);

  const [backendOracleStatus, setBackendOracleStatus] = useState<any>(null);

  const refreshBackendStatus = () => {
    fetch('/api/oracle/status')
      .then(res => res.json())
      .then(data => {
        if (data.wallet) setWalletStatus(data.wallet);
        setBackendOracleStatus(data);
      })
      .catch(err => console.error("Could not fetch oracle status:", err));
  };

  useEffect(() => {
    refreshBackendStatus();
  }, []);

  const [operators, setOperators] = useState<{id: string, username: string, password: string}[]>([]);
  
  useEffect(() => {
    fetchFromFirestore('appOperators').then(dbOps => {
      if(dbOps) {
        setOperators(dbOps);
      }
    });
  }, []);

  const saveOperators = (newOps: any) => {
    setOperators(newOps);
    syncToFirestore('appOperators', newOps);
  };

  const [newOpUsername, setNewOpUsername] = useState('');
  const [newOpPassword, setNewOpPassword] = useState('');
  
  const [customGeminiKey, setCustomGeminiKey] = useState(() => localStorage.getItem('customGeminiApiKey') || '');
  const [openRouterModel, setOpenRouterModel] = useState(() => {
    let saved = localStorage.getItem('openRouterModel') || 'internal_gemini';
    if (saved === 'google/gemini-2.0-flash-lite-preview-02-05:free' || saved === 'meta-llama/llama-3.3-70b-instruct:free') {
        // Switch old defaults to the internal one
        saved = 'internal_gemini';
    }
    return saved;
  });
  const [isTestingModel, setIsTestingModel] = useState(false);
  const [modelTestResult, setModelTestResult] = useState<{success: boolean, message: string} | null>(null);

  const testOpenRouterConnection = async () => {
    setIsTestingModel(true);
    setModelTestResult(null);
    try {
      if (openRouterModel === 'internal_gemini') {
          const res = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'gemini-2.5-flash', messages: [{role: 'user', content: 'hello'}] })
          });
          if (!res.ok) {
              const str = await res.text();
              throw new Error(str);
          }
          setModelTestResult({ success: true, message: "Connessione riuscita! Il modello integrato funziona." });
          return;
      }
      
      if (!customGeminiKey || !customGeminiKey.startsWith('sk-or-v1')) {
        throw new Error("API Key non valida. Deve iniziare con sk-or-v1");
      }
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${customGeminiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": window.location.origin,
          "X-Title": "SCM Gestione Presenze"
        },
        body: JSON.stringify({
          model: openRouterModel,
          messages: [{ role: "user", content: "Test ping. Answer 'pong'." }],
          max_tokens: 10
        })
      });
      if (!response.ok) {
        const errStr = await response.text();
        let errObj;
        try { errObj = JSON.parse(errStr); } catch (e) {}
        const msg = errObj?.error?.message || errObj?.message || errStr || "Errore nella richiesta a OpenRouter";
        throw new Error(msg);
      }
      setModelTestResult({ success: true, message: "Connessione riuscita! Il modello funziona." });
    } catch (e: any) {
      setModelTestResult({ success: false, message: e.message || "Errore di connessione" });
    } finally {
      setIsTestingModel(false);
    }
  };

  const [dbConfig, setDbConfig] = useState(activeFirebaseConfig);
  const [postgresConfig, setPostgresConfig] = useState(() => {
    const raw = localStorage.getItem('customPostgresConfig');
    return raw ? JSON.parse(raw) : { host: 'db.felcpheinjucicalwxbv.supabase.co', port: '5432', user: 'postgres', password: '', database: 'postgres' };
  });
  
  const handleConfigChange = (key: string, value: string) => {
    if (dbType === 'oracle') {
      setOracleConfig((prev: any) => ({ ...prev, [key]: value }));
    } else if (dbType === 'firebase') {
      setDbConfig(prev => ({ ...prev, [key]: value }));
    } else {
      setPostgresConfig((prev: any) => ({ ...prev, [key]: value }));
    }
  };

  const handleWalletUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      alert("Seleziona un file archivio .zip (es. Wallet_CLVYCAZ7VGDAAK32.zip)");
      return;
    }

    setIsUploadingWallet(true);
    setWalletUploadMessage(null);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        const res = await fetch('/api/oracle/upload-wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            zipBase64: base64,
            walletPassword: oracleConfig.walletPassword || oracleConfig.password
          })
        });
        const data = await res.json();
        if (data.success) {
          setWalletStatus(data.status);
          setWalletUploadMessage(data.message);
          if (data.status?.services?.length > 0 && !data.status.services.includes(oracleConfig.serviceName)) {
            const preferred = data.status.services.find((s: string) => s.endsWith('_low')) || data.status.services[0];
            setOracleConfig((prev: any) => ({ ...prev, serviceName: preferred }));
          }
          alert(data.message);
        } else {
          setWalletUploadMessage("Errore: " + data.error);
          alert("Errore durante il caricamento del wallet: " + data.error);
        }
        setIsUploadingWallet(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsUploadingWallet(false);
      alert("Errore lettura file: " + err.message);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    if (dbType === 'oracle') {
      try {
        const res = await fetch('/api/oracle/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(oracleConfig)
        });
        const data = await res.json();
        if (data.success) {
          setOracleTestResult({ success: true, message: data.message });
          alert('Connessione al database Oracle Autonomous Database (ATP) riuscita con successo!\nLa tabella APP_DATA è stata verificata.');
          await fetch('/api/db/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dbType: 'oracle', oracle: oracleConfig })
          });
        } else {
          setOracleTestResult({ success: false, message: data.error });
          alert('Errore di connessione a Oracle:\n' + data.error);
        }
      } catch (err: any) {
        setOracleTestResult({ success: false, message: err.message });
        alert('Errore di connessione al server: ' + err.message);
      }
    } else if (dbType === 'firebase') {
      try {
        const tempApp = initializeApp(dbConfig, 'test-connection-app-' + Date.now());
        const tempDb = getFirestore(tempApp, dbConfig.firestoreDatabaseId || undefined);
        
        // Write, Read and Delete to ensure full connection and permissions
        const testDocRef = doc(tempDb, 'test', 'connection');
        
        const testOperation = async () => {
          const { setDoc, getDoc, deleteDoc } = await import('firebase/firestore');
          await setDoc(testDocRef, { timestamp: Date.now(), status: "ok" });
          const docSnap = await getDoc(testDocRef);
          if (!docSnap.exists()) throw new Error("Scrittura apparentemente riuscita, ma il documento non risulta.");
          await deleteDoc(testDocRef);
        };

        await Promise.race([
          testOperation(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout dopo 5 secondi')), 5000))
        ]);
        
        alert('Connessione a Firebase riuscita, lettura e scrittura completate senza limitazioni! Il database è ora impostato a livello globale per tutti i dispositivi.');
        
        try {
           const { setDoc } = await import('firebase/firestore');
           await setDoc(doc(tempDb, 'appData', 'globalDbConfig'), {
              value: JSON.stringify({
                 dbType: 'firebase'
              }),
              updatedAt: new Date().toISOString()
           });
        } catch(e) {
           console.error("Failed to sync global config", e);
        }

        await deleteApp(tempApp);
      } catch (err: any) {
        alert('Errore di connessione o permessi limitati in Firebase:\n' + err.message);
      }
    } else {
      try {
        const res = await fetch('/api/test-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postgresConfig)
        });
        const data = await res.json();
        if (data.success) {
          alert('Connessione a Postgres (Supabase) riuscita! Il database è ora impostato a livello globale per tutti i dispositivi.');
          try {
             const { setDoc } = await import('firebase/firestore');
             await setDoc(doc(getFirestore(initializeApp(activeFirebaseConfig, 'global-sync-' + Date.now())), 'appData', 'globalDbConfig'), {
                value: JSON.stringify({
                   dbType: 'postgres',
                   postgresConfig: postgresConfig
                }),
                updatedAt: new Date().toISOString()
             });
          } catch(e) {
             console.error("Failed to sync global config", e);
          }
        } else {
          alert('Errore di connessione a Postgres:\n' + data.error);
        }
      } catch (err: any) {
        alert('Errore di rete durante il test Postgres: impossibile contattare il server locale.');
      }
    }
    setIsTesting(false);
  };

  useEffect(() => {
    localStorage.setItem('appOperators', JSON.stringify(operators));
  }, [operators]);

  useEffect(() => {
    localStorage.setItem('appDbType', dbType);
    fetch('/api/db/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dbType })
    }).catch(() => {});
  }, [dbType]);

  useEffect(() => {
    localStorage.setItem('customOracleConfig', JSON.stringify(oracleConfig));
  }, [oracleConfig]);

  useEffect(() => {
    localStorage.setItem('customGeminiApiKey', customGeminiKey);
  }, [customGeminiKey]);

  useEffect(() => {
    localStorage.setItem('openRouterModel', openRouterModel);
  }, [openRouterModel]);

  useEffect(() => {
    localStorage.setItem('customFirebaseConfig', JSON.stringify(dbConfig));
  }, [dbConfig]);

  useEffect(() => {
    localStorage.setItem('customPostgresConfig', JSON.stringify(postgresConfig));
  }, [postgresConfig]);

  const handleAddOperator = () => {
    if (newOpUsername.trim() && newOpPassword.trim()) {
      const newOps = [...operators, {
        id: Date.now().toString(),
        username: newOpUsername.trim(),
        password: newOpPassword.trim()
      }];
      saveOperators(newOps);
      setNewOpUsername('');
      setNewOpPassword('');
    }
  };

  const handleDeleteOperator = (id: string) => {
    const newOps = operators.filter(op => op.id !== id);
    saveOperators(newOps);
  };

  return (
    <div className="min-h-screen bg-bg-main p-8 font-sans text-text-main md:p-12">
      <div className="mx-auto max-w-3xl">
        <header className="mb-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="rounded-full p-2 hover:bg-sidebar-bg">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-serif text-3xl font-bold tracking-tight">IMPOSTAZIONI</h1>
              <p className="text-text-muted">Gestione account e sicurezza</p>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          <div className="rounded-3xl border border-border-soft bg-card-bg p-6 md:p-8">
            <div className="mb-6 flex items-center gap-3 border-b border-border-soft pb-4">
              <ShieldAlert className="h-6 w-6 text-accent-olive" />
              <h2 className="font-serif text-xl font-bold">Autenticazione Admin</h2>
            </div>
            
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium uppercase text-text-muted">Amministratore Unico Autorizzato</label>
                <div className="w-full rounded-xl border border-border-soft bg-bg-main px-4 py-3 font-medium text-text-main opacity-80">
                  <span className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    admin / admin
                  </span>
                </div>
                <p className="mt-2 text-xs text-text-muted">Per ragioni di sicurezza, questa è l'unica combinazione di utente e password abilitata ad accedere come amministratore all'applicazione. Non può essere modificata.</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border-soft bg-card-bg p-6 md:p-8">
            <div className="mb-6 flex items-center gap-3 border-b border-border-soft pb-4">
              <Users className="h-6 w-6 text-accent-olive" />
              <h2 className="font-serif text-xl font-bold">Gestione Utenti (Operatori)</h2>
            </div>
            
            <div className="flex flex-col gap-4">
              {operators.length === 0 ? (
                <p className="text-sm text-text-muted italic">Nessun operatore configurato. Aggiungi il primo operatore qui sotto.</p>
              ) : (
                <div className="border border-border-soft rounded-2xl bg-bg-main overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border-soft bg-sidebar-bg text-text-muted">
                        <th className="px-4 py-3 font-medium uppercase text-xs">Nome Utente</th>
                        <th className="px-4 py-3 font-medium uppercase text-xs">Password</th>
                        <th className="px-4 py-3 w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-soft">
                      {operators.map(op => (
                        <tr key={op.id}>
                          <td className="px-4 py-3 font-medium">{op.username}</td>
                          <td className="px-4 py-3 font-mono text-text-muted">{op.password}</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => handleDeleteOperator(op.id)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="text" 
                  placeholder="Nome utente"
                  value={newOpUsername}
                  onChange={(e) => setNewOpUsername(e.target.value)}
                  className="flex-1 rounded-xl border border-border-soft bg-white px-4 py-2 text-sm outline-none focus:border-accent-olive focus:ring-1 focus:ring-accent-olive"
                />
                <input 
                  type="text" 
                  placeholder="Password"
                  value={newOpPassword}
                  onChange={(e) => setNewOpPassword(e.target.value)}
                  className="flex-1 rounded-xl border border-border-soft bg-white px-4 py-2 text-sm outline-none focus:border-accent-olive focus:ring-1 focus:ring-accent-olive"
                />
                <button 
                  onClick={handleAddOperator}
                  disabled={!newOpUsername.trim() || !newOpPassword.trim()}
                  className="flex items-center gap-1 rounded-xl bg-accent-olive px-4 py-2 font-medium text-white transition-colors hover:bg-accent-olive/90 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" /> Aggiungi
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border-soft bg-card-bg p-6 md:p-8">
            <div className="mb-6 flex items-center gap-3 border-b border-border-soft pb-4">
              <ShieldAlert className="h-6 w-6 text-purple-600" />
              <h2 className="font-serif text-xl font-bold text-purple-900">Intelligenza Artificiale</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium uppercase text-text-muted">Chiave API OpenRouter</label>
                <input 
                  type="password" 
                  value={customGeminiKey}
                  placeholder="Inserisci la tua API Key OpenRouter (sk-or-v1-...)"
                  onChange={(e) => setCustomGeminiKey(e.target.value)}
                  disabled={openRouterModel === 'internal_gemini'}
                  className="w-full rounded-xl border border-border-soft lg:w-2/3 bg-white px-4 py-3 font-medium text-text-main outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                />
                <p className="mt-2 text-xs text-text-muted">
                  Opzionale se usi il modello integrato. Altrimenti inserisci una chiave API di OpenRouter.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium uppercase text-text-muted">Modello AI Gratuito</label>
                <select
                  value={openRouterModel}
                  onChange={(e) => setOpenRouterModel(e.target.value)}
                  className="w-full rounded-xl border border-border-soft lg:w-2/3 bg-white px-4 py-3 font-medium text-text-main outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                >
                  <option value="internal_gemini">Modello Google Gemini (Integrato nel sistema, Nessuna API Key richiesta)</option>
                  <option value="meta-llama/llama-3.3-70b-instruct:free">Llama 3.3 70B Instruct (OpenRouter)</option>
                  <option value="google/gemini-2.0-pro-exp-02-05:free">Gemini 2.0 Pro Experimental (OpenRouter)</option>
                  <option value="google/gemma-2-9b-it:free">Gemma 2 9B IT (OpenRouter)</option>
                  <option value="mistralai/mistral-nemo:free">Mistral Nemo (OpenRouter)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={testOpenRouterConnection}
                  disabled={isTestingModel || (openRouterModel !== 'internal_gemini' && !customGeminiKey)}
                  className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 font-bold text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
                >
                  {isTestingModel ? <span className="animate-spin text-xl">↻</span> : <ShieldAlert className="h-4 w-4" />}
                  Testa Connessione
                </button>
                {modelTestResult && (
                  <span className={`text-sm font-medium ${modelTestResult.success ? 'text-green-600' : 'text-red-500'}`}>
                    {modelTestResult.message}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border-soft bg-card-bg p-6 md:p-8">
            <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border-soft pb-4">
              <div className="flex items-center gap-3">
                <Database className="h-6 w-6 text-accent-olive" />
                <h2 className="font-serif text-xl font-bold">Configurazione Database</h2>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="flex items-center gap-1.5 rounded-lg border border-border-soft bg-white px-3 py-1.5 text-sm font-medium transition-colors hover:bg-sidebar-bg disabled:opacity-50"
                >
                  <Play className="h-4 w-4" />
                  {isTesting ? 'Test in corso...' : 'Test Connessione'}
                </button>
              </div>
            </div>

            <div className="mb-6 flex flex-wrap gap-4 w-full border-b border-border-soft pb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="dbtype" 
                  value="oracle" 
                  checked={dbType === 'oracle'} 
                  onChange={() => setDbType('oracle')}
                  className="accent-accent-olive"
                />
                <span className="font-semibold text-sm text-accent-olive">Oracle Cloud (Autonomous DB)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="dbtype" 
                  value="postgres" 
                  checked={dbType === 'postgres'} 
                  onChange={() => setDbType('postgres')}
                  className="accent-accent-olive"
                />
                <span className="font-medium text-sm">Postgres (Supabase)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="dbtype" 
                  value="firebase" 
                  checked={dbType === 'firebase'} 
                  onChange={() => setDbType('firebase')}
                  className="accent-accent-olive"
                />
                <span className="font-medium text-sm">Firebase Firestore</span>
              </label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-bg-main rounded-2xl border border-border-soft md:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase text-text-muted">Collegamento Database Backend Perenne</p>
                  <button 
                    onClick={refreshBackendStatus}
                    className="text-xs text-accent-olive hover:underline font-semibold"
                  >
                    Aggiorna Stato Backend
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 font-medium text-emerald-600">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    Backend Perenne Attivo ({dbType === 'oracle' ? 'Oracle Autonomous Database ATP' : dbType === 'firebase' ? 'Firebase' : 'Postgres'})
                  </div>
                  <div className="flex items-center gap-2">
                    {backendOracleStatus?.connected ? (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3" /> Oracle Cloud ATP Connesso ({backendOracleStatus?.totalRecords || 0} record replicati)
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1.5">
                        <AlertCircle className="h-3 w-3" /> Persistenza Server Attiva ({backendOracleStatus?.totalRecords || 0} record su disco)
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-text-muted mt-2">
                  Il server gestisce un pool di connessioni permanente e persistenza duratura su disco locale. Nessuna perdita di dati delle presenze o cantieri in caso di timeout o attesa del wallet.
                </p>
              </div>

              {dbType === 'oracle' ? (
                <>
                  {/* Oracle Wallet Upload Box */}
                  <div className="md:col-span-2 rounded-2xl border border-dashed border-accent-olive/40 bg-accent-olive/5 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-olive/10 text-accent-olive">
                          <FileArchive className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-text-main">File Wallet Oracle (.zip)</h4>
                          <p className="text-xs text-text-muted">
                            Oracle Autonomous Database usa l'autenticazione mTLS. Carica il file zip scaricato da Oracle Cloud (es. <code className="font-mono bg-white px-1 py-0.5 rounded border border-border-soft">Wallet_CLVYCAZ7VGDAAK32.zip</code>).
                          </p>
                        </div>
                      </div>
                      <div>
                        {walletStatus.installed ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Wallet Installato
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                            <AlertCircle className="h-3.5 w-3.5 text-amber-600" /> Wallet Mancante
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
                      <label className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-accent-olive px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-olive/90 cursor-pointer transition-colors disabled:opacity-50">
                        {isUploadingWallet ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Caricamento ed estrazione...
                          </>
                        ) : (
                          <>
                            <UploadCloud className="h-4 w-4" /> {walletStatus.installed ? 'Sostituisci Wallet (.zip)' : 'Carica Wallet_CLVYCAZ7VGDAAK32.zip'}
                          </>
                        )}
                        <input 
                          type="file" 
                          accept=".zip" 
                          onChange={handleWalletUpload}
                          disabled={isUploadingWallet}
                          className="hidden" 
                        />
                      </label>
                      <span className="text-xs text-text-muted">
                        {walletStatus.installed 
                          ? `Certificati trovati: ${walletStatus.files.filter(f => f.includes('wallet') || f.includes('.pem') || f.includes('.sso')).join(', ') || 'OK'}`
                          : 'Trascina o clicca per caricare il file .zip del wallet'}
                      </span>
                    </div>

                    {walletUploadMessage && (
                      <p className="mt-3 text-xs font-medium text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                        {walletUploadMessage}
                      </p>
                    )}
                  </div>

                  <div className="p-4 bg-bg-main rounded-2xl border border-border-soft overflow-hidden">
                    <p className="text-xs font-bold uppercase text-text-muted mb-1">Utente Database</p>
                    <input 
                      type="text"
                      value={oracleConfig.user || 'ADMIN'}
                      onChange={(e) => handleConfigChange('user', e.target.value)}
                      className="w-full bg-transparent font-mono text-sm outline-none border-b border-border-soft focus:border-accent-olive py-1"
                      placeholder="ADMIN"
                    />
                  </div>

                  <div className="p-4 bg-bg-main rounded-2xl border border-border-soft overflow-hidden">
                    <p className="text-xs font-bold uppercase text-text-muted mb-1">Password Database (ADMIN)</p>
                    <input 
                      type="password"
                      value={oracleConfig.password || ''}
                      onChange={(e) => handleConfigChange('password', e.target.value)}
                      className="w-full bg-transparent font-mono text-sm outline-none border-b border-border-soft focus:border-accent-olive py-1"
                      placeholder="Sveva310320@"
                    />
                  </div>

                  <div className="p-4 bg-bg-main rounded-2xl border border-border-soft overflow-hidden">
                    <p className="text-xs font-bold uppercase text-text-muted mb-1">Nome Servizio TNS</p>
                    <select
                      value={oracleConfig.serviceName || 'clvycaz7vgdaak32_low'}
                      onChange={(e) => handleConfigChange('serviceName', e.target.value)}
                      className="w-full bg-transparent font-mono text-sm outline-none border-b border-border-soft focus:border-accent-olive py-1"
                    >
                      {walletStatus.services.length > 0 ? (
                        walletStatus.services.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))
                      ) : (
                        <>
                          <option value="clvycaz7vgdaak32_low">clvycaz7vgdaak32_low (Consigliato)</option>
                          <option value="clvycaz7vgdaak32_medium">clvycaz7vgdaak32_medium</option>
                          <option value="clvycaz7vgdaak32_high">clvycaz7vgdaak32_high</option>
                          <option value="clvycaz7vgdaak32_tp">clvycaz7vgdaak32_tp</option>
                          <option value="clvycaz7vgdaak32_tpurgent">clvycaz7vgdaak32_tpurgent</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="p-4 bg-bg-main rounded-2xl border border-border-soft overflow-hidden">
                    <p className="text-xs font-bold uppercase text-text-muted mb-1">Password del Wallet (se diversa)</p>
                    <input 
                      type="password"
                      value={oracleConfig.walletPassword || ''}
                      onChange={(e) => handleConfigChange('walletPassword', e.target.value)}
                      className="w-full bg-transparent font-mono text-sm outline-none border-b border-border-soft focus:border-accent-olive py-1"
                      placeholder="Uguale alla password ADMIN"
                    />
                  </div>

                  <div className="p-4 bg-bg-main rounded-2xl border border-border-soft overflow-hidden md:col-span-2">
                    <p className="text-xs font-bold uppercase text-text-muted mb-1 flex justify-between">
                      <span>Stringa di Connessione TCPS (Autonomous Database Cloud)</span>
                      <span className="text-[10px] text-text-muted">Porta 1522 / adb.eu-turin-1.oraclecloud.com</span>
                    </p>
                    <textarea 
                      rows={3}
                      value={oracleConfig.connectString || ''}
                      onChange={(e) => handleConfigChange('connectString', e.target.value)}
                      className="w-full bg-transparent font-mono text-xs outline-none border border-border-soft rounded-lg p-2 focus:border-accent-olive"
                      placeholder="(description= (retry_count=20)...)"
                    />
                  </div>
                </>
              ) : dbType === 'firebase' ? (
                <>
                  <div className="p-4 bg-bg-main rounded-2xl border border-border-soft overflow-hidden">
                    <p className="text-xs font-bold uppercase text-text-muted mb-1 flex justify-between">Project ID</p>
                    <input 
                      type="text"
                      value={dbConfig.projectId || ''}
                      onChange={(e) => handleConfigChange('projectId', e.target.value)}
                      className="w-full bg-transparent font-mono text-sm outline-none border-b border-border-soft focus:border-accent-olive py-1"
                    />
                  </div>

                  <div className="p-4 bg-bg-main rounded-2xl border border-border-soft overflow-hidden">
                    <p className="text-xs font-bold uppercase text-text-muted mb-1">Database ID</p>
                    <input 
                      type="text"
                      value={dbConfig.firestoreDatabaseId || ''}
                      placeholder="(default)"
                      onChange={(e) => handleConfigChange('firestoreDatabaseId', e.target.value)}
                      className="w-full bg-transparent font-mono text-sm outline-none border-b border-border-soft focus:border-accent-olive py-1"
                    />
                  </div>

                  <div className="p-4 bg-bg-main rounded-2xl border border-border-soft overflow-hidden">
                    <p className="text-xs font-bold uppercase text-text-muted mb-1">Auth Domain</p>
                    <input 
                      type="text"
                      value={dbConfig.authDomain || ''}
                      onChange={(e) => handleConfigChange('authDomain', e.target.value)}
                      className="w-full bg-transparent font-mono text-sm outline-none border-b border-border-soft focus:border-accent-olive py-1"
                    />
                  </div>
                  
                  <div className="p-4 bg-bg-main rounded-2xl border border-border-soft overflow-hidden">
                    <p className="text-xs font-bold uppercase text-text-muted mb-1">API Key</p>
                    <input 
                      type="password"
                      value={dbConfig.apiKey || ''}
                      onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                      className="w-full bg-transparent font-mono text-sm outline-none border-b border-border-soft focus:border-accent-olive py-1"
                      placeholder="AIzaSy..."
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4 bg-bg-main rounded-2xl border border-border-soft overflow-hidden md:col-span-2">
                    <p className="text-xs font-bold uppercase text-text-muted mb-1 flex justify-between">Host (Supabase Server)</p>
                    <input 
                      type="text"
                      value={postgresConfig.host || ''}
                      onChange={(e) => handleConfigChange('host', e.target.value)}
                      className="w-full bg-transparent font-mono text-sm outline-none border-b border-border-soft focus:border-accent-olive py-1"
                      placeholder="db.xxx.supabase.co"
                    />
                  </div>
                  <div className="p-4 bg-bg-main rounded-2xl border border-border-soft overflow-hidden">
                    <p className="text-xs font-bold uppercase text-text-muted mb-1">Port</p>
                    <input 
                      type="number"
                      value={postgresConfig.port || ''}
                      onChange={(e) => handleConfigChange('port', e.target.value)}
                      className="w-full bg-transparent font-mono text-sm outline-none border-b border-border-soft focus:border-accent-olive py-1"
                      placeholder="5432"
                    />
                  </div>
                  <div className="p-4 bg-bg-main rounded-2xl border border-border-soft overflow-hidden">
                    <p className="text-xs font-bold uppercase text-text-muted mb-1">Database Name</p>
                    <input 
                      type="text"
                      value={postgresConfig.database || ''}
                      onChange={(e) => handleConfigChange('database', e.target.value)}
                      className="w-full bg-transparent font-mono text-sm outline-none border-b border-border-soft focus:border-accent-olive py-1"
                      placeholder="postgres"
                    />
                  </div>
                  <div className="p-4 bg-bg-main rounded-2xl border border-border-soft overflow-hidden">
                    <p className="text-xs font-bold uppercase text-text-muted mb-1">User</p>
                    <input 
                      type="text"
                      value={postgresConfig.user || ''}
                      onChange={(e) => handleConfigChange('user', e.target.value)}
                      className="w-full bg-transparent font-mono text-sm outline-none border-b border-border-soft focus:border-accent-olive py-1"
                      placeholder="postgres"
                    />
                  </div>
                  <div className="p-4 bg-bg-main rounded-2xl border border-border-soft overflow-hidden">
                    <p className="text-xs font-bold uppercase text-text-muted mb-1">Password</p>
                    <input 
                      type="password"
                      value={postgresConfig.password || ''}
                      onChange={(e) => handleConfigChange('password', e.target.value)}
                      className="w-full bg-transparent font-mono text-sm outline-none border-b border-border-soft focus:border-accent-olive py-1"
                      placeholder="********"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
