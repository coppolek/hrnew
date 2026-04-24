/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProjectDetails from './pages/ProjectDetails';
import Settings from './pages/Settings';

export default function App() {
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    const fetchGlobalDatabaseConfig = async () => {
      try {
        const docRef = doc(db, 'appData', 'globalDbConfig');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.value) {
             const configData = JSON.parse(data.value);
             if (configData.dbType) {
               localStorage.setItem('appDbType', configData.dbType);
             }
             if (configData.postgresConfig) {
               localStorage.setItem('customPostgresConfig', JSON.stringify(configData.postgresConfig));
             }
          }
        }
      } catch(e) {
        console.error("Bootstrapping config failed", e);
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
