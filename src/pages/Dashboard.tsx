import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder, Plus, Trash2, ArrowRight, Settings, LogOut } from 'lucide-react';

const defaultProjects = [
  {
    id: '1',
    name: 'scm',
    description: 'Gestione ore per cantieri e servizi.',
    siteCount: 8,
  }
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{username: string, role: string} | null>(null);
  
  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem('appProjects');
    return saved ? JSON.parse(saved) : defaultProjects;
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('appUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      navigate('/login');
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
    };
    setProjects([...projects, newProject]);
  };

  const handleDeleteProject = (id: string) => {
    if(window.confirm('Sei sicuro di voler eliminare questo progetto?')) {
      setProjects(projects.filter((p: any) => p.id !== id));
      // Optional: Clean up project data from localStorage too
      // for let i=0... but probably fine to leave stale data for now to keep it simple
    }
  };

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
          {projects.map((project: any) => (
            <div key={project.id} className="flex flex-col rounded-3xl border border-border-soft bg-card-bg p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Folder className="h-5 w-5 text-accent-olive" />
                <h2 className="font-serif text-xl font-bold">{project.name}</h2>
              </div>
              
              <p className="mb-4 text-sm text-text-muted">{project.description}</p>
              
              <div className="mb-6">
                <span className="inline-flex items-center rounded-full bg-sidebar-bg px-3 py-1 text-xs font-medium text-text-muted">
                  {project.siteCount} Cantieri
                </span>
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
        </div>
      </div>
    </div>
  );
}
