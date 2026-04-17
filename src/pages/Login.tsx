import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck, Mail } from 'lucide-react';
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

export default function Login() {
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // If user is already logged in (e.g. from previous session)
      // verify it's the admin, otherwise log them out
      if (user) {
        if (user.email === 'coppolek@gmail.com') {
          navigate('/dashboard');
        } else {
          auth.signOut();
          alert('Accesso negato. Solo l\'amministratore unico è autorizzato (coppolek@gmail.com).');
        }
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      // In a real app, validate the simple access code here for non-admins
      navigate('/dashboard');
    }
  };

  const handleAdminAuth = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      if (result.user.email !== 'coppolek@gmail.com') {
        await auth.signOut();
        alert('Accesso negato. Solo l\'amministratore unico è autorizzato (coppolek@gmail.com).');
        return;
      }
      
      // Wait for onAuthStateChanged to handle redirect
    } catch (error) {
      console.error("Error signing in with Google", error);
      alert("Errore durante l'accesso admin.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-main font-sans text-text-main">
      <div className="flex w-full max-w-md flex-col items-center p-8">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-card-bg shadow-sm border border-border-soft">
          <Lock className="h-8 w-8 text-accent-olive" />
        </div>
        
        <h1 className="mb-2 font-serif text-3xl font-bold tracking-tight">GESTIONE ORE</h1>
        <p className="mb-8 text-text-muted">Inserisci il codice di accesso</p>

        <form onSubmit={handleLogin} className="w-full space-y-4 mb-8">
          <div>
            <input
              type="password"
              placeholder="Codice segreto"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-xl border border-border-soft bg-card-bg px-4 py-3 outline-none focus:border-accent-olive focus:ring-1 focus:ring-accent-olive"
            />
          </div>
          
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-olive px-4 py-3 font-medium text-white transition-colors hover:bg-accent-olive/90"
          >
            <ShieldCheck className="h-5 w-5" />
            Accedi Operatore
          </button>
        </form>

        <div className="w-full relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border-soft"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-bg-main px-2 text-text-muted uppercase font-bold text-xs">Accesso Amministratore</span>
          </div>
        </div>

        <button
          onClick={handleAdminAuth}
          type="button"
          className="mt-4 flex w-full items-center justify-center gap-3 rounded-xl border border-border-soft bg-card-bg px-4 py-3 font-medium text-text-main transition-colors hover:border-accent-olive hover:bg-sidebar-bg"
        >
          <Mail className="h-5 w-5 text-red-500" />
          Accedi con Google
        </button>

      </div>
    </div>
  );
}
