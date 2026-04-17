import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, ShieldAlert, Users, Database } from 'lucide-react';
import { activeFirebaseConfig } from '../firebase';

export default function Settings() {
  const navigate = useNavigate();
  const [adminEmail, setAdminEmail] = useState('coppolek@gmail.com');
  const [isSaving, setIsSaving] = useState(false);
  const [dbConfig, setDbConfig] = useState(activeFirebaseConfig);
  
  const handleConfigChange = (key: string, value: string) => {
    setDbConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    setIsSaving(true);
    // Simulate save processing and persist local storage custom config
    localStorage.setItem('customFirebaseConfig', JSON.stringify(dbConfig));
    setTimeout(() => {
      setIsSaving(false);
      alert('Impostazioni salvate con successo! La pagina verrà aggiornata per applicare il nuovo database.');
      window.location.reload();
    }, 800);
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
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-accent-olive px-5 py-2.5 font-medium text-white transition-colors hover:bg-accent-olive/90 disabled:opacity-50"
          >
            <Save className="h-5 w-5" />
            {isSaving ? 'Salvataggio...' : 'Salva'}
          </button>
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
                    coppolek@gmail.com
                  </span>
                </div>
                <p className="mt-2 text-xs text-text-muted">Per ragioni di sicurezza, questo è l'unico indirizzo email abilitato ad accedere come amministratore all'applicazione. Non può essere modificato.</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border-soft bg-card-bg p-6 md:p-8">
            <div className="mb-6 flex items-center gap-3 border-b border-border-soft pb-4">
              <Users className="h-6 w-6 text-accent-olive" />
              <h2 className="font-serif text-xl font-bold">Gestione Operatori</h2>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-bg-main rounded-2xl border border-border-soft">
              <div>
                <h3 className="font-bold">Codice di Accesso Globale</h3>
                <p className="text-sm text-text-muted">Il codice per far accedere i dipendenti alla dashboard.</p>
              </div>
              <input 
                type="text" 
                defaultValue="12345"
                className="w-32 rounded-xl border border-border-soft bg-white px-4 py-2 font-mono font-bold text-center outline-none focus:border-accent-olive focus:ring-1 focus:ring-accent-olive"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-border-soft bg-card-bg p-6 md:p-8">
            <div className="mb-6 flex items-center gap-3 border-b border-border-soft pb-4">
              <Database className="h-6 w-6 text-accent-olive" />
              <h2 className="font-serif text-xl font-bold">Configurazione Database</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-bg-main rounded-2xl border border-border-soft">
                <p className="text-xs font-bold uppercase text-text-muted mb-1">Stato Connessione</p>
                <div className="flex items-center gap-2 font-medium text-emerald-600">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500"></div>
                  Connesso (Firestore)
                </div>
              </div>
              
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
