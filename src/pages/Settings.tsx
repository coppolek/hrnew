import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, Users, Database, Play, Plus, Trash2 } from 'lucide-react';
import { activeFirebaseConfig } from '../firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

export default function Settings() {
  const navigate = useNavigate();
  const [adminEmail, setAdminEmail] = useState('coppolek@gmail.com');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [dbType, setDbType] = useState(() => localStorage.getItem('appDbType') || 'firebase');
  
  const [operators, setOperators] = useState<{id: string, username: string, password: string}[]>(() => {
    const raw = localStorage.getItem('appOperators');
    return raw ? JSON.parse(raw) : [];
  });
  const [newOpUsername, setNewOpUsername] = useState('');
  const [newOpPassword, setNewOpPassword] = useState('');
  
  const [customGeminiKey, setCustomGeminiKey] = useState(() => localStorage.getItem('customGeminiApiKey') || '');

  const [dbConfig, setDbConfig] = useState(activeFirebaseConfig);
  const [mysqlConfig, setMysqlConfig] = useState(() => {
    const raw = localStorage.getItem('customMysqlConfig');
    return raw ? JSON.parse(raw) : { host: 'localhost', port: '3306', user: 'root', password: '', database: '' };
  });
  
  const handleConfigChange = (key: string, value: string) => {
    if (dbType === 'firebase') {
      setDbConfig(prev => ({ ...prev, [key]: value }));
    } else {
      setMysqlConfig((prev: any) => ({ ...prev, [key]: value }));
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    if (dbType === 'firebase') {
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
        
        alert('Connessione a Firebase riuscita, lettura e scrittura completate senza limitazioni!');
        await deleteApp(tempApp);
      } catch (err: any) {
        alert('Errore di connessione o permessi limitati in Firebase:\\n' + err.message);
      }
    } else {
      try {
        const res = await fetch('/api/test-mysql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mysqlConfig)
        });
        const data = await res.json();
        if (data.success) {
          alert('Connessione a MySQL riuscita!');
        } else {
          alert('Errore di connessione a MySQL:\\n' + data.error);
        }
      } catch (err: any) {
        alert('Errore di rete durante il test MySQL: impossibile contattare il server locale.');
      }
    }
    setIsTesting(false);
  };

  useEffect(() => {
    localStorage.setItem('appOperators', JSON.stringify(operators));
  }, [operators]);

  useEffect(() => {
    localStorage.setItem('appDbType', dbType);
  }, [dbType]);

  useEffect(() => {
    localStorage.setItem('customGeminiApiKey', customGeminiKey);
  }, [customGeminiKey]);

  useEffect(() => {
    localStorage.setItem('customFirebaseConfig', JSON.stringify(dbConfig));
  }, [dbConfig]);

  useEffect(() => {
    localStorage.setItem('customMysqlConfig', JSON.stringify(mysqlConfig));
  }, [mysqlConfig]);

  const handleAddOperator = () => {
    if (newOpUsername.trim() && newOpPassword.trim()) {
      setOperators(prev => [...prev, {
        id: Date.now().toString(),
        username: newOpUsername.trim(),
        password: newOpPassword.trim()
      }]);
      setNewOpUsername('');
      setNewOpPassword('');
    }
  };

  const handleDeleteOperator = (id: string) => {
    setOperators(prev => prev.filter(op => op.id !== id));
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
                <label className="mb-2 block text-sm font-medium uppercase text-text-muted">Chiave API Gemini (Opzionale)</label>
                <input 
                  type="password" 
                  value={customGeminiKey}
                  placeholder="Inserisci la tua API Key Gemini..."
                  onChange={(e) => setCustomGeminiKey(e.target.value)}
                  className="w-full rounded-xl border border-border-soft lg:w-2/3 bg-white px-4 py-3 font-medium text-text-main outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
                <p className="mt-2 text-xs text-text-muted">
                  E' già configurata una API Key di sistema gratuita. Se ricevi errori di "Quota superata" durante le importazioni di file o desideri usare la tua chiave Google Gemini, inseriscila qui.
                </p>
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

            <div className="mb-6 flex gap-4 w-full border-b border-border-soft pb-4">
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
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="dbtype" 
                  value="mysql" 
                  checked={dbType === 'mysql'} 
                  onChange={() => setDbType('mysql')}
                  className="accent-accent-olive"
                />
                <span className="font-medium text-sm">MySQL</span>
              </label>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-bg-main rounded-2xl border border-border-soft md:col-span-2">
                <p className="text-xs font-bold uppercase text-text-muted mb-1">Stato Connessione Corrente</p>
                <div className="flex items-center gap-2 font-medium text-emerald-600">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500"></div>
                  In uso ({dbType === 'firebase' ? 'Firestore' : 'MySQL'})
                </div>
              </div>
              
              {dbType === 'firebase' ? (
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
                  <div className="p-4 bg-bg-main rounded-2xl border border-border-soft overflow-hidden">
                    <p className="text-xs font-bold uppercase text-text-muted mb-1 flex justify-between">Host</p>
                    <input 
                      type="text"
                      value={mysqlConfig.host || ''}
                      onChange={(e) => handleConfigChange('host', e.target.value)}
                      className="w-full bg-transparent font-mono text-sm outline-none border-b border-border-soft focus:border-accent-olive py-1"
                      placeholder="localhost"
                    />
                  </div>
                  <div className="p-4 bg-bg-main rounded-2xl border border-border-soft overflow-hidden">
                    <p className="text-xs font-bold uppercase text-text-muted mb-1">Port</p>
                    <input 
                      type="number"
                      value={mysqlConfig.port || ''}
                      onChange={(e) => handleConfigChange('port', e.target.value)}
                      className="w-full bg-transparent font-mono text-sm outline-none border-b border-border-soft focus:border-accent-olive py-1"
                      placeholder="3306"
                    />
                  </div>
                  <div className="p-4 bg-bg-main rounded-2xl border border-border-soft overflow-hidden">
                    <p className="text-xs font-bold uppercase text-text-muted mb-1">User</p>
                    <input 
                      type="text"
                      value={mysqlConfig.user || ''}
                      onChange={(e) => handleConfigChange('user', e.target.value)}
                      className="w-full bg-transparent font-mono text-sm outline-none border-b border-border-soft focus:border-accent-olive py-1"
                      placeholder="root"
                    />
                  </div>
                  <div className="p-4 bg-bg-main rounded-2xl border border-border-soft overflow-hidden">
                    <p className="text-xs font-bold uppercase text-text-muted mb-1">Password</p>
                    <input 
                      type="password"
                      value={mysqlConfig.password || ''}
                      onChange={(e) => handleConfigChange('password', e.target.value)}
                      className="w-full bg-transparent font-mono text-sm outline-none border-b border-border-soft focus:border-accent-olive py-1"
                      placeholder="********"
                    />
                  </div>
                  <div className="p-4 bg-bg-main rounded-2xl border border-border-soft overflow-hidden md:col-span-2">
                    <p className="text-xs font-bold uppercase text-text-muted mb-1">Database Name</p>
                    <input 
                      type="text"
                      value={mysqlConfig.database || ''}
                      onChange={(e) => handleConfigChange('database', e.target.value)}
                      className="w-full bg-transparent font-mono text-sm outline-none border-b border-border-soft focus:border-accent-olive py-1"
                      placeholder="gestione_ore"
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
