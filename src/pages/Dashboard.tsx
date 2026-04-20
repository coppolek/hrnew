import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, Plus, Trash2, ArrowRight, Settings, LogOut, Users, Shield, X, Save } from 'lucide-react';

const defaultProjects = [
  {
    id: '1',
    name: 'scm',
    description: 'Gestione ore per cantieri e servizi.',
    siteCount: 8,
    permissions: {} // Added permissions object: Record<string, "read" | "write"> (username -> role)
  }
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{username: string, role: string} | null>(null);
  const [operators, setOperators] = useState<{id: string, username: string}[]>([]);
  
  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem('appProjects');
    return saved ? JSON.parse(saved) : defaultProjects;
  });

  const [accessModalProject, setAccessModalProject] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('appUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      navigate('/login');
    }
    
    const storedOps = localStorage.getItem('appOperators');
    if (storedOps) {
      setOperators(JSON.parse(storedOps));
    }
  }, [navigate]);

  useEffect(() => {
    localStorage.setItem('appProjects', JSON.stringify(projects));
  }, [projects]);

  const handleLogout = () => {
    localStorage.removeItem('appUser');
    navigate('/login');
  };

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

  const handleDeleteProject = (id: string) => {
    if(window.confirm('Sei sicuro di voler eliminare questo progetto?')) {
      setProjects(projects.filter((p: any) => p.id !== id));
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

  // Filter projects by user permissions
  const visibleProjects = user?.role === 'admin' 
    ? projects 
    : projects.filter((p: any) => p.permissions && (p.permissions[user?.username || ''] === 'read' || p.permissions[user?.username || ''] === 'write'));

  return (
    <div className="min-h-screen bg-bg-main p-8 font-sans text-text-main md:p-12">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
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
                    onClick={() => handleDeleteProject(project.id)}
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
      </div>
    </div>
  );
}
