import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Printer, UserPlus, Trash2, Plus, Building2, Briefcase, X, Pencil } from 'lucide-react';
import { cn } from '../lib/utils';
import { OperatorRecord } from '../types';

const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
const ItalianDays = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];

const defaultProjectData = {
  sites: [
    { id: '1', name: 'csr' },
    { id: '2', name: 'villa monte 57' },
    { id: '3', name: 'CANTIERE 3' },
    { id: '4', name: 'VILLA MARE VILLA VERUCCHIO' },
    { id: '5', name: 'FONDERIA VILLA VERUCCHIO' },
    { id: '6', name: 'EX SERGIANI CERASOLO' },
    { id: '7', name: 'HITECO VILLA VERUCCHIO' }
  ],
  services: [
    { id: '1', name: 'PULIZIE ORDINARIE' },
    { id: '2', name: 'extra' },
    { id: '3', name: 'SERVIZIO 3' }
  ],
  siteSettings: {} as Record<string, { canone: string, ord: string, ext: string }>,
  operatorStore: {
    '1_1': [{ id: '1', operatorName: 'JAOUIA MALIKA', hours: {} }]
  } as Record<string, OperatorRecord[]>,
  rentals: [] as {id: string, description: string, amount: string}[],
  deratizations: [] as {id: string, description: string, amount: string}[]
};

const getStoredDataForMonthYear = (projectId: string, year: number, monthIdx: number) => {
  const currentKey = `appData_${projectId}_${year}_${monthIdx}`;
  const stored = localStorage.getItem(currentKey);
  
  if (stored) {
    return JSON.parse(stored);
  }

  // Look for previous data starting from last month and going backwards up to 24 months
  let checkYear = year;
  let checkMonth = monthIdx - 1;
  
  for (let i = 0; i < 24; i++) {
    if (checkMonth < 0) {
      checkMonth = 11;
      checkYear--;
    }
    const prevKey = `appData_${projectId}_${checkYear}_${checkMonth}`;
    const prevStored = localStorage.getItem(prevKey);
    if (prevStored) {
      const prevData = JSON.parse(prevStored);
      // Clone operatorStore and clear hours when inheriting
      const newOperatorStore = { ...prevData.operatorStore };
      Object.keys(newOperatorStore).forEach(k => {
        newOperatorStore[k] = newOperatorStore[k].map((op: any) => ({ ...op, hours: {} }));
      });
      return {
        sites: prevData.sites || defaultProjectData.sites,
        services: prevData.services || defaultProjectData.services,
        siteSettings: prevData.siteSettings || {},
        operatorStore: newOperatorStore,
        rentals: [], // Usually specific to a month
        deratizations: [] // Usually specific to a month
      };
    }
    checkMonth--;
  }

  // If no past data found, return default
  return defaultProjectData;
};

