/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProjectDetails from './pages/ProjectDetails';
import Settings from './pages/Settings';

export default function App() {
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    const fetchGlobalDatabaseConfig = async () => {
      try {
        const resp = await fetch('/api/db/config');
        if (resp.ok) {
          const cfg = await resp.json();
          if (cfg.dbType) {
            localStorage.setItem('appDbType', cfg.dbType);
          } else {
            localStorage.setItem('appDbType', 'oracle');
          }
          if (cfg.oracle) {
            localStorage.setItem('customOracleConfig', JSON.stringify(cfg.oracle));
          }
          if (cfg.postgres) {
            localStorage.setItem('customPostgresConfig', JSON.stringify(cfg.postgres));
          }
        } else {
          if (!localStorage.getItem('appDbType')) {
            localStorage.setItem('appDbType', 'oracle');
          }
        }
      } catch (e) {
        console.error("Bootstrapping config from server failed", e);
        if (!localStorage.getItem('appDbType')) {
          localStorage.setItem('appDbType', 'oracle');
        }
      } finally {
        setIsBootstrapping(false);
      }
    };
    fetchGlobalDatabaseConfig();
  }, []);

  if (isBootstrapping) {
    return <div className="min-h-screen flex items-center justify-center bg-bg-main text-text-muted">Inizializzazione configurazione di rete in corso...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/project/:id" element={<ProjectDetails />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
