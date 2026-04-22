import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Printer, UserPlus, Trash2, Plus, Building2, Briefcase, X, Pencil, GripVertical, CheckCircle2, Clock, Upload, Loader2, Sparkles, Database, UploadCloud, Copy, ClipboardPaste } from 'lucide-react';
import { cn } from '../lib/utils';
import { OperatorRecord } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import * as xlsx from 'xlsx';
import { fetchFromFirestore, syncToFirestore } from '../services/db';
import {
  DndContext,

  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  rectSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableNavItem({ id, isActive, isEditing, name, editingName, setEditingName, onSaveEdit, onStartEdit, onDelete, onSelect }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(id)}
      className={cn(
        "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium uppercase transition-colors shrink-0 flex items-center gap-2 relative group touch-none select-none",
        isActive 
          ? "border-accent-olive bg-accent-olive text-white" 
          : "border-border-soft bg-card-bg text-text-muted hover:border-accent-olive/50"
      )}
      {...attributes}
      {...listeners}
    >
      {isEditing ? (
        <input 
          autoFocus
          value={editingName} 
          onChange={e => setEditingName(e.target.value)}
          onBlur={onSaveEdit}
          onKeyDown={e => e.key === 'Enter' && onSaveEdit()}
          onPointerDown={e => e.stopPropagation()}
          className="bg-transparent outline-none text-white w-full min-w-[120px]"
        />
      ) : (
        <span>{name}</span>
      )}

      {isActive && !isEditing && (onStartEdit || onDelete) && (
        <div className="ml-1 flex items-center gap-1.5 border-l border-white/20 pl-2">
          {onStartEdit && (
            <Pencil 
              className="h-3.5 w-3.5 cursor-pointer hover:text-white/80 transition-colors" 
              onPointerDown={(e) => { e.stopPropagation(); onStartEdit(); }} 
              onClick={(e) => { e.stopPropagation(); onStartEdit(); }}
            />
          )}
          {onDelete && (
            <Trash2 
              className="h-3.5 w-3.5 cursor-pointer text-red-200 hover:text-red-100 transition-colors" 
              onPointerDown={(e) => { e.stopPropagation(); onDelete(); }}
              onClick={(e) => { e.stopPropagation(); onDelete(); }} 
            />
          )}
        </div>
      )}
    </button>
  );
}

function SortableSummaryCard({ id, isReadOnly, children, className }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id, disabled: isReadOnly });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as any,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(className, "touch-none select-none relative group")}
    >
      {!isReadOnly && (
        <div 
          {...attributes} 
          {...listeners} 
          className="absolute right-2 top-2 cursor-grab active:cursor-grabbing text-text-muted hover:text-text-main opacity-20 hover:opacity-100 z-10"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      {children}
    </div>
  );
}

function SortableOperatorRow({ op, isReadOnly, daysInMonth, isWeekend, handleDeleteOperator, handleUpdateHours, cn }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: op.id, disabled: isReadOnly });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    position: 'relative' as any,
    zIndex: isDragging ? 20 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className={cn("border-b border-[#F5F5F0] hover:bg-sidebar-bg/30 print:border-black/20 bg-card-bg", isDragging ? "shadow-lg ring-1 ring-accent-olive" : "")}>
      <td className="p-3 bg-card-bg">
        <div className="flex items-center gap-3">
          {!isReadOnly && (
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-main touch-none">
              <GripVertical className="h-4 w-4" />
            </div>
          )}
          {!isReadOnly && (
            <button 
              onClick={() => handleDeleteOperator(op.id)}
              className="text-text-muted hover:text-red-500 print:hidden shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <span className="font-medium uppercase whitespace-nowrap">{op.operatorName}</span>
        </div>
      </td>
      {Array.from({ length: daysInMonth }).map((_, i) => (
        <td key={i} className="p-1 text-center bg-card-bg">
          <input
            type="text"
            readOnly={isReadOnly}
            className={cn(
              "w-full min-w-[28px] h-8 text-center rounded outline-none transition-colors",
              op.hours[i] 
                ? "font-bold text-text-main bg-sidebar-bg focus:bg-white focus:ring-1 focus:ring-accent-olive print:bg-transparent print:ring-0" 
                : "text-text-muted bg-transparent hover:bg-sidebar-bg/50 focus:bg-white focus:ring-1 focus:ring-accent-olive print:hidden",
              isReadOnly && "focus:ring-0 focus:bg-transparent cursor-default"
            )}
            value={op.hours[i] !== undefined ? op.hours[i] : ''}
            onChange={(e) => handleUpdateHours(op.id, i, e.target.value)}
            placeholder="-"
          />
        </td>
      ))}
    </tr>
  );
}

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
    { id: '2', name: 'EXTRA' }
  ],
  siteSettings: {} as Record<string, { canone: string, ord: string, ext: string }>,
  operatorStore: {
    '1_1': [{ id: '1', operatorName: 'JAOUIA MALIKA', hours: {} }]
  } as Record<string, OperatorRecord[]>,
  rentalStore: {} as Record<string, {id: string, description: string, amount: string}[]>,
  deratStore: {} as Record<string, {id: string, description: string, amount: string}[]>
};