export default function ProjectDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();
  const currentMonth = months[currentMonthIdx];
  
  const [activeMonth, setActiveMonth] = useState(currentMonth);
  const [activeYear, setActiveYear] = useState(currentYear);
  const monthIndex = months.indexOf(activeMonth);

  const [projectData, setProjectData] = useState(() => getStoredDataForMonthYear(id || 'default', activeYear, monthIndex));

  // Reload data when active tracking changes (month or year)
  useEffect(() => {
    setProjectData(getStoredDataForMonthYear(id || 'default', activeYear, monthIndex));
  }, [id, activeYear, monthIndex]);

  // Save changes to localStorage whenever projectData changes
  useEffect(() => {
    const dataKey = `appData_${id || 'default'}_${activeYear}_${monthIndex}`;
    localStorage.setItem(dataKey, JSON.stringify(projectData));
  }, [projectData, id, activeYear, monthIndex]);

  // Derived state bindings
  const sites = projectData.sites || [];
  const services = projectData.services || [];
  const siteSettings = projectData.siteSettings || {};
  const operatorStore = projectData.operatorStore || {};
  const rentals = projectData.rentals || [];
  const deratizations = projectData.deratizations || [];

  // Derived setters to hook into existing functions seamlessly
  const setSites = (val: any) => setProjectData(prev => ({ ...prev, sites: typeof val === 'function' ? val(prev.sites) : val }));
  const setServices = (val: any) => setProjectData(prev => ({ ...prev, services: typeof val === 'function' ? val(prev.services) : val }));
  const setSiteSettings = (val: any) => setProjectData(prev => ({ ...prev, siteSettings: typeof val === 'function' ? val(prev.siteSettings) : val }));
  const setOperatorStore = (val: any) => setProjectData(prev => ({ ...prev, operatorStore: typeof val === 'function' ? val(prev.operatorStore) : val }));
  const setRentals = (val: any) => setProjectData(prev => ({ ...prev, rentals: typeof val === 'function' ? val(prev.rentals) : val }));
  const setDeratizations = (val: any) => setProjectData(prev => ({ ...prev, deratizations: typeof val === 'function' ? val(prev.deratizations) : val }));

  const [activeSiteId, setActiveSiteId] = useState('1');
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [editingSiteName, setEditingSiteName] = useState('');

  const activeSiteName = sites.find((s: any) => s.id === activeSiteId)?.name || '';

  const [activeServiceId, setActiveServiceId] = useState('1');
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingServiceName, setEditingServiceName] = useState('');

  const activeServiceName = services.find((s: any) => s.id === activeServiceId)?.name || '';

  const currentSettings = siteSettings[activeSiteId] || { canone: "200", ord: "18.25", ext: "18.25" };
  const updateSettings = (key: 'canone' | 'ord' | 'ext', val: string) => {
    setSiteSettings(prev => ({
      ...prev,
      [activeSiteId]: { ...currentSettings, [key]: val }
    }));
  };

  // Calculate days dynamically based on month and year
  // Get number of days in month
  const daysInMonth = new Date(activeYear, monthIndex + 1, 0).getDate();
  
  // Array of days of the week for the table header
  const daysOfWeek = Array.from({ length: daysInMonth }).map((_, i) => {
    const date = new Date(activeYear, monthIndex, i + 1);
    return ItalianDays[date.getDay()];
  });

  // Check if a specific day is a weekend
  const isWeekend = (dayIndex: number) => {
    const dayOfWeek = new Date(activeYear, monthIndex, dayIndex + 1).getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
  };

  const activeStoreKey = `${activeSiteId}_${activeServiceId}`;
  const operators = operatorStore[activeStoreKey] || [];

  const setOperators = (newOps: OperatorRecord[]) => {
    setOperatorStore((prev: any) => ({ ...prev, [activeStoreKey]: newOps }));
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newOperatorName, setNewOperatorName] = useState('');

  const handleAddOperator = (e: React.FormEvent) => {
    e.preventDefault();
    if (newOperatorName.trim()) {
      setOperators([...operators, {
        id: Date.now().toString(),
        operatorName: newOperatorName.trim().toUpperCase(),
        hours: {}
      }]);
      setNewOperatorName('');
      setIsModalOpen(false);
    }
  };

  const handleDeleteOperator = (id: string) => {
    setOperators(operators.filter(op => op.id !== id));
  };

  const handleUpdateHours = (operatorId: string, dayIndex: number, value: string) => {
    // Allow empty string or valid numbers (including decimals)
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;

    setOperators(operators.map(op => {
      if (op.id === operatorId) {
        const newHours = { ...op.hours };
        if (value === '') {
          delete newHours[dayIndex];
        } else {
          newHours[dayIndex] = value;
        }
        return { ...op, hours: newHours };
      }
      return op;
    }));
  };

  const handleAddSite = () => {
    const newId = Date.now().toString();
    setSites((prev: any) => [...prev, { id: newId, name: 'NUOVO CANTIERE' }]);
    setActiveSiteId(newId);
    setEditingSiteId(newId);
    setEditingSiteName('NUOVO CANTIERE');
  };

  const handleDeleteSite = (id: string) => {
    setSites((prev: any) => {
      const newSites = prev.filter((s:any) => s.id !== id);
      if (activeSiteId === id && newSites.length > 0) {
        setActiveSiteId(newSites[0].id);
      }
      return newSites;
    });
  };

  const handleStartEditSite = (site: { id: string, name: string }) => {
    setEditingSiteId(site.id);
    setEditingSiteName(site.name);
  };

  const handleSaveSiteEdit = () => {
    if (editingSiteName.trim()) {
      setSites((prev: any) => prev.map((s: any) => s.id === editingSiteId ? { ...s, name: editingSiteName.trim() } : s));
    }
    setEditingSiteId(null);
  };

  const handleAddService = () => {
    const newId = Date.now().toString();
    setServices((prev: any) => [...prev, { id: newId, name: 'NUOVO SERVIZIO' }]);
    setActiveServiceId(newId);
    setEditingServiceId(newId);
    setEditingServiceName('NUOVO SERVIZIO');
  };

  const handleDeleteService = (id: string) => {
    setServices((prev: any) => {
      const newServices = prev.filter((s:any) => s.id !== id);
      if (activeServiceId === id && newServices.length > 0) {
        setActiveServiceId(newServices[0].id);
      }
      return newServices;
    });
  };

  const handleStartEditService = (service: { id: string, name: string }) => {
    setEditingServiceId(service.id);
    setEditingServiceName(service.name);
  };

  const handleSaveServiceEdit = () => {
    if (editingServiceName.trim()) {
      setServices((prev: any) => prev.map((s: any) => s.id === editingServiceId ? { ...s, name: editingServiceName.trim() } : s));
    }
    setEditingServiceId(null);
  };

  const [modalConfig, setModalConfig] = useState<{isOpen: boolean, type: 'rental' | 'deratization' | null}>({isOpen: false, type: null});
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemDesc.trim() && newItemAmount.trim() && modalConfig.type) {
      const newItem = { id: Date.now().toString(), description: newItemDesc.trim(), amount: newItemAmount.trim() };
      if (modalConfig.type === 'rental') {
        setRentals((prev: any) => [...prev, newItem]);
      } else {
        setDeratizations((prev: any) => [...prev, newItem]);
      }
      setNewItemDesc('');
      setNewItemAmount('');
      setModalConfig({isOpen: false, type: null});
    }
  };

  const handleDeleteItem = (id: string, type: 'rental' | 'deratization') => {
    if (type === 'rental') {
      setRentals((prev: any) => prev.filter((r: any) => r.id !== id));
    } else {
      setDeratizations((prev: any) => prev.filter((d: any) => d.id !== id));
    }
  };

  // Calculate total hours
  const totalHours = operators.reduce((total, op) => {
    return total + Object.values(op.hours).reduce((sum: number, hoursVal) => {
      const val = parseFloat(hoursVal as string) || 0;
      return sum + val;
    }, 0);
  }, 0);

  const ordService = services.find(s => s.name.toUpperCase() === 'PULIZIE ORDINARIE');
  const ordServiceId = ordService ? ordService.id : null;
  const ordOperators = ordServiceId ? (operatorStore[`${activeSiteId}_${ordServiceId}`] || []) : [];
  
  const totalOrdHours = ordOperators.reduce((total, op) => {
    return total + Object.values(op.hours).reduce((sum: number, hoursVal) => sum + (parseFloat(hoursVal as string) || 0), 0);
  }, 0);
  
  const oreExtraDaOrdinarie = Math.max(0, totalOrdHours - (parseFloat(currentSettings.canone) || 0));

  const totalRentals = rentals.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const totalDeratizations = deratizations.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  // Formatting helper
  const formatNumber = (num: number) => num.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-bg-main font-sans text-text-main">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-10 border-b border-border-soft bg-card-bg px-6 py-4 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="rounded-full p-2 hover:bg-sidebar-bg">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-serif text-xl font-bold uppercase">SCM</h1>
              <p className="text-xs text-text-muted">Gestione ore per cantieri e servizi.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 rounded-full bg-sidebar-bg p-1">
            {months.map((m) => (
              <button
                key={m}
                onClick={() => setActiveMonth(m)}
                className={cn(
                  "rounded-full px-3 py-1 text-sm font-medium transition-colors",
                  activeMonth === m ? "bg-accent-olive text-white" : "text-text-muted hover:text-text-main"
                )}
              >
                {m}
              </button>
            ))}
            <input
              type="number"
              value={activeYear}
              onChange={(e) => setActiveYear(parseInt(e.target.value) || new Date().getFullYear())}
              className="ml-2 w-16 bg-transparent pr-4 font-bold text-accent-olive outline-none"
              min={2000}
              max={2100}
            />
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 print:p-0">
        {/* Print Header Visible Only on Print */}
        <div className="hidden print:block mb-8">
          <h1 className="font-serif text-2xl font-bold uppercase">Registro Ore - SCM</h1>
          <div className="flex justify-between border-b-2 border-black pb-2 mt-4 text-sm font-bold uppercase">
            <div>Mese: {activeMonth} {activeYear}</div>
            <div className="text-right">Pagina 1/1</div>
          </div>
        </div>

        {/* Sites Navigation */}
        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 print:hidden">
          {sites.map((site) => (
            <button
              key={site.id}
              onClick={() => setActiveSiteId(site.id)}
              className={cn(
                "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium uppercase transition-colors shrink-0 flex items-center gap-2",
                activeSiteId === site.id 
                  ? "border-accent-olive bg-accent-olive text-white" 
                  : "border-border-soft bg-card-bg text-text-muted hover:border-accent-olive/50"
              )}
            >
              {editingSiteId === site.id ? (
                <input 
                  autoFocus
                  value={editingSiteName} 
                  onChange={e => setEditingSiteName(e.target.value)}
                  onBlur={handleSaveSiteEdit}
                  onKeyDown={e => e.key === 'Enter' && handleSaveSiteEdit()}
                  className="bg-transparent outline-none text-white w-full min-w-[120px]"
                />
              ) : (
                <span>{site.name}</span>
              )}

              {activeSiteId === site.id && editingSiteId !== site.id && (
                <div className="ml-1 flex items-center gap-1.5 border-l border-white/20 pl-2">
                  <Pencil 
                    className="h-3.5 w-3.5 cursor-pointer hover:text-white/80 transition-colors" 
                    onClick={(e) => { e.stopPropagation(); handleStartEditSite(site); }} 
                  />
                  <Trash2 
                    className="h-3.5 w-3.5 cursor-pointer text-red-200 hover:text-red-100 transition-colors" 
                    onClick={(e) => { e.stopPropagation(); handleDeleteSite(site.id); }} 
                  />
                </div>
              )}
            </button>
          ))}
          <button 
            onClick={handleAddSite}
            className="flex shrink-0 h-9 w-9 items-center justify-center rounded-full border border-border-soft bg-card-bg text-text-muted hover:border-accent-olive/50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Services Navigation */}
        <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-2 print:hidden">
          {services.map((service) => (
            <button
              key={service.id}
              onClick={() => setActiveServiceId(service.id)}
              className={cn(
                "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium uppercase transition-colors shrink-0 flex items-center gap-2",
                activeServiceId === service.id 
                  ? "border-accent-olive bg-accent-olive text-white" 
                  : "border-border-soft bg-card-bg text-text-muted hover:border-accent-olive/50"
              )}
            >
              {editingServiceId === service.id ? (
                <input 
                  autoFocus
                  value={editingServiceName} 
                  onChange={e => setEditingServiceName(e.target.value)}
                  onBlur={handleSaveServiceEdit}
                  onKeyDown={e => e.key === 'Enter' && handleSaveServiceEdit()}
                  className="bg-transparent outline-none text-white w-full min-w-[120px]"
                />
              ) : (
                <span>{service.name}</span>
              )}

              {activeServiceId === service.id && editingServiceId !== service.id && (
                <div className="ml-1 flex items-center gap-1.5 border-l border-white/20 pl-2">
                  <Pencil 
                    className="h-3.5 w-3.5 cursor-pointer hover:text-white/80 transition-colors" 
                    onClick={(e) => { e.stopPropagation(); handleStartEditService(service); }} 
                  />
                  <Trash2 
                    className="h-3.5 w-3.5 cursor-pointer text-red-200 hover:text-red-100 transition-colors" 
                    onClick={(e) => { e.stopPropagation(); handleDeleteService(service.id); }} 
                  />
                </div>
              )}
            </button>
          ))}
          <button 
            onClick={handleAddService}
            className="flex shrink-0 h-9 w-9 items-center justify-center rounded-full border border-border-soft bg-card-bg text-text-muted hover:border-accent-olive/50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="rounded-3xl border border-border-soft bg-card-bg p-6 shadow-sm">
          {/* Header Info */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-12 print:w-full print:justify-between">
              <div className="flex items-start gap-3">
                <Building2 className="mt-1 h-5 w-5 text-text-muted print:hidden" />
                <div>
                  <div className="text-xs font-medium uppercase text-text-muted">Cantiere</div>
                  <div className="font-bold uppercase text-xl">{activeSiteName}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Briefcase className="mt-1 h-5 w-5 text-text-muted print:hidden" />
                <div>
                  <div className="text-xs font-medium uppercase text-text-muted">Servizio</div>
                  <div className="font-bold uppercase text-xl">{activeServiceName}</div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 print:hidden">
              <button className="flex items-center gap-2 rounded-xl bg-[#E8F1E8] px-4 py-2 font-medium text-[#3E5B3E] hover:bg-[#d5e6d5]">
                <Download className="h-4 w-4" /> Excel
              </button>
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 rounded-xl bg-sidebar-bg px-4 py-2 font-medium text-text-main hover:bg-border-soft"
              >
                <Printer className="h-4 w-4" /> Stampa
              </button>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-accent-olive px-4 py-2 font-medium text-white hover:bg-accent-olive/90"
              >
                <UserPlus className="h-4 w-4" /> Aggiungi Operatore
              </button>
            </div>
          </div>

          {/* Data Table */}
          <div className="mb-12 overflow-x-auto print:mb-6">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-border-soft p-3 text-left font-medium text-text-muted print:border-black">Operatore</th>
                  {Array.from({ length: daysInMonth }).map((_, i) => (
                    <th key={i} className="border-b border-border-soft p-2 text-center print:border-black">
                      <div className="text-xs font-medium text-text-muted">{daysOfWeek[i]}</div>
                      <div className={cn("font-bold", isWeekend(i) ? "text-accent-olive print:text-black print:opacity-50" : "")}>
                        {i + 1}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {operators.map((op) => (
                  <tr key={op.id} className="border-b border-[#F5F5F0] hover:bg-sidebar-bg/30 print:border-black/20">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleDeleteOperator(op.id)}
                          className="text-text-muted hover:text-red-500 print:hidden"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <span className="font-medium uppercase">{op.operatorName}</span>
                      </div>
                    </td>
                    {Array.from({ length: daysInMonth }).map((_, i) => (
                      <td key={i} className="p-1 text-center">
                        <input
                          type="text"
                          className={cn(
                            "w-full min-w-[28px] h-8 text-center rounded outline-none transition-colors",
                            op.hours[i] 
                              ? "font-bold text-text-main bg-sidebar-bg focus:bg-white focus:ring-1 focus:ring-accent-olive print:bg-transparent print:ring-0" 
                              : "text-text-muted bg-transparent hover:bg-sidebar-bg/50 focus:bg-white focus:ring-1 focus:ring-accent-olive print:hidden"
                          )}
                          value={op.hours[i] !== undefined ? op.hours[i] : ''}
                          onChange={(e) => handleUpdateHours(op.id, i, e.target.value)}
                          placeholder="-"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Section */}
          <div className="mb-8 print:mb-0">
            <h3 className="mb-4 font-serif text-lg font-bold uppercase">Riepilogo Cantiere</h3>
            
            {activeServiceName.toLowerCase() !== 'extra' && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-5 print:grid-cols-5">
                <div className="rounded-2xl bg-sidebar-bg p-4 print:border print:border-black/20">
                  <div className="mb-1 text-xs font-medium uppercase text-text-muted">Ore Eseguite</div>
                  <div className="font-serif text-2xl font-bold">{formatNumber(totalHours)}</div>
                </div>
                <div className="rounded-2xl bg-sidebar-bg p-4 print:border print:border-black/20">
                  <div className="mb-1 text-xs font-medium uppercase text-text-muted">Canone Ore</div>
                  <input
                    type="number"
                    value={currentSettings.canone}
                    onChange={(e) => updateSettings('canone', e.target.value)}
                    className="w-full bg-transparent font-serif text-2xl font-bold outline-none"
                  />
                </div>
                <div className="rounded-2xl bg-sidebar-bg p-4 print:border print:border-black/20">
                  <div className="mb-1 text-xs font-medium uppercase text-text-muted">Da Decurtare</div>
                  <div className="font-serif text-2xl font-bold">0,00</div>
                </div>
                <div className="rounded-2xl bg-sidebar-bg p-4 print:border print:border-black/20">
                  <div className="mb-1 text-xs font-medium uppercase text-text-muted">Tariffa €/H</div>
                  <input
                    type="number"
                    step="0.01"
                    value={currentSettings.ord}
                    onChange={(e) => updateSettings('ord', e.target.value)}
                    className="w-full bg-transparent font-serif text-2xl font-bold outline-none"
                  />
                </div>
                <div className="rounded-2xl bg-sidebar-bg p-4 print:border print:border-black/20">
                  <div className="mb-1 text-xs font-medium uppercase text-text-muted">Valore Canone</div>
                  <div className="font-serif text-2xl font-bold">{formatNumber((parseFloat(currentSettings.canone) || 0) * (parseFloat(currentSettings.ord) || 0))}</div>
                </div>
              </div>
            )}
            
            {activeServiceName.toLowerCase() === 'extra' && (
              <div className="grid grid-cols-1 gap-4 print:grid-cols-4 md:grid-cols-4 mt-4">
                <div className="rounded-2xl bg-[#FFF4E6] p-4 text-[#A67C52] print:border print:border-black/20 print:text-black">
                  <div className="mb-1 text-xs font-medium uppercase">Extra da Ordinarie</div>
                  <div className="font-serif text-2xl font-bold">{formatNumber(oreExtraDaOrdinarie)}</div>
                </div>
                <div className="rounded-2xl bg-[#FFF4E6] p-4 text-[#A67C52] print:border print:border-black/20 print:text-black">
                  <div className="mb-1 text-xs font-medium uppercase">Ore Extra (Dirette)</div>
                  <div className="font-serif text-2xl font-bold">{formatNumber(totalHours)}</div>
                </div>
                <div className="rounded-2xl bg-[#FFF4E6] p-4 text-[#A67C52] print:border print:border-black/20 print:text-black">
                  <div className="mb-1 text-xs font-medium uppercase">Tariffa Extra €/H</div>
                  <input
                    type="number"
                    step="0.01"
                    value={currentSettings.ext}
                    onChange={(e) => updateSettings('ext', e.target.value)}
                    className="w-full bg-transparent font-serif text-2xl font-bold outline-none"
                  />
                </div>
                <div className="rounded-2xl bg-[#FFF4E6] p-4 text-[#A67C52] print:border print:border-black/20 print:text-black">
                  <div className="mb-1 text-xs font-medium uppercase">Valore Extra</div>
                  <div className="font-serif text-2xl font-bold">
                    {formatNumber((totalHours + oreExtraDaOrdinarie) * (parseFloat(currentSettings.ext) || 0))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Additional Sections - Visible only for the first service */}
          {services.length > 0 && activeServiceId === services[0].id && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 print:hidden">
              <div className="rounded-2xl border border-border-soft p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-serif font-bold uppercase">Noleggi</h3>
                <button 
                  onClick={() => setModalConfig({isOpen: true, type: 'rental'})}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-sidebar-bg text-accent-olive hover:bg-border-soft"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="flex justify-between border-b border-border-soft pb-2 text-xs font-medium text-text-muted">
                <span>Descrizione</span>
                <span>Importo (€)</span>
              </div>
              {rentals.length === 0 ? (
                <div className="py-4 text-center text-sm text-text-muted">
                  Nessuna voce — clicca + per aggiungere
                </div>
              ) : (
                <>
                  <div className="mt-3 space-y-2">
                    {rentals.map(rental => (
                      <div key={rental.id} className="flex justify-between items-center text-sm border-b border-border-soft/50 py-2 last:border-0">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleDeleteItem(rental.id, 'rental')} className="text-text-muted hover:text-red-500">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <span>{rental.description}</span>
                        </div>
                        <span className="font-medium">€ {formatNumber(parseFloat(rental.amount) || 0)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-between border-t border-border-soft pt-3 font-bold">
                    <span>TOTALE</span>
                    <span className="text-accent-olive">€ {formatNumber(totalRentals)}</span>
                  </div>
                </>
              )}
            </div>
            
            <div className="rounded-2xl border border-border-soft p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-serif font-bold uppercase">Derattizzazione</h3>
                <button 
                  onClick={() => setModalConfig({isOpen: true, type: 'deratization'})}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-sidebar-bg text-accent-olive hover:bg-border-soft"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="flex justify-between border-b border-border-soft pb-2 text-xs font-medium text-text-muted">
                <span>Descrizione</span>
                <span>Importo (€)</span>
              </div>
              {deratizations.length === 0 ? (
                <div className="py-4 text-center text-sm text-text-muted">
                  Nessuna voce — clicca + per aggiungere
                </div>
              ) : (
                <>
                  <div className="mt-3 space-y-2">
                    {deratizations.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-sm border-b border-border-soft/50 py-2 last:border-0">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleDeleteItem(item.id, 'deratization')} className="text-text-muted hover:text-red-500">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <span>{item.description}</span>
                        </div>
                        <span className="font-medium">€ {formatNumber(parseFloat(item.amount) || 0)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-between border-t border-border-soft pt-3 font-bold">
                    <span>TOTALE</span>
                    <span className="text-accent-olive">€ {formatNumber(totalDeratizations)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Generic Add Item Modal */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-card-bg p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-xl font-bold">
                Aggiungi {modalConfig.type === 'rental' ? 'Noleggio' : 'Derattizzazione'}
              </h3>
              <button 
                onClick={() => setModalConfig({isOpen: false, type: null})}
                className="rounded-full p-2 text-text-muted hover:bg-sidebar-bg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddItem}>
              <input
                type="text"
                placeholder="Descrizione (es. Furgone)"
                value={newItemDesc}
                onChange={(e) => setNewItemDesc(e.target.value)}
                className="mb-4 w-full rounded-xl border border-border-soft px-4 py-3 outline-none focus:border-accent-olive focus:ring-1 focus:ring-accent-olive"
                autoFocus
              />
              <input
                type="number"
                step="0.01"
                placeholder="Importo in € (es. 150.50)"
                value={newItemAmount}
                onChange={(e) => setNewItemAmount(e.target.value)}
                className="mb-6 w-full rounded-xl border border-border-soft px-4 py-3 outline-none focus:border-accent-olive focus:ring-1 focus:ring-accent-olive"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalConfig({isOpen: false, type: null})}
                  className="rounded-xl px-4 py-2 font-medium text-text-muted hover:bg-sidebar-bg"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={!newItemDesc.trim() || !newItemAmount.trim()}
                  className="rounded-xl bg-accent-olive px-4 py-2 font-medium text-white hover:bg-accent-olive/90 disabled:opacity-50"
                >
                  Aggiungi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Operator Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-card-bg p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-xl font-bold">Aggiungi Operatore</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-2 text-text-muted hover:bg-sidebar-bg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddOperator}>
              <input
                type="text"
                placeholder="Nome operatore (es. MARIO ROSSI)"
                value={newOperatorName}
                onChange={(e) => setNewOperatorName(e.target.value)}
                className="mb-6 w-full rounded-xl border border-border-soft px-4 py-3 outline-none focus:border-accent-olive focus:ring-1 focus:ring-accent-olive"
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 font-medium text-text-muted hover:bg-sidebar-bg"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={!newOperatorName.trim()}
                  className="rounded-xl bg-accent-olive px-4 py-2 font-medium text-white hover:bg-accent-olive/90 disabled:opacity-50"
                >
                  Aggiungi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
