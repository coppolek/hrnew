import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, Plus, Trash2, ArrowRight, Settings, LogOut, Users, Shield, X, Save, Search, Bell } from 'lucide-react';
import { fetchFromFirestore, syncToFirestore } from '../services/db';

const defaultProjects = [
  {
    id: '1',
    name: 'scm',
    description: 'Gestione ore per cantieri e servizi.',
    siteCount: 8,
    permissions: {}
  }
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{username: string, role: string} | null>(null);
  const [operators, setOperators] = useState<{id: string, username: string}[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<{id: string, message: string}[]>([]);
  const [isSyncing, setIsSyncing] = useState(true);
  
  const [projects, setProjects] = useState<any[]>([]);
  const [accessModalProject, setAccessModalProject] = useState<any>(null);
  const [deleteModalProject, setDeleteModalProject] = useState<any>(null);

  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    const loadFromDb = async () => {
      setIsSyncing(true);
      setDbError(null);
      try {
        const dbProjects = await fetchFromFirestore('appProjects');
        if (dbProjects) {
          setProjects(dbProjects);
        } else {
          setProjects(defaultProjects);
        }

        const dbOps = await fetchFromFirestore('appOperators');
        if (dbOps) {
          setOperators(dbOps);
        }
      } catch (err: any) {
        if (err.message.includes('password') || err.message.includes('Nessuna configurazione')) {
          setDbError('Nessuna password di database presente in Impostazioni. L\'uso dei dati rimarrà locale e simulato fin quando non ne verrà inserita una.');
        } else {
          setDbError(err.message);
        }
        setProjects(defaultProjects);
      } finally {
        setIsSyncing(false);
      }
    };
    loadFromDb();
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('appUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    if (!isSyncing && projects.length > 0 && !dbError) {
      try {
        syncToFirestore('appProjects', projects).catch(err => {
          if (err.message.includes('password')) {
            setDbError('Tentativo di sincronizzazione fallito. Password mancante nel DB.');
          }
        });
      } catch(e) {}
    }
  }, [projects, isSyncing, dbError]);

  const handleLogout = () => {
    localStorage.removeItem('appUser');
    navigate('/login');
  };

  const addNotification = useCallback((message: string) => {
    const id = Date.now().toString() + Math.random().toString();
    setNotifications(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  // Ascolto eventi di storage (simula notifiche push cross-tab)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (!user) return;
      
      if (e.key === 'appProjects') {
        if (e.newValue) {
          setProjects(JSON.parse(e.newValue));
          addNotification('I permessi o l\'elenco dei progetti sono stati aggiornati da un altro utente.');
        }
      } else if (e.key?.startsWith('appData_')) {
        const parts = e.key.split('_');
        if (parts.length >= 2) {
          const projectId = parts[1];
          // Find the project locally. Use current state.
          const proj = projects.find((p: any) => p.id === projectId);
          
          // Se il progetto esiste e l'utente ha i permessi (o è admin)
          if (proj && (user.role === 'admin' || proj.permissions?.[user.username] === 'read' || proj.permissions?.[user.username] === 'write')) {
            addNotification(`Il progetto "${proj.name}" è stato appena aggiornato tramite sincronizzazione.`);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [user, projects, addNotification]);

  const handleAddProject = () => {
    const newProject = {
      id: Date.now().toString(),
      name: 'Nuovo Progetto',
      description: 'Descrizione del nuovo progetto.',
      siteCount: 0,
      permissions: {}
    };
    setProjects([...projects, newProject]);
  };

  const handleDeleteProject = (project: any) => {
    setDeleteModalProject(project);
  };

  const confirmDeleteProject = () => {
    if (deleteModalProject) {
      setProjects(projects.filter((p: any) => p.id !== deleteModalProject.id));
      setDeleteModalProject(null);
    }
  };

  const handleOpenAccessModal = (project: any) => {
    if(!project.permissions) project.permissions = {};
    setAccessModalProject(JSON.parse(JSON.stringify(project))); // Clone for temp edits
  };

  const handlePermissionChange = (username: string, value: string) => {
    setAccessModalProject((prev: any) => {
      const newPerms = { ...prev.permissions };
      if (value === 'none') {
        delete newPerms[username];
      } else {
        newPerms[username] = value;
      }
      return { ...prev, permissions: newPerms };
    });
  };

  const handleSaveAccess = () => {
    setProjects(projects.map((p: any) => p.id === accessModalProject.id ? accessModalProject : p));
    setAccessModalProject(null);
  };

  // Filter projects by user permissions and search query
  const permittedProjects = user?.role === 'admin' 
    ? projects 
    : projects.filter((p: any) => p.permissions && (p.permissions[user?.username || ''] === 'read' || p.permissions[user?.username || ''] === 'write'));

  const visibleProjects = permittedProjects.filter((p: any) => {
    if (!searchQuery.trim()) return true;
    
    // Split the query into individual words/terms
    const searchTerms = searchQuery.toLowerCase().trim().split(/\s+/);
    
    // Combine name and description into a single searchable string
    const searchableText = `${p.name || ''} ${p.description || ''}`.toLowerCase();
    
    // Check if ALL search terms match somewhere in the project
    return searchTerms.every(term => searchableText.includes(term));
  });

  return (
    <div className="min-h-screen bg-bg-main p-8 font-sans text-text-main md:p-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-olive text-white">
              <Folder className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-bold tracking-tight">GESTIONE ORE</h1>
              <p className="text-text-muted">Dashboard Progetti</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {user?.role === 'admin' && (
              <button 
                onClick={() => navigate('/settings')}
                className="flex items-center gap-2 rounded-xl bg-sidebar-bg px-4 py-2.5 font-medium text-text-main transition-colors hover:bg-border-soft"
              >
                <Settings className="h-5 w-5" />
                <span className="hidden sm:inline">Impostazioni</span>
              </button>
            )}
            {user?.role === 'admin' && (
              <button 
                onClick={handleAddProject}
                className="flex items-center gap-2 rounded-xl bg-accent-olive px-5 py-2.5 font-medium text-white transition-colors hover:bg-accent-olive/90"
              >
                <Plus className="h-5 w-5" />
                Nuovo Progetto
              </button>
            )}
            <button 
              onClick={handleLogout}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-border-soft text-text-muted hover:text-text-main hover:bg-sidebar-bg ml-2"
              title="Esci"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="mb-8 relative max-w-md">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-text-muted" />
          </div>
          <input
            type="text"
            className="block w-full rounded-xl border border-border-soft bg-card-bg py-2.5 pl-10 pr-4 outline-none focus:border-accent-olive focus:ring-1 focus:ring-accent-olive"
            placeholder="Cerca progetto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {dbError && (
          <div className="mb-8 p-4 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 flex items-start gap-3">
            <Shield className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Avviso Database Supabase</p>
              <p className="text-xs mt-1 opacity-90">{dbError}</p>
              <button onClick={() => navigate('/settings')} className="mt-2 text-xs font-semibold underline decoration-orange-300 underline-offset-2">Vai alle Impostazioni →</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visibleProjects.map((project: any) => (
            <div key={project.id} className="flex flex-col rounded-3xl border border-border-soft bg-card-bg p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Folder className="h-5 w-5 text-accent-olive" />
                  <h2 className="font-serif text-xl font-bold">{project.name}</h2>
                </div>
                {user?.role === 'admin' && (
                  <button 
                    onClick={() => handleOpenAccessModal(project)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-bg text-text-muted hover:bg-border-soft hover:text-text-main"
                    title="Gestione Accessi"
                  >
                    <Shield className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              <p className="mb-4 text-sm text-text-muted">{project.description}</p>
              
              <div className="mb-6">
                <span className="inline-flex items-center rounded-full bg-sidebar-bg px-3 py-1 text-xs font-medium text-text-muted">
                  {project.siteCount} Cantieri
                </span>
                {user?.role === 'operator' && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 border border-blue-100">
                    {project.permissions[user.username] === 'read' ? 'Solo lettura' : 'Scrittura'}
                  </span>
                )}
              </div>
              
              <div className="mt-auto flex items-center justify-between border-t border-border-soft pt-4">
                <button 
                  onClick={() => navigate(`/project/${project.id}`)}
                  className="flex items-center gap-1 font-medium text-accent-olive hover:underline"
                >
                  Apri <ArrowRight className="h-4 w-4" />
                </button>
                {user?.role === 'admin' && (
                  <button 
                    onClick={() => handleDeleteProject(project)}
                    className="text-text-muted hover:text-red-500"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {visibleProjects.length === 0 && (
            <div className="col-span-full py-12 text-center text-text-muted">
              Nessun progetto disponibile. {user?.role === 'admin' && "Creane uno nuovo dall'apposito pulsante."}
            </div>
          )}
        </div>

        {/* Access Modal */}
        {accessModalProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white shadow-lg border border-border-soft">
              <div className="flex items-center justify-between border-b border-border-soft px-6 py-4">
                <h3 className="font-serif text-lg font-bold">Accessi: {accessModalProject.name}</h3>
                <button 
                  onClick={() => setAccessModalProject(null)} 
                  className="rounded-full p-2 hover:bg-sidebar-bg text-text-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm text-text-muted mb-4">Gestisci chi può vedere e modificare questo progetto tra gli Operatori censiti.</p>
                <div className="space-y-3">
                  {operators.length === 0 && (
                    <div className="text-sm italic text-text-muted py-4">Nessun operatore configurato in Impostazioni.</div>
                  )}
                  {operators.map(op => (
                    <div key={op.username} className="flex items-center justify-between bg-bg-main p-3 rounded-xl border border-border-soft">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-text-muted" />
                        <span className="font-medium">{op.username}</span>
                      </div>
                      <select 
                        value={accessModalProject.permissions[op.username] || 'none'}
                        onChange={(e) => handlePermissionChange(op.username, e.target.value)}
                        className="bg-white border border-border-soft rounded-lg px-2 py-1 text-sm outline-none focus:border-accent-olive"
                      >
                        <option value="none">Nessun accesso</option>
                        <option value="read">Solo lettura</option>
                        <option value="write">Scrittura</option>
                      </select>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex justify-end">
                  <button 
                    onClick={handleSaveAccess}
                    className="flex items-center gap-2 rounded-xl bg-accent-olive px-6 py-2.5 font-medium text-white transition-colors hover:bg-accent-olive/90"
                  >
                    <Save className="h-4 w-4" />
                    Salva Permessi
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {deleteModalProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl bg-white shadow-lg border border-border-soft">
              <div className="p-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-500">
                  <Trash2 className="h-6 w-6" />
                </div>
                <h3 className="text-center font-serif text-xl font-bold mb-2">Elimina Progetto</h3>
                <p className="text-center text-sm text-text-muted mb-6">
                  Sei sicuro di voler eliminare il progetto <strong>"{deleteModalProject.name}"</strong>? Questa azione non può essere annullata.
                </p>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setDeleteModalProject(null)}
                    className="flex-1 rounded-xl bg-sidebar-bg px-4 py-2.5 font-medium text-text-main transition-colors hover:bg-border-soft"
                  >
                    Annulla
                  </button>
                  <button 
                    onClick={confirmDeleteProject}
                    className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 font-medium text-white transition-colors hover:bg-red-600"
                  >
                    Elimina
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Portal */}
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {notifications.map(n => (
            <div key={n.id} className="flex animate-in slide-in-from-right-8 duration-300 items-center gap-3 rounded-2xl bg-card-bg border border-border-soft p-4 shadow-xl">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-olive/10 text-accent-olive">
                <Bell className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-text-main pr-2">{n.message}</p>
              <button 
                onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))}
                className="ml-auto text-text-muted hover:text-text-main rounded-full p-1 hover:bg-sidebar-bg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
