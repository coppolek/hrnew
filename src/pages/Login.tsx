import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('appUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.role === 'admin' || user.role === 'operator') {
        navigate('/dashboard');
      }
    }
  }, [navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin') {
      localStorage.setItem('appUser', JSON.stringify({ username: 'admin', role: 'admin' }));
      navigate('/dashboard');
    } else if (username.trim() && password.trim()) {
      const rawOperators = localStorage.getItem('appOperators');
      const operators = rawOperators ? JSON.parse(rawOperators) : [];
      const match = operators.find((op: any) => op.username === username.trim() && op.password === password.trim());
      
      if (match) {
        localStorage.setItem('appUser', JSON.stringify({ username: match.username, role: 'operator' }));
        navigate('/dashboard');
      } else {
        alert('Credenziali non valide o utente non autorizzato.');
      }
    } else {
      alert('Inserisci le credenziali.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-main font-sans text-text-main">
      <div className="flex w-full max-w-md flex-col items-center p-8">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-card-bg shadow-sm border border-border-soft">
          <Lock className="h-8 w-8 text-accent-olive" />
        </div>
        
        <h1 className="mb-2 font-serif text-3xl font-bold tracking-tight">GESTIONE ORE</h1>
        <p className="mb-8 text-text-muted">Inserisci le tue credenziali</p>

        <form onSubmit={handleLogin} className="w-full space-y-4 mb-8">
          <div>
            <input
              type="text"
              placeholder="Nome utente"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-border-soft bg-card-bg px-4 py-3 outline-none focus:border-accent-olive focus:ring-1 focus:ring-accent-olive mb-3"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border-soft bg-card-bg px-4 py-3 outline-none focus:border-accent-olive focus:ring-1 focus:ring-accent-olive"
            />
          </div>
          
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-olive px-4 py-3 font-medium text-white transition-colors hover:bg-accent-olive/90"
          >
            <ShieldCheck className="h-5 w-5" />
            Accedi
          </button>
        </form>
      </div>
    </div>
  );
}