const fetchStoredDataForMonthYear = async (projectId: string, year: number, monthIdx: number) => {
  const currentKey = `appData_${projectId}_${year}_${monthIdx}`;
  const stored = await fetchFromFirestore(currentKey);
  
  if (stored) {
    const d = stored;
    
    // Force constraint: exactly two services
    d.services = [
      { id: '1', name: 'PULIZIE ORDINARIE' },
      { id: '2', name: 'EXTRA' }
    ];

    // Silent migration for older flat arrays
    if (d.rentals && !d.rentalStore) {
        d.rentalStore = {};
        if (d.sites?.length > 0) d.rentalStore[d.sites[0].id] = d.rentals;
    }
    if (d.deratizations && !d.deratStore) {
        d.deratStore = {};
        if (d.sites?.length > 0) d.deratStore[d.sites[0].id] = d.deratizations;
    }
    return d;
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
    const prevStored = await fetchFromFirestore(prevKey);
    if (prevStored) {
      const prevData = prevStored;
      // Clone operatorStore and clear hours when inheriting
      const newOperatorStore = { ...prevData.operatorStore };
      Object.keys(newOperatorStore).forEach(k => {
        newOperatorStore[k] = newOperatorStore[k].map((op: any) => ({ ...op, hours: {} }));
      });
      
      const migratedRentalStore = prevData.rentalStore || (prevData.rentals && prevData.sites?.length > 0 ? {[prevData.sites[0].id]: prevData.rentals} : {});
      const migratedDeratStore = prevData.deratStore || (prevData.deratizations && prevData.sites?.length > 0 ? {[prevData.sites[0].id]: prevData.deratizations} : {});

      const newRentalStore: Record<string, any[]> = {};
      Object.keys(migratedRentalStore).forEach(siteId => {
         newRentalStore[siteId] = migratedRentalStore[siteId].map((item: any) => ({ ...item, id: Date.now() + Math.random().toString() }));
      });
      
      const newDeratStore: Record<string, any[]> = {};
      Object.keys(migratedDeratStore).forEach(siteId => {
         newDeratStore[siteId] = migratedDeratStore[siteId].map((item: any) => ({ ...item, id: Date.now() + Math.random().toString() }));
      });

      return {
        sites: prevData.sites || defaultProjectData.sites,
        services: prevData.services || defaultProjectData.services,
        siteSettings: prevData.siteSettings || {},
        operatorStore: newOperatorStore,
        rentalStore: newRentalStore,
        deratStore: newDeratStore
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
  const [user, setUser] = useState<{username: string, role: string} | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('appUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const currentYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();
  const currentMonth = months[currentMonthIdx];
  
  const [activeMonth, setActiveMonth] = useState(currentMonth);
  const [activeYear, setActiveYear] = useState(currentYear);
  const monthIndex = months.indexOf(activeMonth);

  const [projectData, setProjectData] = useState(defaultProjectData);
  const [isLoadingDb, setIsLoadingDb] = useState(true);

  const [ordCardsOrder, setOrdCardsOrder] = useState<string[]>(['ore', 'canone', 'tariffa', 'valore']);
  const [extCardsOrder, setExtCardsOrder] = useState<string[]>(['extra_ord', 'extra_dir', 'extra_tar', 'extra_val']);

  // Determine permissions
  const [isReadOnly, setIsReadOnly] = useState(false);
  const isPastMonth = activeYear < currentYear || (activeYear === currentYear && monthIndex < currentMonthIdx);

  const [projectName, setProjectName] = useState('SCM');
  useEffect(() => {
    fetchFromFirestore('appProjects').then(saved => {
      if (saved && user) {
        const allProjects = saved;
        const proj = allProjects.find((p: any) => p.id === id);
        if (proj) {
          setProjectName(proj.name.toUpperCase());
          if (user.role !== 'admin' && proj.permissions && proj.permissions[user.username] === 'read') {
            setIsReadOnly(true);
          } else {
            setIsReadOnly(false);
          }
        }
      }
    });
  }, [id, user]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEndSite = (event: DragEndEvent) => {
    if (isReadOnly) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSites((items: any[]) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDragEndService = (event: DragEndEvent) => {
    if (isReadOnly) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setServices((items: any[]) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDragEndOperator = (event: DragEndEvent) => {
    if (isReadOnly) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const activeIndex = operators.findIndex(op => op.id === active.id);
      const overIndex = operators.findIndex(op => op.id === over.id);
      setOperators(arrayMove(operators, activeIndex, overIndex));
    }
  };

  const handleDragEndOrd = (event: DragEndEvent) => {
    if (isReadOnly) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrdCardsOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleDragEndExt = (event: DragEndEvent) => {
    if (isReadOnly) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setExtCardsOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Reload data when active tracking changes (month or year)
  useEffect(() => {
    setIsLoadingDb(true);
    const loadAppData = async () => {
      const data = await fetchStoredDataForMonthYear(id || 'default', activeYear, monthIndex);
      setProjectData(data);

      const dbOrd = await fetchFromFirestore(`app_ordCardsOrder_${id || 'default'}`);
      if(dbOrd) { 
        // Migrate legacy array if needed
        let filteredOrd = dbOrd.filter((x: string) => x !== 'decurtare');
        setOrdCardsOrder(filteredOrd); 
      }

      const dbExt = await fetchFromFirestore(`app_extCardsOrder_${id || 'default'}`);
      if(dbExt) { setExtCardsOrder(dbExt); }
      
      setIsLoadingDb(false);
      setIsDirty(false); // Reset dirty flag after load
    };
    loadAppData();
  }, [id, activeYear, monthIndex]);

  // Auto-Save System
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const projectDataRef = useRef(projectData);
  const ordCardsRef = useRef(ordCardsOrder);
  const extCardsRef = useRef(extCardsOrder);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!isLoadingDb) {
      projectDataRef.current = projectData;
      ordCardsRef.current = ordCardsOrder;
      extCardsRef.current = extCardsOrder;
      setIsDirty(true);
      setSaveStatus('saving');
    }
  }, [projectData, ordCardsOrder, extCardsOrder, isLoadingDb]);

  const saveState = useCallback(() => {
    if (isDirty) {
      const dataKey = `appData_${id || 'default'}_${activeYear}_${monthIndex}`;
      
      syncToFirestore(dataKey, projectDataRef.current);
      syncToFirestore(`app_ordCardsOrder_${id || 'default'}`, ordCardsRef.current);
      syncToFirestore(`app_extCardsOrder_${id || 'default'}`, extCardsRef.current);

      setLastSaved(new Date());
      setIsDirty(false);
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500); // clear saved notification after 2.5s
    }
  }, [id, activeYear, monthIndex, isDirty]);

  // Periodic Auto-save every 3 seconds
  useEffect(() => {
    const interval = setInterval(saveState, 3000);

    // Save on unmount or tab close
    const handleBeforeUnload = () => {
      if (isDirty) {
        saveState();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      saveState(); // Flush any unsaved changes completely on unmount
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveState, isDirty]);

  // Derived state bindings
  const sites = projectData.sites || [];
  const services = projectData.services || [];
  const siteSettings = projectData.siteSettings || {};
  const operatorStore = projectData.operatorStore || {};
  
  const [activeSiteId, setActiveSiteId] = useState('1');
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [editingSiteName, setEditingSiteName] = useState('');

  const rentals = projectData.rentalStore?.[activeSiteId] || (projectData.rentals && sites.length > 0 && activeSiteId === sites[0].id ? projectData.rentals : []);
  const deratizations = projectData.deratStore?.[activeSiteId] || (projectData.deratizations && sites.length > 0 && activeSiteId === sites[0].id ? projectData.deratizations : []);

  // Derived setters to hook into existing functions seamlessly
  const setSites = (val: any) => setProjectData(prev => ({ ...prev, sites: typeof val === 'function' ? val(prev.sites) : val }));
  const setServices = (val: any) => setProjectData(prev => ({ ...prev, services: typeof val === 'function' ? val(prev.services) : val }));
  const setSiteSettings = (val: any) => setProjectData(prev => ({ ...prev, siteSettings: typeof val === 'function' ? val(prev.siteSettings) : val }));
  const setOperatorStore = (val: any) => setProjectData(prev => ({ ...prev, operatorStore: typeof val === 'function' ? val(prev.operatorStore) : val }));
  
  const setRentals = (val: any) => setProjectData(prev => {
     let newArr = typeof val === 'function' ? val(prev.rentalStore?.[activeSiteId] || prev.rentals || []) : val;
     return { ...prev, rentalStore: { ...prev.rentalStore, [activeSiteId]: newArr } };
  });
  
  const setDeratizations = (val: any) => setProjectData(prev => {
     let newArr = typeof val === 'function' ? val(prev.deratStore?.[activeSiteId] || prev.deratizations || []) : val;
     return { ...prev, deratStore: { ...prev.deratStore, [activeSiteId]: newArr } };
  });

  const activeSiteName = sites.find((s: any) => s.id === activeSiteId)?.name || '';

  const [activeServiceId, setActiveServiceId] = useState('1');

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
    if (isReadOnly) return;
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
    if (isReadOnly) return;
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

  const renderOrdCard = (cardId: string) => {
    switch(cardId) {
      case 'ore': return (
        <SortableSummaryCard key="ore" id="ore" isReadOnly={isReadOnly} className="rounded-2xl bg-sidebar-bg p-4 print:border print:border-black/20">
          <div className="mb-1 text-xs font-medium uppercase text-text-muted">Ore Eseguite</div>
          <div className="font-serif text-2xl font-bold">{formatNumber(totalHours)}</div>
        </SortableSummaryCard>
      );
      case 'canone': return (
        <SortableSummaryCard key="canone" id="canone" isReadOnly={isReadOnly} className="rounded-2xl bg-sidebar-bg p-4 print:border print:border-black/20">
          <div className="mb-1 text-xs font-medium uppercase text-text-muted">Canone Ore</div>
          <input
            type="number"
            value={currentSettings.canone}
            readOnly={isReadOnly}
            onChange={(e) => updateSettings('canone', e.target.value)}
            className={cn("w-full bg-transparent font-serif text-2xl font-bold outline-none", isReadOnly && "cursor-default")}
          />
        </SortableSummaryCard>
      );
      case 'tariffa': return (
        <SortableSummaryCard key="tariffa" id="tariffa" isReadOnly={isReadOnly} className="rounded-2xl bg-sidebar-bg p-4 print:border print:border-black/20">
          <div className="mb-1 text-xs font-medium uppercase text-text-muted">Tariffa €/H</div>
          <input
            type="number"
            step="0.01"
            readOnly={isReadOnly}
            value={currentSettings.ord}
            onChange={(e) => updateSettings('ord', e.target.value)}
            className={cn("w-full bg-transparent font-serif text-2xl font-bold outline-none", isReadOnly && "cursor-default")}
          />
        </SortableSummaryCard>
      );
      case 'valore': return (
        <SortableSummaryCard key="valore" id="valore" isReadOnly={isReadOnly} className="rounded-2xl bg-sidebar-bg p-4 print:border print:border-black/20">
          <div className="mb-1 text-xs font-medium uppercase text-text-muted">Valore Canone</div>
          <div className="font-serif text-2xl font-bold">{formatNumber((Math.min(totalHours, parseFloat(currentSettings.canone) || 0)) * (parseFloat(currentSettings.ord) || 0))}</div>
        </SortableSummaryCard>
      );
      default: return null;
    }
  };

  const renderExtCard = (cardId: string) => {
    switch(cardId) {
      case 'extra_ord': return (
        <SortableSummaryCard key="extra_ord" id="extra_ord" isReadOnly={isReadOnly} className="rounded-2xl bg-[#FFF4E6] p-4 text-[#A67C52] print:border print:border-black/20 print:text-black">
          <div className="mb-1 text-xs font-medium uppercase">Extra da Ordinarie</div>
          <div className="font-serif text-2xl font-bold">{formatNumber(oreExtraDaOrdinarie)}</div>
        </SortableSummaryCard>
      );
      case 'extra_dir': return (
        <SortableSummaryCard key="extra_dir" id="extra_dir" isReadOnly={isReadOnly} className="rounded-2xl bg-[#FFF4E6] p-4 text-[#A67C52] print:border print:border-black/20 print:text-black">
          <div className="mb-1 text-xs font-medium uppercase">Ore Extra (Dirette)</div>
          <div className="font-serif text-2xl font-bold">{formatNumber(totalHours)}</div>
        </SortableSummaryCard>
      );
      case 'extra_tar': return (
        <SortableSummaryCard key="extra_tar" id="extra_tar" isReadOnly={isReadOnly} className="rounded-2xl bg-[#FFF4E6] p-4 text-[#A67C52] print:border print:border-black/20 print:text-black">
          <div className="mb-1 text-xs font-medium uppercase">Tariffa Extra €/H</div>
          <input
            type="number"
            step="0.01"
            readOnly={isReadOnly}
            value={currentSettings.ext}
            onChange={(e) => updateSettings('ext', e.target.value)}
            className={cn("w-full bg-transparent font-serif text-2xl font-bold outline-none", isReadOnly && "cursor-default")}
          />
        </SortableSummaryCard>
      );
      case 'extra_val': return (
        <SortableSummaryCard key="extra_val" id="extra_val" isReadOnly={isReadOnly} className="rounded-2xl bg-[#FFF4E6] p-4 text-[#A67C52] print:border print:border-black/20 print:text-black">
          <div className="mb-1 text-xs font-medium uppercase">Valore Extra</div>
          <div className="font-serif text-2xl font-bold">{formatNumber((totalHours + oreExtraDaOrdinarie) * (parseFloat(currentSettings.ext) || 0))}</div>
        </SortableSummaryCard>
      );
      default: return null;
    }
  };

  const handleExportCSV = () => {
    let csvContent = "Cantiere,Servizio,Operatore,";
    // Header for days
    for (let i = 1; i <= daysInMonth; i++) {
        csvContent += `${i},`;
    }
    csvContent += "Totale Ore\n";
    
    sites.forEach((site: any) => {
        services.forEach((service: any) => {
            const storeKey = `${site.id}_${service.id}`;
            const ops = operatorStore[storeKey] || [];
            
            ops.forEach((op: any) => {
                let row = `"${site.name}","${service.name}","${op.operatorName}",`;
                let opTotal = 0;
                for (let i = 0; i < daysInMonth; i++) {
                    const hours = op.hours[i] || "";
                    row += `"${hours}",`;
                    const parsed = parseFloat((hours as string).replace(',', '.'));
                    if (!isNaN(parsed)) {
                        opTotal += parsed;
                    }
                }
                row += `"${formatNumber(opTotal)}"\n`;
                csvContent += row;
            });
        });
    });

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); // \uFEFF is BOM for Excel UTF-8
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${projectName.replace(/\s+/g, '_')}_${activeMonth}_${activeYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const jsonImportRef = useRef<HTMLInputElement>(null);

  const handleCopyTable = () => {
    localStorage.setItem('copiedTableData', JSON.stringify(operators));
    alert("Dati della tabella attuale copiati negli appunti (compresi i nomi degli operatori e le ore)!");
  };

  const handlePasteTable = () => {
    const data = localStorage.getItem('copiedTableData');
    if (data) {
        if(window.confirm("Vuoi incollare i dati copiati nella tabella del cantiere corrente? Verranno aggiunti in coda agli operatori attuali.")) {
           try {
             const parsed = JSON.parse(data);
             if (Array.isArray(parsed)) {
               const newOps = parsed.map((op: any) => ({...op, id: Date.now() + Math.random().toString()}));
               setProjectData(prev => {
                  const cp = {...prev};
                  const storeKey = `${activeSiteId}_${activeServiceId}`;
                  if (!cp.operatorStore) cp.operatorStore = {};
                  if (!cp.operatorStore[storeKey]) cp.operatorStore[storeKey] = [];
                  cp.operatorStore[storeKey] = [...cp.operatorStore[storeKey], ...newOps];
                  return cp;
               });
             }
           } catch {
             alert('Errore lettura dati. Gli appunti sono danneggiati.');
           }
        }
    } else {
        alert("Nessun dato copiato negli appunti.");
    }
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `backup_${projectName.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const raw = event.target?.result;
            if (typeof raw === 'string') {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object' && parsed.sites && parsed.services) {
                    if (window.confirm("ATTENZIONE: Sei sicuro di voler sovrascrivere tutti i dati di questo progetto con questo backup? L'operazione è irreversibile.")) {
                        setProjectData(parsed);
                        alert("Backup dati importato con successo!");
                    }
                } else {
                  throw new Error("Struttura progetto non valida.");
                }
            }
        } catch (err) {
            alert("Errore: il file selezionato non è un backup JSON valido o è danneggiato.");
        }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAIImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    setImportStatus('Analisi del file in corso...');

    try {
      let fileContent = '';
      let mimeType = 'text/plain';

      if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        fileContent = await file.text();
      } else if (file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
        const buffer = await file.arrayBuffer();
        const workbook = xlsx.read(buffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        fileContent = xlsx.utils.sheet_to_csv(firstSheet);
      } else if (file.name.endsWith('.pdf')) {
          setImportStatus('Lettura PDF in corso...');
          // Reads file to base64
          const buffer = await file.arrayBuffer();
          const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
          fileContent = base64;
          mimeType = 'application/pdf';
      } else {
        throw new Error("Formato non supportato. Usa CSV, PDF, XLS, o XLSX.");
      }

      setImportStatus('Elaborazione intelligente AI...');
      const fallbackKey = typeof process !== 'undefined' && process.env ? process.env.GEMINI_API_KEY : undefined;
      const customKey = localStorage.getItem('customGeminiApiKey');
      const finalApiKey = customKey || fallbackKey;
      
      if (!finalApiKey) {
        throw new Error("API Key Gemini non trovata. Per favore inseriscila nella pagina Impostazioni.");
      }
      
      const ai = new GoogleGenAI({ apiKey: finalApiKey });
      // Build exactly the contents parts based on Mimetype
      const parts = [];
      if (mimeType === 'application/pdf') {
          parts.push({ inlineData: { data: fileContent, mimeType: 'application/pdf' } });
      } else {
          parts.push({ text: `Dati raw da file importato:\n\n${fileContent}` });
      }

      parts.push({
        text: `Questo è un registro presenze/ore dei lavoratori. 
Individua i lavoratori, in che cantiere lavorano, per quale servizio (se non specificato mettili nel servizio "PULIZIE ORDINARIE"), e le loro ore giorno per giorno per il mese corrente.
Ritorna i dati in JSON. Il giorno è un numero da 1 a 31. Le ore sono in formato decimale.
Attenzione, se ci sono lettere al posto delle ore (come 'm' per malattia o 'f' per ferie, riportali testualmente o ignora se non pertinenti al registro ore).

Esempio di output desiderato:
{
  "entries": [
    { "cantiere": "Alpha Srl", "servizio": "PULIZIE ORDINARIE", "operatore": "Mario Rossi", "giorno": 1, "ore": "4.5" }
  ]
}`
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: { parts: parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              entries: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    cantiere: { type: Type.STRING },
                    servizio: { type: Type.STRING },
                    operatore: { type: Type.STRING },
                    giorno: { type: Type.INTEGER },
                    ore: { type: Type.STRING }
                  },
                  required: ["cantiere", "servizio", "operatore", "giorno", "ore"]
                }
              }
            },
            required: ["entries"]
          }
        }
      });

      const jsonStr = response.text?.trim() || "";
      const data = JSON.parse(jsonStr);
      
      setImportStatus('Sincronizzazione dati in corso...');
      
      if (data.entries && Array.isArray(data.entries)) {
        // Build new state dynamically
        let currentSites = [...sites];
        let currentServices = [...services];
        let currentOperatorStore = { ...operatorStore };

        data.entries.forEach((entry: any) => {
            // Find or create site
            let sSite = currentSites.find(s => s.name.toLowerCase() === entry.cantiere.toLowerCase());
            if (!sSite) {
                sSite = { id: 'import_' + Date.now() + Math.random(), name: entry.cantiere.toUpperCase() };
                currentSites.push(sSite);
            }
            // Find or create service
            let sService = currentServices.find(s => s.name.toLowerCase() === entry.servizio.toLowerCase());
            if (!sService) {
                sService = { id: 'import_' + Date.now() + Math.random(), name: entry.servizio.toUpperCase() };
                currentServices.push(sService);
            }

            const storeKey = `${sSite.id}_${sService.id}`;
            if (!currentOperatorStore[storeKey]) currentOperatorStore[storeKey] = [];
            
            // Find or create operator
            let ops = currentOperatorStore[storeKey];
            let sOp = ops.find((o: any) => o.operatorName.toLowerCase() === entry.operatore.toLowerCase());
            if (!sOp) {
                sOp = { id: 'import_' + Date.now() + Math.random(), operatorId: 'ai_import', operatorName: entry.operatore.toUpperCase(), hours: {} };
                ops.push(sOp);
            }

            if (entry.giorno >= 1 && entry.giorno <= daysInMonth) {
               sOp.hours[entry.giorno - 1] = entry.ore;
            }
        });

        // Trigger updates properly
        setProjectData(prev => ({
            ...prev,
            sites: currentSites,
            services: currentServices,
            operatorStore: currentOperatorStore
        }));
      }

      setImportStatus('Completato. Rendi il file ora.');
      setTimeout(() => { setIsImportModalOpen(false); }, 1500);

    } catch (err: any) {
      console.error(err);
      alert(`Errore durante l'importazione: ${err.message}`);
    } finally {
      setImportLoading(false);
      setImportStatus('');
      if (e.target) e.target.value = '';
    }
  };

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
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-xl font-bold uppercase">{projectName}</h1>
                {isReadOnly && (
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600 border border-blue-100">
                    Sola Lettura
                  </span>
                )}
                {!isReadOnly && (
                  <div className="ml-4 flex items-center gap-1.5 text-xs">
                    {saveStatus === 'saving' && (
                      <span className="flex items-center gap-1 text-text-muted">
                        <Clock className="h-3 w-3 animate-spin duration-2000" />
                        Salvataggio...
                      </span>
                    )}
                    {saveStatus === 'saved' && (
                      <span className="flex items-center gap-1 text-accent-olive">
                        <CheckCircle2 className="h-3 w-3" />
                        Salvato
                      </span>
                    )}
                  </div>
                )}
              </div>
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
        <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 print:hidden Touch-none-container">
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEndSite}
          >
            <SortableContext items={sites.map((s: any) => s.id)} strategy={horizontalListSortingStrategy}>
              {sites.map((site: any) => (
                <SortableNavItem
                  key={site.id}
                  id={site.id}
                  name={site.name}
                  isActive={activeSiteId === site.id}
                  isEditing={!isReadOnly && editingSiteId === site.id}
                  editingName={editingSiteName}
                  setEditingName={setEditingSiteName}
                  onSaveEdit={handleSaveSiteEdit}
                  onStartEdit={() => !isReadOnly && handleStartEditSite(site)}
                  onDelete={() => !isReadOnly && handleDeleteSite(site.id)}
                  onSelect={setActiveSiteId}
                />
              ))}
            </SortableContext>
          </DndContext>
          {!isReadOnly && (
            <button 
              onClick={handleAddSite}
              className="flex shrink-0 h-9 w-9 items-center justify-center rounded-full border border-border-soft bg-card-bg text-text-muted hover:border-accent-olive/50"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Services Navigation */}
        <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-2 print:hidden Touch-none-container">
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEndService}
          >
            <SortableContext items={services.map((s: any) => s.id)} strategy={horizontalListSortingStrategy}>
              {services.map((service: any) => (
                <SortableNavItem
                  key={service.id}
                  id={service.id}
                  name={service.name}
                  isActive={activeServiceId === service.id}
                  isEditing={false}
                  onSelect={setActiveServiceId}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        {/* Main Content Area */}
        <div className="rounded-3xl border border-border-soft bg-card-bg p-6 shadow-sm relative">
          {isLoadingDb && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-card-bg/80 backdrop-blur-sm rounded-3xl">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-accent-olive" />
                <p className="text-sm font-medium text-text-muted">Sincronizzazione in corso...</p>
              </div>
            </div>
          )}
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
              <input 
                type="file" 
                ref={jsonImportRef} 
                className="hidden" 
                accept=".json"
                onChange={handleImportJSON}
              />
              {!isReadOnly && (
                <>
                  <button 
                    onClick={handleCopyTable}
                    className="flex shrink-0 items-center justify-center h-10 w-10 rounded-xl bg-sidebar-bg text-text-main hover:bg-border-soft"
                    title="Copia Tabella"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={handlePasteTable}
                    className="flex shrink-0 items-center justify-center h-10 w-10 rounded-xl bg-sidebar-bg text-text-main hover:bg-border-soft"
                    title="Incolla Tabella"
                  >
                    <ClipboardPaste className="h-4 w-4" />
                  </button>
                </>
              )}
              <button 
                onClick={() => jsonImportRef.current?.click()}
                className="flex items-center gap-2 rounded-xl bg-sidebar-bg px-4 py-2 font-medium text-text-main hover:bg-border-soft"
                title="Importa Backup JSON"
              >
                <UploadCloud className="h-4 w-4" /> Importa Dati
              </button>
              <button 
                onClick={handleExportJSON}
                className="flex items-center gap-2 rounded-xl bg-sidebar-bg px-4 py-2 font-medium text-text-main hover:bg-border-soft"
                title="Esporta Backup JSON"
              >
                <Database className="h-4 w-4" /> Esporta
              </button>
              <button 
                onClick={handleExportCSV}
                className="flex items-center gap-2 rounded-xl bg-[#E8F1E8] px-4 py-2 font-medium text-[#3E5B3E] hover:bg-[#d5e6d5]"
              >
                <Download className="h-4 w-4" /> Excel
              </button>
              <button 
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-purple-50 px-4 py-2 font-medium text-purple-700 hover:bg-purple-100 border border-purple-200"
              >
                <Sparkles className="h-4 w-4" /> Importa con AI
              </button>
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 rounded-xl bg-sidebar-bg px-4 py-2 font-medium text-text-main hover:bg-border-soft"
              >
                <Printer className="h-4 w-4" /> Stampa
              </button>
              {!isReadOnly && (
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 rounded-xl bg-accent-olive px-4 py-2 font-medium text-white hover:bg-accent-olive/90"
                >
                  <UserPlus className="h-4 w-4" /> Aggiungi Operatore
                </button>
              )}
            </div>
          </div>

          {/* AI Import Modal */}
          {isImportModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-3xl bg-white shadow-lg border border-border-soft overflow-hidden">
                <div className="flex items-center justify-between border-b border-border-soft px-6 py-4 bg-purple-50">
                  <h3 className="font-serif text-lg font-bold flex items-center gap-2 text-purple-900">
                    <Sparkles className="h-5 w-5" /> Importazione Intelligente
                  </h3>
                  <button onClick={() => !importLoading && setIsImportModalOpen(false)} className="rounded-full p-2 hover:bg-white/50 text-purple-700">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-6">
                  <p className="text-sm text-text-muted mb-6">
                    Carica un file Excel (.xls, .xlsx), CSV, TXT o un PDF. L'Intelligenza Artificiale estrarrà automaticamente gli operatori, i cantieri, i servizi e le ore lavorate per mese corrente!
                  </p>
                  
                  {!importLoading ? (
                    <div className="mt-4 border-2 border-dashed border-purple-200 rounded-2xl p-8 text-center hover:bg-purple-50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-10 w-10 text-purple-400 mx-auto mb-3" />
                      <p className="font-medium text-purple-900">Clicca per selezionare un file</p>
                      <p className="text-xs text-purple-600 mt-1">.csv, .txt, .xls, .xlsx, .pdf</p>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept=".csv,.txt,.xls,.xlsx,.pdf"
                        onChange={handleAIImport}
                      />
                    </div>
                  ) : (
                    <div className="mt-4 py-8 text-center">
                      <Loader2 className="h-10 w-10 animate-spin text-purple-600 mx-auto mb-4" />
                      <p className="font-medium text-purple-900">{importStatus}</p>
                      <p className="text-xs text-purple-600 mt-2">L'operazione potrebbe richiedere alcuni secondi...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Data Table */}
          <div className="mb-12 overflow-x-auto print:mb-6">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndOperator}>
              <SortableContext items={operators.map(op => op.id)} strategy={verticalListSortingStrategy}>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="border-b border-border-soft p-3 text-left font-medium text-text-muted print:border-black">Operatore</th>
                      {Array.from({ length: daysInMonth }).map((_, i) => (
                        <th key={i} className="border-b border-border-soft p-2 text-center print:border-black min-w-[32px]">
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
                      <SortableOperatorRow 
                        key={op.id}
                        op={op}
                        isReadOnly={isReadOnly}
                        daysInMonth={daysInMonth}
                        isWeekend={isWeekend}
                        handleDeleteOperator={handleDeleteOperator}
                        handleUpdateHours={handleUpdateHours}
                        cn={cn}
                      />
                    ))}
                  </tbody>
                </table>
              </SortableContext>
            </DndContext>
          </div>

          {/* Summary Section */}
          <div className="mb-8 print:mb-0">
            <h3 className="mb-4 font-serif text-lg font-bold uppercase">Riepilogo Cantiere</h3>
            
            {activeServiceName.toLowerCase() !== 'extra' && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndOrd}>
                <SortableContext items={ordCardsOrder} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-5 print:grid-cols-5">
                    {ordCardsOrder.map(renderOrdCard)}
                  </div>
                </SortableContext>
              </DndContext>
            )}
            
            {activeServiceName.toLowerCase() === 'extra' && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndExt}>
                <SortableContext items={extCardsOrder} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-1 gap-4 print:grid-cols-4 md:grid-cols-4 mt-4">
                    {extCardsOrder.map(renderExtCard)}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* Additional Sections - Visible only for the first service */}
          {services.length > 0 && activeServiceId === services[0].id && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 print:hidden">
              <div className="rounded-2xl border border-border-soft p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-serif font-bold uppercase">Noleggi</h3>
                {!isReadOnly && !isPastMonth && (
                  <button 
                    onClick={() => setModalConfig({isOpen: true, type: 'rental'})}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-sidebar-bg text-accent-olive hover:bg-border-soft"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex justify-between border-b border-border-soft pb-2 text-xs font-medium text-text-muted">
                <span>Descrizione</span>
                <span>Importo (€)</span>
              </div>
              {rentals.length === 0 ? (
                <div className="py-4 text-center text-sm text-text-muted">
                  Nessuna voce {(!isReadOnly && !isPastMonth) && "— clicca + per aggiungere"}
                </div>
              ) : (
                <>
                  <div className="mt-3 space-y-2">
                    {rentals.map(rental => (
                      <div key={rental.id} className="flex justify-between items-center text-sm border-b border-border-soft/50 py-2 last:border-0">
                        <div className="flex items-center gap-2">
                          {(!isReadOnly && !isPastMonth) && (
                            <button onClick={() => handleDeleteItem(rental.id, 'rental')} className="text-text-muted hover:text-red-500">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
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
                {!isReadOnly && !isPastMonth && (
                  <button 
                    onClick={() => setModalConfig({isOpen: true, type: 'deratization'})}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-sidebar-bg text-accent-olive hover:bg-border-soft"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex justify-between border-b border-border-soft pb-2 text-xs font-medium text-text-muted">
                <span>Descrizione</span>
                <span>Importo (€)</span>
              </div>
              {deratizations.length === 0 ? (
                <div className="py-4 text-center text-sm text-text-muted">
                  Nessuna voce {(!isReadOnly && !isPastMonth) && "— clicca + per aggiungere"}
                </div>
              ) : (
                <>
                  <div className="mt-3 space-y-2">
                    {deratizations.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-sm border-b border-border-soft/50 py-2 last:border-0">
                        <div className="flex items-center gap-2">
                          {(!isReadOnly && !isPastMonth) && (
                            <button onClick={() => handleDeleteItem(item.id, 'deratization')} className="text-text-muted hover:text-red-500">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
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
