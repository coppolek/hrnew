import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Printer, UserPlus, Trash2, Plus, Building2, Briefcase, X, Pencil, GripVertical, CheckCircle2, Clock, Upload, Loader2, Sparkles, Database, UploadCloud, Copy, ClipboardPaste, Wand2, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import { OperatorRecord } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import * as xlsx from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

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
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "whitespace-nowrap rounded-full border text-sm uppercase transition-all shrink-0 flex items-center relative group touch-none select-none",
        isActive 
          ? "border-accent-olive bg-accent-olive text-white shadow-md ring-2 ring-accent-olive ring-offset-2 ring-offset-bg-main font-bold" 
          : "border-border-soft bg-card-bg text-text-muted hover:border-accent-olive/50 hover:bg-black/5 font-medium"
      )}
    >
      <div 
        {...attributes}
        {...listeners}
        className="flex items-center justify-center p-2 cursor-grab active:cursor-grabbing hover:bg-black/10 rounded-l-full opacity-60 hover:opacity-100 transition-colors"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); onSelect(id); }}
        onPointerDown={(e) => { e.stopPropagation(); onSelect(id); }}
        className="pr-4 py-2 flex-grow h-full text-left outline-none"
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
      </button>

      {isActive && !isEditing && (onStartEdit || onDelete) && (
        <div className="ml-1 mr-2 flex items-center gap-1.5 border-l border-white/20 pl-2">
          {onStartEdit && (
            <Pencil 
              className="h-3.5 w-3.5 cursor-pointer hover:text-white/80 transition-colors pointer-events-auto" 
              onPointerDown={(e) => { e.stopPropagation(); onStartEdit(); }} 
              onClick={(e) => { e.stopPropagation(); onStartEdit(); }}
            />
          )}
          {onDelete && (
            <Trash2 
              className="h-3.5 w-3.5 cursor-pointer text-red-200 hover:text-red-100 transition-colors pointer-events-auto" 
              onPointerDown={(e) => { e.stopPropagation(); onDelete(); }}
              onClick={(e) => { e.stopPropagation(); onDelete(); }} 
            />
          )}
        </div>
      )}
    </div>
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

function SortableOperatorRow({ op, isReadOnly, daysInMonth, isWeekend, activeYear, monthIndex, handleDeleteOperator, handleUpdateHours, cn }: any) {
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
      {Array.from({ length: daysInMonth }).map((_, i) => {
        let hasMismatch = false;
        if (activeYear !== undefined && monthIndex !== undefined) {
           const wday = new Date(activeYear, monthIndex, i + 1).getDay();
           const dayKey = wday === 0 ? 'DOM' : wday === 1 ? 'LUN' : wday === 2 ? 'MAR' : wday === 3 ? 'MER' : wday === 4 ? 'GIO' : wday === 5 ? 'VEN' : 'SAB';
           
           const val = parseFloat(String(op.hours[i] || '0').replace(',', '.'));
           const parsedVal = isNaN(val) ? 0 : val;
           
           const planVal = parseFloat(String(op.basePlan?.[dayKey] || '0').replace(',', '.'));
           const parsedPlanVal = isNaN(planVal) ? 0 : planVal;

           if (parsedVal > 0 && parsedVal !== parsedPlanVal) {
              hasMismatch = true;
           }
        }

        return (
        <td key={i} className="p-1 text-center bg-card-bg">
          <input
            type="text"
            readOnly={isReadOnly}
            className={cn(
              "w-full min-w-[28px] h-8 text-center rounded outline-none transition-colors",
              op.hours[i] 
                ? (hasMismatch ? "font-bold text-text-main bg-yellow-100 focus:bg-yellow-50 focus:ring-1 focus:ring-accent-olive print:bg-yellow-100 print:ring-0" : "font-bold text-text-main bg-sidebar-bg focus:bg-white focus:ring-1 focus:ring-accent-olive print:bg-transparent print:ring-0")
                : "text-text-muted bg-transparent hover:bg-sidebar-bg/50 focus:bg-white focus:ring-1 focus:ring-accent-olive print:hidden",
              isReadOnly && "focus:ring-0 cursor-default",
              isReadOnly && op.hours[i] && !hasMismatch && "focus:bg-transparent"
            )}
            value={op.hours[i] !== undefined ? op.hours[i] : ''}
            onChange={(e) => handleUpdateHours(op.id, i, e.target.value)}
            placeholder="-"
          />
        </td>
      )})}
    </tr>
  );
}

const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
const ItalianDays = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];

const defaultProjectData = {
  sites: [
    { id: '1', name: 'SCM VILLA MONTE 57 E EX MONDADORI' },
    { id: '2', name: 'SCM VILLA MARE - VILLA VERUCCHIO' },
    { id: '3', name: 'SCM VIA EMILIA 77 ASTOLFI' },
    { id: '4', name: 'SCM VIA EMILIA 71 MARCONI E 59-61' },
    { id: '5', name: 'SCM STEELMEC - VILLA VERUCCHIO' },
    { id: '6', name: 'SCM UFFICIO FORNITORI ASTOLFI' },
    { id: '7', name: 'SCM HITECO - VILLA VERUCCHIO' },
    { id: '8', name: 'SCM EX SERGIANI - CERASOLO' },
    { id: '9', name: 'SCM FONDERIA VILLA VERUCCHIO' },
    { id: '10', name: 'SCM CSR' },
    { id: '11', name: 'SCM VIA EMILIA 61 MAGAZZINO RICAMBI' }
  ],
  services: [
    { id: '1', name: 'PULIZIE ORDINARIE' },
    { id: '2', name: 'EXTRA' }
  ],
  siteSettings: {} as Record<string, { canone: string, ord: string, ext: string, promptRules?: string }>,
  operatorStore: {
    '1_1': [
      { id: '1', operatorName: 'CONSUELO', hours: {}, basePlan: { LUN: 4, MAR: 4.5, MER: 4, GIO: 4.5, VEN: 4 } },
      { id: '2', operatorName: 'LAVINIA STEFAN', hours: {}, basePlan: { LUN: 3.5, MAR: 3.5, MER: 3.5, GIO: 3.5, VEN: 3.5 } },
      { id: '3', operatorName: 'SMATI OTHMANE', hours: {}, basePlan: { LUN: 8.5, MAR: 8.5, MER: 8.5, GIO: 8.5, VEN: 8.5 } },
      { id: '4', operatorName: 'LAVREYNUK VALENTYNA', hours: {}, basePlan: { LUN: 3.5, MAR: 5, MER: 3.5, GIO: 5, VEN: 3.5 } }
    ],
    '2_1': [
      { id: '5', operatorName: 'SEBASTIANI MARIA', hours: {}, basePlan: { LUN: 4.5, MAR: 4, MER: 4.5, GIO: 4, VEN: 4 } },
      { id: '6', operatorName: 'SEBASTIANI ORNELLA', hours: {}, basePlan: { LUN: 4.5, MAR: 4.5, MER: 4.5, GIO: 4.5, VEN: 3 } },
      { id: '7', operatorName: 'TRIPODI ADRIANA', hours: {}, basePlan: { LUN: 3, MAR: 3, MER: 3, GIO: 3, VEN: 1 } },
      { id: '8', operatorName: 'MORENO POLA', hours: {}, basePlan: { LUN: 3, MAR: 3, MER: 3, GIO: 3, VEN: 1 } },
      { id: '9', operatorName: 'MILOSEVIC GORGANA', hours: {}, basePlan: { LUN: 2.5, MAR: 2.5, MER: 2.5, GIO: 2.5, VEN: 2.5 } },
      { id: '10', operatorName: 'ANDOLFI ANNA', hours: {}, basePlan: { LUN: 4, MAR: 4, MER: 4, GIO: 4, VEN: 4 } },
      { id: '11', operatorName: 'TORRICELLI FERDINANDO', hours: {}, basePlan: { LUN: 7, MAR: 7, MER: 8, GIO: 7, VEN: 8 } }
    ],
    '3_1': [
      { id: '12', operatorName: 'ANTONACI ANNARITA', hours: {}, basePlan: { LUN: 6.5, MAR: 6.5, MER: 6.5, GIO: 6.5, VEN: 6.5 } },
      { id: '13', operatorName: 'EUSEBI STEFANIA', hours: {}, basePlan: { LUN: 5, MAR: 5, MER: 5, GIO: 5, VEN: 5 } },
      { id: '14', operatorName: 'CENNI ELISA', hours: {}, basePlan: { LUN: 6, MAR: 6, MER: 6, GIO: 6, VEN: 6 } }
    ],
    '4_1': [
      { id: '15', operatorName: 'CENNI ELISA', hours: {}, basePlan: { LUN: 0.5, MAR: 0.5, MER: 0.5, GIO: 0.5, VEN: 0.5 } },
      { id: '16', operatorName: 'GIURESCU SIMONA', hours: {}, basePlan: { LUN: 2, MAR: 4, MER: 4, GIO: 4, VEN: 2 } },
      { id: '17', operatorName: 'PORTSCH', hours: {}, basePlan: { LUN: 4, MAR: 4, MER: 4, GIO: 4, VEN: 4 } },
      { id: '18', operatorName: 'DLAIA ABDELMOULLA', hours: {}, basePlan: { LUN: 7, MAR: 7, MER: 7, GIO: 7, VEN: 7 } },
      { id: '19', operatorName: 'MOHAMED', hours: {}, basePlan: { LUN: 7, MAR: 7, MER: 7, GIO: 7, VEN: 7 } },
      { id: '20', operatorName: 'RONCHI DEBORA', hours: {}, basePlan: { LUN: 5.5, MAR: 5.5, MER: 5.5, GIO: 5.5, VEN: 5.5 } },
      { id: '21', operatorName: 'JAOUIA MALIKA', hours: {}, basePlan: { LUN: 4.5, MAR: 4.5, MER: 4.5, GIO: 4.5, VEN: 4.5 } }
    ],
    '5_1': [
      { id: '22', operatorName: 'KONIUSZKO AGNIESZKA', hours: {}, basePlan: { LUN: 6.5, MAR: 6.75, MER: 6.5, GIO: 7.5, VEN: 3 } },
      { id: '23', operatorName: 'D\'AMBROSIO MARIA', hours: {}, basePlan: { LUN: 5, MAR: 5, MER: 4, GIO: 6, VEN: 2.5 } },
      { id: '24', operatorName: 'BUGLI ROBERTA', hours: {}, basePlan: { LUN: 3, MAR: 3, MER: 3, GIO: 3, VEN: 2.75 } },
      { id: '25', operatorName: 'BRUNI DIANA', hours: {}, basePlan: { LUN: 2.75, MAR: 2.75, MER: 2.75, GIO: 2.75 } },
      { id: '26', operatorName: 'GIUSTI ROBERTO', hours: {}, basePlan: { LUN: 8, MAR: 8, MER: 8, GIO: 8, VEN: 5 } }
    ],
    '6_1': [
      { id: '27', operatorName: 'D\'AMBROSIO MARIA', hours: {}, basePlan: { LUN: 1.5, MAR: 1.5, MER: 1.5, GIO: 1.5, VEN: 0.5 } }
    ],
    '7_1': [
      { id: '28', operatorName: 'PAZZINI DEBORAH', hours: {}, basePlan: { LUN: 8, MAR: 7.5, MER: 8, GIO: 7.5, VEN: 8 } },
      { id: '29', operatorName: 'MONTINI NATALINA', hours: {}, basePlan: { LUN: 4.5, MAR: 3, MER: 4.5, GIO: 3, VEN: 4.5 } },
      { id: '30', operatorName: 'SEGNANE SOULEYMANE', hours: {}, basePlan: { LUN: 8, MAR: 7.5, MER: 8, GIO: 7.5, VEN: 8 } }
    ],
    '8_1': [
      { id: '31', operatorName: 'MILA MALASPINA', hours: {}, basePlan: { LUN: 2.5, MAR: 2.5, MER: 2.5, GIO: 2.5, VEN: 2.5 } },
      { id: '32', operatorName: 'SMATI OTHMANE', hours: {}, basePlan: { MAR: 3, GIO: 3 } }
    ],
    '9_1': [
      { id: '33', operatorName: 'LOSORBO LAURA', hours: {}, basePlan: { LUN: 2.5, MAR: 4, MER: 2.5, GIO: 4, VEN: 2.5 } },
      { id: '34', operatorName: 'DRISS', hours: {}, basePlan: { LUN: 8, MAR: 8, MER: 8, GIO: 8, VEN: 8 } }
    ],
    '10_1': [
      { id: '35', operatorName: 'JAOUIA MALIKA', hours: {}, basePlan: { LUN: 1, MER: 1, VEN: 1 } }
    ],
    '11_1': [
      { id: '36', operatorName: 'ABDEL', hours: {} }
    ]
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

    // Patch missing basePlan from defaultProjectData
    if (d.operatorStore) {
      Object.keys(d.operatorStore).forEach(key => {
        const defaultOps = defaultProjectData.operatorStore[key] || [];
        d.operatorStore[key] = d.operatorStore[key].map((op: any) => {
          const defOp = defaultOps.find((def: any) => def.operatorName.trim().toUpperCase() === op.operatorName.trim().toUpperCase());
          if (defOp && defOp.basePlan && !op.basePlan) {
            return { ...op, basePlan: defOp.basePlan };
          }
          return op;
        });
      });
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

      // Patch missing basePlan from defaultProjectData
      if (newOperatorStore) {
        Object.keys(newOperatorStore).forEach(key => {
          const defaultOps = defaultProjectData.operatorStore[key] || [];
          newOperatorStore[key] = newOperatorStore[key].map((op: any) => {
            const defOp = defaultOps.find((def: any) => def.operatorName.trim().toUpperCase() === op.operatorName.trim().toUpperCase());
            if (defOp && defOp.basePlan && !op.basePlan) {
              return { ...op, basePlan: defOp.basePlan };
            }
            return op;
          });
        });
      }

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

const parseCSVLine = (line: string, separator: string = ';'): string[] => {
  const result = [];
  let isInsideQuotes = false;
  let currentVal = '';
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
      isInsideQuotes = !isInsideQuotes;
    } else if (char === separator && !isInsideQuotes) {
      result.push(currentVal.trim());
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  result.push(currentVal.trim());
  return result;
};

const parseDeterministicCSV = (csvText: string) => {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return null;
  
  const separator = lines[0].includes(';') ? ';' : ',';
  const headers = parseCSVLine(lines[0], separator);
  
  let colGruppo = -1;
  let colLavoratore = -1;
  const dayColumns: { day: number, index: number }[] = [];
  
  headers.forEach((h, i) => {
    let hr = h.toLowerCase().replace(/['"]/g, '').trim();
    if (hr === 'gruppo') colGruppo = i;
    if (hr === 'lavoratore') colLavoratore = i;
    
    // check if it's a day, e.g. "mer 1", "gio 2", or "1", "2"
    const dayMatch = hr.match(/(?:lun|mar|mer|gio|ven|sab|dom)?\s*(\d{1,2})$/i);
    // Ignore summary columns like "Sett. 14" vs "mer 1"
    // "Sett." matches if we don't exclude it, wait: dayMatch will match "Sett. 14" -> "14"
    // So let's refine:
    if (hr.startsWith('sett.')) return; 
    
    if (dayMatch) {
       dayColumns.push({ day: parseInt(dayMatch[1], 10), index: i });
    }
  });

  if (colGruppo === -1 || colLavoratore === -1 || dayColumns.length === 0) {
      return null;
  }

  const entries: any[] = [];
  let currentCantiere = "SCONOSCIUTO";
  let currentServizio = "PULIZIE ORDINARIE";

  for (let i = 1; i < lines.length; i++) {
     const line = lines[i].trim();
     if (!line) continue;
     const row = parseCSVLine(line, separator);
     
     const rawGruppo = row[colGruppo]?.replace(/['"]/g, '').trim();
     if (rawGruppo && rawGruppo !== '') {
        const gruppoVal = rawGruppo;
        let parts = gruppoVal.split(' - ');
        if (parts.length >= 2) {
            let first = parts[0].replace(/->\s*Servizio:\s*/i, '').trim();
            if (parts.length === 2) {
               currentCantiere = first;
               currentServizio = parts[1].trim();
            } else if (parts.length >= 3) {
               currentCantiere = first + " - " + parts[1].trim();
               currentServizio = parts[parts.length-1].trim();
            }
        } else {
            currentCantiere = gruppoVal.replace(/->\s*Servizio:\s*/i, '').trim();
            currentServizio = "PULIZIE ORDINARIE";
        }
        
        let servUpper = currentServizio.toUpperCase();
        if (servUpper === 'PULIZIE' || servUpper.includes('PULIZIA') || servUpper === 'ORDINARIE' || servUpper === 'PULIZIE ORDINARIE' || servUpper === 'PAGHE') {
           currentServizio = 'PULIZIE ORDINARIE';
        } else if (servUpper.includes('EXTRA') || servUpper === 'STRAORDINARI') {
           currentServizio = 'EXTRA';
        } else {
           currentServizio = 'PULIZIE ORDINARIE';
        }
     }
     
     const rawLavoratore = row[colLavoratore]?.replace(/['"]/g, '').trim();
     if (rawLavoratore && rawLavoratore !== '') {
         const operatore = rawLavoratore;
         
         dayColumns.forEach(dc => {
             let oreValStr = row[dc.index]?.replace(/['"]/g, '').trim() || '';
             if (oreValStr) {
                let oreStr = oreValStr;
                if (oreStr.includes('/')) {
                   const stringDesc = oreStr.split('/')[1].trim();
                   oreStr = oreStr.split('/')[0].trim();
                   if (oreStr === '0:00' && stringDesc) {
                      const reason = stringDesc.toUpperCase();
                      if (reason.includes("FERI")) oreStr = "F";
                      else if (reason.includes("MALAT")) oreStr = "M";
                      else if (reason.includes("FESTIV")) oreStr = "FE";
                      else if (reason.includes("PERMESSO")) oreStr = "P";
                      else if (reason.includes("INFORT")) oreStr = "I";
                      else if (reason.includes("LEGGE 104")) oreStr = "104";
                      else oreStr = stringDesc.substring(0, 2);
                   }
                }
                
                if (oreStr.match(/^\d+:\d{2}$/)) {
                    let [h, m] = oreStr.split(':');
                    let decM = parseInt(m) / 60;
                    oreStr = (parseInt(h) + decM).toString();
                }

                if (oreStr && oreStr !== '0' && oreStr !== '0:00' && oreStr !== '0.00' && oreStr !== '0.0') {
                    entries.push({
                        cantiere: currentCantiere,
                        servizio: currentServizio,
                        operatore: operatore,
                        giorno: dc.day,
                        ore: oreStr
                    });
                }
             }
         });
     }
  }
  
  if (entries.length > 0) return { entries };
  return null;
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
      try {
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
      } catch (err: any) {
        if (err.message.includes("password")) {
          alert("ATTENZIONE: Manca la password per Supabase! Inseriscila in Impostazioni per salvare e caricare i dati.");
        }
      } finally {
        setIsLoadingDb(false);
        setIsDirty(false); // Reset dirty flag after load
      }
    };
    loadAppData();
  }, [id, activeYear, monthIndex]);

  // Auto-Save System
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
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

  const saveState = useCallback(async () => {
    if (isDirty) {
      const dataKey = `appData_${id || 'default'}_${activeYear}_${monthIndex}`;
      
      try {
        await syncToFirestore(dataKey, projectDataRef.current);
        await syncToFirestore(`app_ordCardsOrder_${id || 'default'}`, ordCardsRef.current);
        await syncToFirestore(`app_extCardsOrder_${id || 'default'}`, extCardsRef.current);

        setLastSaved(new Date());
        setIsDirty(false);
        
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2500); // clear saved notification after 2.5s
      } catch (err: any) {
        setSaveStatus('error');
      }
    }
  }, [id, activeYear, monthIndex, isDirty]);

  // Periodic Auto-save every 10 seconds
  useEffect(() => {
    const interval = setInterval(saveState, 10000);

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
  
  const [editingMainSiteId, setEditingMainSiteId] = useState<string | null>(null);
  const [editingMainSiteName, setEditingMainSiteName] = useState('');

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

  const currentSettings = siteSettings[activeSiteId] || { canone: "200", ord: "18.25", ext: "18.25", promptRules: "" };
  const updateSettings = (key: 'canone' | 'ord' | 'ext' | 'promptRules', val: string) => {
    setSiteSettings(prev => ({
      ...prev,
      [activeSiteId]: { ...currentSettings, [key]: val }
    }));
  };

  // Calculate days dynamically based on month and year
  // Get number of days in month
  const daysInMonth = new Date(activeYear, monthIndex + 1, 0).getDate();
  
  const [isConfirmFillPlanOpen, setIsConfirmFillPlanOpen] = useState(false);
  const [isConfirmClearSiteOpen, setIsConfirmClearSiteOpen] = useState(false);

  const handleClearSite = () => {
    setIsConfirmClearSiteOpen(true);
  };

  const confirmClearSite = () => {
    if (isReadOnly) return;
    setIsConfirmClearSiteOpen(false);
    
    const newStore = { ...operatorStore };
    services.forEach((service: any) => {
        const storeKey = `${activeSiteId}_${service.id}`;
        if (newStore[storeKey]) {
            newStore[storeKey] = newStore[storeKey].map((op: any) => ({ ...op, hours: {} }));
        }
    });
    setOperatorStore(newStore);
  };

  const handleAutoFillBasePlan = () => {
    setIsConfirmFillPlanOpen(true);
  };

  const confirmAutoFillBasePlan = () => {
    if (isReadOnly) return;
    setIsConfirmFillPlanOpen(false);
    
    let updatedCount = 0;
    const newOps = operators.map(op => {
      let bp = op.basePlan;
      if (!bp) {
         // Try to find the operator by name in the default project data for the CURRENT SITE first
         const currentSiteDef = defaultProjectData.sites.find(s => s.name.trim().toUpperCase() === activeSiteName.trim().toUpperCase());
         let found = false;
         if (currentSiteDef) {
             const defOpsForSite = defaultProjectData.operatorStore[`${currentSiteDef.id}_1`] || [];
             const defOpForSite = defOpsForSite.find(d => d.operatorName.trim().toUpperCase() === op.operatorName.trim().toUpperCase());
             if (defOpForSite && defOpForSite.basePlan) {
                 bp = defOpForSite.basePlan;
                 found = true;
             }
         }
         
         // If not found in current site, fallback to any site
         if (!found) {
             for (const key of Object.keys(defaultProjectData.operatorStore)) {
                const defOps = defaultProjectData.operatorStore[key] || [];
                const defOp = defOps.find(d => d.operatorName.trim().toUpperCase() === op.operatorName.trim().toUpperCase());
                if (defOp && defOp.basePlan) {
                    bp = defOp.basePlan;
                    break;
                }
             }
         }
      }

      if (!bp) return op;
      
      updatedCount++;
      const newHours = { ...op.hours };
      for (let i = 1; i <= daysInMonth; i++) {
        const dayOfWeek = new Date(activeYear, monthIndex, i).getDay(); // 0 is Sunday, 1 is Monday...
        if (dayOfWeek === 1 && bp.LUN !== undefined && bp.LUN !== "") newHours[i - 1] = String(bp.LUN);
        if (dayOfWeek === 2 && bp.MAR !== undefined && bp.MAR !== "") newHours[i - 1] = String(bp.MAR);
        if (dayOfWeek === 3 && bp.MER !== undefined && bp.MER !== "") newHours[i - 1] = String(bp.MER);
        if (dayOfWeek === 4 && bp.GIO !== undefined && bp.GIO !== "") newHours[i - 1] = String(bp.GIO);
        if (dayOfWeek === 5 && bp.VEN !== undefined && bp.VEN !== "") newHours[i - 1] = String(bp.VEN);
        if (dayOfWeek === 6 && bp.SAB !== undefined && bp.SAB !== "") newHours[i - 1] = String(bp.SAB);
        if (dayOfWeek === 0 && bp.DOM !== undefined && bp.DOM !== "") newHours[i - 1] = String(bp.DOM);
      }
      return { ...op, hours: newHours, basePlan: bp };
    });
    
    if (updatedCount > 0) {
      setOperators(newOps);
      // Optional: alert(`Piano compilato per ${updatedCount} operatori.`);
    } else {
      alert("Nessun piano base trovato per gli operatori di questo cantiere. Il piano base deve essere impostato per poter essere compilato.");
    }
  };

  const handleGenerateWithAI = async () => {
    if (isReadOnly) return;
    
    // Check if openrouter key exists
    let openRouterModel = localStorage.getItem('openRouterModel') || 'internal_gemini';
    if (openRouterModel === 'google/gemini-2.0-flash-lite-preview-02-05:free') {
        openRouterModel = 'internal_gemini';
    }
    const finalApiKey = localStorage.getItem('customGeminiApiKey');
    if (openRouterModel !== 'internal_gemini' && (!finalApiKey || !finalApiKey.startsWith('sk-or-v1'))) {
        alert("API Key OpenRouter non trovata o non valida (deve iniziare con sk-or-v1). Configurala in Impostazioni oppure scegli Google Gemini Integrato.");
        return;
    }

    setIsGeneratingAI(true);
    setGeneratingAIStatus('Elaborazione turni con AI...');

    try {
        const rules = currentSettings.promptRules;
        const currentOps = operators.map(op => ({
            id: op.id,
            nome: op.operatorName,
            basePlan: op.basePlan || {}
        }));

        let systemPrompt = `Sei un pianificatore di turni di lavorazione mensili.
Devi generare il piano ore per il cantiere "${activeSiteName}" per il mese di ${monthIndex + 1}/${activeYear}.
Mese composto da ${daysInMonth} giorni.
Restituisci l'output in formato JSON contenente un array "entries" con lo schema:
{ "entries": [ { "operatoreId": "string", "giorno": numero_da_1_a_${daysInMonth}, "ore": "stringa decimale (es. '4.5')" } ] }.
Assicurati che "operatoreId" coincida esattamente con l'ID fornito nel prompt dell'utente.
Non includere markdown, restituisci solo JSON puro.
`;

        if (rules && rules.trim()) {
            systemPrompt += `\n\nREGOLE SPECIFICHE DA RISPETTARE STRICTLY:\n${rules}\nQueste regole hanno la precedenza assoluta sui piani base stabiliti e devono essere rispettate alla lettera.`;
        }

        const daysMapping = [];
        for (let i = 1; i <= daysInMonth; i++) {
            const d = new Date(activeYear, monthIndex, i);
            const weekday = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'][d.getDay()];
            daysMapping.push(`${i}: ${weekday}`);
        }

        const basePlanEntries: any[] = [];
        currentOps.forEach(op => {
           let bp = op.basePlan;
           // Fallback to default project data if basePlan is missing
           if (!bp || Object.keys(bp).length === 0) {
                 const currentSiteDef = defaultProjectData.sites.find((s: any) => s.name.trim().toUpperCase() === activeSiteName.trim().toUpperCase());
                 let found = false;
                 if (currentSiteDef) {
                     const defOpsForSite = defaultProjectData.operatorStore[`${currentSiteDef.id}_1`] || [];
                     const defOpForSite = defOpsForSite.find((d: any) => d.operatorName.trim().toUpperCase() === op.nome.trim().toUpperCase());
                     if (defOpForSite && defOpForSite.basePlan) { bp = defOpForSite.basePlan; found = true; }
                 }
                 if (!found) {
                     for (const key of Object.keys(defaultProjectData.operatorStore)) {
                        const defOps = defaultProjectData.operatorStore[key] || [];
                        const defOp = defOps.find((d: any) => d.operatorName.trim().toUpperCase() === op.nome.trim().toUpperCase());
                        if (defOp && defOp.basePlan) { bp = defOp.basePlan; break; }
                     }
                 }
           }
           if (bp) {
               for (let i = 1; i <= daysInMonth; i++) {
                 const dayOfWeek = new Date(activeYear, monthIndex, i).getDay();
                 if (dayOfWeek === 1 && bp.LUN !== undefined && bp.LUN !== "") basePlanEntries.push({ operatoreId: op.id, giorno: i, ore: String(bp.LUN) });
                 if (dayOfWeek === 2 && bp.MAR !== undefined && bp.MAR !== "") basePlanEntries.push({ operatoreId: op.id, giorno: i, ore: String(bp.MAR) });
                 if (dayOfWeek === 3 && bp.MER !== undefined && bp.MER !== "") basePlanEntries.push({ operatoreId: op.id, giorno: i, ore: String(bp.MER) });
                 if (dayOfWeek === 4 && bp.GIO !== undefined && bp.GIO !== "") basePlanEntries.push({ operatoreId: op.id, giorno: i, ore: String(bp.GIO) });
                 if (dayOfWeek === 5 && bp.VEN !== undefined && bp.VEN !== "") basePlanEntries.push({ operatoreId: op.id, giorno: i, ore: String(bp.VEN) });
                 if (dayOfWeek === 6 && bp.SAB !== undefined && bp.SAB !== "") basePlanEntries.push({ operatoreId: op.id, giorno: i, ore: String(bp.SAB) });
                 if (dayOfWeek === 0 && bp.DOM !== undefined && bp.DOM !== "") basePlanEntries.push({ operatoreId: op.id, giorno: i, ore: String(bp.DOM) });
               }
           }
        });

        const userPrompt = `Gli operatori attivi nel cantiere sono:\n` +
           JSON.stringify(currentOps.map(op => ({ id: op.id, nome: op.nome })), null, 2) + 
           `\n\nMAPPATURA DEI GIORNI DEL MESE:\n` + daysMapping.join(', ') + 
           `\n\nPIANO BASE PRE-COMPILATO TASSATIVO (GIA' POSIZIONATO SUI GIORNI CORRETTI):\n` +
           JSON.stringify({ entries: basePlanEntries }) +
           `\n\nATTENZIONE - REGOLE DI GENERAZIONE:
1. Ti ho fornito un PIANO BASE PRE-COMPILATO sotto forma di JSON ("entries").
2. Devi ORA applicare le REGOLE SPECIFICHE (se fornite nel prompt di sistema) per AGGIUNGERE, MODIFICARE o RIMUOVERE ore a questo piano di base.
3. Se non ci sono REGOLE SPECIFICHE che alterino il piano, o per gli operatori non citati nelle regole, RESTITUISCI esattamente le stesse entries che ti ho fornito nel piano base!
4. NON scombinare i giorni: se l'operatore A lavora nei giorni 1, 3, 5 nel piano base e non ci sono regole che lo modificano, genera in output i giorni 1, 3, 5 così come sono.
5. Usa il formato {"entries": [...]}`;

        const fallbackModels = openRouterModel === 'internal_gemini' 
            ? ['internal_gemini'] 
            : [openRouterModel, 'meta-llama/llama-3.3-70b-instruct:free', 'mistralai/mistral-nemo:free', 'google/gemma-2-9b-it:free', 'nousresearch/hermes-3-llama-3.1-405b:free'];
        const uniqueModels = [...new Set(fallbackModels)];
        
        let finalResponseStr = null;
        let lastError = null;

        for (const model of uniqueModels) {
            try {
                setGeneratingAIStatus(`Contatto AI (${model === 'internal_gemini' ? 'Gemini Integrato' : (model.split('/')[1] || model)})...`);
                
                let response;
                if (model === 'internal_gemini') {
                     response = await fetch("/api/gemini", {
                         method: "POST",
                         headers: { "Content-Type": "application/json" },
                         body: JSON.stringify({
                             systemInstruction: systemPrompt,
                             contents: userPrompt,
                             model: "gemini-2.5-flash"
                         })
                     });
                     if (!response.ok) {
                         const errStr = await response.text();
                         let errObj;
                         try { errObj = JSON.parse(errStr); } catch (e) {}
                         throw new Error(errObj?.error || errStr || "Errore Google Gemini Integrato");
                     }
                     const responseData = await response.json();
                     finalResponseStr = responseData.text || "";
                } else {
                    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${finalApiKey}`,
                            "Content-Type": "application/json",
                            "HTTP-Referer": window.location.origin,
                            "X-Title": "SCM Gestione Presenze"
                        },
                        body: JSON.stringify({
                            model: model, 
                            messages: [
                                { role: "system", content: systemPrompt },
                                { role: "user", content: userPrompt }
                            ]
                        })
                    });

                    if (!response.ok) {
                        const errStr = await response.text();
                        let errObj;
                        try { errObj = JSON.parse(errStr); } catch (e) {}
                        const msg = errObj?.error?.message || errObj?.message || errStr || "Provider error";
                        throw new Error(msg);
                    }

                    const responseData = await response.json();
                    finalResponseStr = responseData.choices[0].message.content.trim() || "";
                }
                break; // Usciamo dal loop se ha successo
            } catch (e: any) {
                lastError = e;
                console.warn(`Errore con il modello ${model}:`, e.message);
                // Proviamo il prossimo modello
            }
        }

        if (!finalResponseStr) {
            throw new Error(`Tutti i modelli AI hanno fallito. Ultimo errore: ${lastError?.message}`);
        }

        let jsonStr = finalResponseStr;
        
        // Estrazione robusta del JSON dal markdown o testo
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        }
        
        // Remove trailing markdown codeblock just in case
        if (jsonStr.endsWith('\`\`\`')) {
            jsonStr = jsonStr.replace(/\`\`\`$/, '').trim();
        }

        const data = JSON.parse(jsonStr);
        
        if (data && data.entries && Array.isArray(data.entries)) {
            const newOps = operators.map(op => ({ ...op, hours: { ...op.hours } }));
            
            // svuotare il mese
            newOps.forEach(op => {
               op.hours = {};
            });

            data.entries.forEach((entry: any) => {
                const op = newOps.find(o => o.id === entry.operatoreId || String(o.operatorName).toLowerCase() === String(entry.operatoreId).toLowerCase());
                if (op && entry.giorno >= 1 && entry.giorno <= daysInMonth) {
                    op.hours[entry.giorno - 1] = String(entry.ore);
                }
            });

            setOperators(newOps);
            setGeneratingAIStatus('Completato con successo!');
        } else {
            throw new Error("Il JSON restituito non ha il formato atteso.");
        }
    } catch (e: any) {
        alert("Errore AI: " + e.message);
        setIsGeneratingAI(false);
    } finally {
        setTimeout(() => setIsGeneratingAI(false), 1500);
    }
  };

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
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [generatingAIStatus, setGeneratingAIStatus] = useState('');

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

  const handleUpdateOperatorName = (id: string, name: string) => {
    if (isReadOnly) return;
    setOperators(operators.map(op => op.id === id ? { ...op, operatorName: name } : op));
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

  const handleUpdateBasePlan = (operatorId: string, day: keyof NonNullable<OperatorRecord['basePlan']>, value: string) => {
    if (isReadOnly) return;
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;
    
    setOperators(operators.map(op => {
      if (op.id === operatorId) {
        const currentBasePlan = op.basePlan || {};
        const newBasePlan = { ...currentBasePlan } as any;
        if (value === '') {
            delete newBasePlan[day];
        } else {
            newBasePlan[day] = parseFloat(value);
        }
        return { ...op, basePlan: newBasePlan };
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

  const handleStartEditMainSite = (site: { id: string, name: string }) => {
    if (!site) return;
    setEditingMainSiteId(site.id);
    setEditingMainSiteName(site.name);
  };

  const handleSaveMainSiteEdit = () => {
    if (editingMainSiteName.trim()) {
      setSites((prev: any) => prev.map((s: any) => s.id === editingMainSiteId ? { ...s, name: editingMainSiteName.trim() } : s));
    }
    setEditingMainSiteId(null);
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
          setImportStatus('Estrazione testo dal PDF in corso...');
          const buffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
          let extractedText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
             const page = await pdf.getPage(i);
             const content = await page.getTextContent();
             const strings = content.items.map((item: any) => item.str);
             extractedText += strings.join(' ') + '\n';
          }
          fileContent = extractedText;
          mimeType = 'text/plain';
      } else {
        throw new Error("Formato non supportato. Usa CSV, PDF, XLS, o XLSX.");
      }

      let data: any = null;

      // Try deterministic parsing first for CSV/Excel
      if (mimeType !== 'application/pdf') {
          const parsed = parseDeterministicCSV(fileContent);
          if (parsed && parsed.entries.length > 0) {
              data = parsed;
          }
      }

      if (!data) {
        setImportStatus('Elaborazione intelligente AI...');
        const customKey = localStorage.getItem('customGeminiApiKey');
        const finalApiKey = customKey; // the openrouter key
        let openRouterModel = localStorage.getItem('openRouterModel') || 'meta-llama/llama-3.3-70b-instruct:free';
        if (openRouterModel === 'google/gemini-2.0-flash-lite-preview-02-05:free') {
            openRouterModel = 'meta-llama/llama-3.3-70b-instruct:free';
        }
        
        if (!finalApiKey || !finalApiKey.startsWith('sk-or-v1')) {
          throw new Error("API Key OpenRouter non trovata o non valida (deve iniziare con sk-or-v1). Per favore configurarla in Impostazioni.");
        }

        let systemPrompt = `Sei un estrattore Dati da registro presenze.
Individua i lavoratori, in che cantiere lavorano, per quale servizio (se non specificato mettili nel servizio "PULIZIE ORDINARIE"), e le loro ore giorno per giorno per il mese corrente.
Ritorna i dati in puro JSON (senza markdown blocks come \`\`\`json). Il giorno è un numero da 1 a 31. Le ore sono in formato decimale stringa (es. "4.5").
Attenzione, se ci sono lettere al posto delle ore (come 'm' per malattia o 'f' per ferie, riportali testualmente o ignora se non pertinenti al registro ore).
Esempio di output desiderato:
{
  "entries": [
    { "cantiere": "Alpha Srl", "servizio": "PULIZIE ORDINARIE", "operatore": "Mario Rossi", "giorno": 1, "ore": "4.5" }
  ]
}`;

        const siteRules = sites.map((s: any) => {
            const rules = siteSettings[s.id]?.promptRules;
            if (rules && rules.trim().length > 0) {
                return `- Cantiere "${s.name}": ${rules}`;
            }
            return null;
        }).filter(Boolean).join('\n');

        if (siteRules.length > 0) {
            systemPrompt += `\n\nREGOLE SPECIFICHE DA RISPETTARE PER I CANTIERE:\n${siteRules}\nTieni in forte considerazione queste regole quando assegni le ore o estrai i nomi per questi cantieri.`;
        }

        const fallbackModels = openRouterModel === 'internal_gemini' 
            ? ['internal_gemini'] 
            : [openRouterModel, 'meta-llama/llama-3.3-70b-instruct:free', 'mistralai/mistral-nemo:free', 'google/gemma-2-9b-it:free', 'nousresearch/hermes-3-llama-3.1-405b:free'];
        const uniqueModels = [...new Set(fallbackModels)];
        
        let finalResponseStr = null;
        let lastError = null;

        for (const model of uniqueModels) {
            try {
                setImportStatus(`Elaborazione intelligente AI (${model === 'internal_gemini' ? 'Gemini Integrato' : (model.split('/')[1] || model)})...`);
                
                let response;
                if (model === 'internal_gemini') {
                    response = await fetch("/api/gemini", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            systemInstruction: systemPrompt,
                            contents: `Dati raw da file importato:\n\n${fileContent}`,
                            model: "gemini-2.5-flash"
                        })
                    });
                    if (!response.ok) {
                        const errStr = await response.text();
                        let errObj;
                        try { errObj = JSON.parse(errStr); } catch (e) {}
                        throw new Error(errObj?.error || errStr || "Errore Google Gemini Integrato");
                    }
                    const responseData = await response.json();
                    finalResponseStr = responseData.text || "";
                } else {
                    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${finalApiKey}`,
                            "Content-Type": "application/json",
                            "HTTP-Referer": window.location.origin,
                            "X-Title": "SCM Gestione Presenze"
                        },
                        body: JSON.stringify({
                            model: model, 
                            messages: [
                                { role: "system", content: systemPrompt },
                                { role: "user", content: `Dati raw da file importato:\n\n${fileContent}` }
                            ]
                        })
                    });

                    if (!response.ok) {
                       const errStr = await response.text();
                       let errObj;
                       try { errObj = JSON.parse(errStr); } catch (e) {}
                       const msg = errObj?.error?.message || errObj?.message || errStr || "Provider error";
                       throw new Error(msg);
                    }
                    const responseData = await response.json();
                    finalResponseStr = responseData.choices[0].message.content.trim() || "";
                }
                break;
            } catch (e: any) {
                lastError = e;
                console.warn(`Errore con il modello ${model}:`, e.message);
            }
        }

        if (!finalResponseStr) {
            throw new Error(`Tutti i modelli AI hanno fallito. Ultimo errore: ${lastError?.message}`);
        }

        let jsonStr = finalResponseStr;
        
        // Remove markdown wrappers if any
        if (jsonStr.startsWith('```json')) jsonStr = jsonStr.replace(/^```json/, '');
        if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```/, '');
        if (jsonStr.endsWith('```')) jsonStr = jsonStr.replace(/```$/, '');
        
        data = JSON.parse(jsonStr.trim());
      }
      
      setImportStatus('Sincronizzazione dati in corso...');
      
      if (data.entries && Array.isArray(data.entries)) {
        // Build new state dynamically
        let currentSites = [...sites];
        let currentServices = [
          { id: '1', name: 'PULIZIE ORDINARIE' },
          { id: '2', name: 'EXTRA' }
        ];
        let currentOperatorStore = { ...operatorStore };

        data.entries.forEach((entry: any) => {
            // Find or create site
            let sSite = currentSites.find(s => s.name.toLowerCase() === entry.cantiere.toLowerCase());
            if (!sSite) {
                sSite = { id: 'import_' + Date.now() + Math.random(), name: entry.cantiere.toUpperCase() };
                currentSites.push(sSite);
            }
            // Find or create service
            let servName = entry.servizio.toUpperCase();
            if (servName === 'PULIZIE' || servName.includes('ORDINARI') || servName.includes('PAGHE') || servName === 'PULIZIA') {
                servName = 'PULIZIE ORDINARIE';
            } else if (servName.includes('EXTRA') || servName.includes('STRAORDINARI')) {
                servName = 'EXTRA';
            } else {
                servName = 'PULIZIE ORDINARIE';
            }

            let sService = currentServices.find(s => s.name === servName);
            if (!sService) {
                sService = currentServices[0];
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

  const discrepancies = useMemo(() => {
    const issues: { siteName: string, serviceName: string, days: number[] }[] = [];
    
    sites.forEach((site: any) => {
      services.forEach((service: any) => {
        const storeKey = `${site.id}_${service.id}`;
        const ops = operatorStore[storeKey] || [];
        
        const mismatchedDays: number[] = [];
        
        for (let i = 0; i < daysInMonth; i++) {
          const wday = new Date(activeYear, monthIndex, i + 1).getDay();
          const dayKey = wday === 0 ? 'DOM' : wday === 1 ? 'LUN' : wday === 2 ? 'MAR' : wday === 3 ? 'MER' : wday === 4 ? 'GIO' : wday === 5 ? 'VEN' : 'SAB';
          
          let dayMismatch = false;
          ops.forEach((op: any) => {
             const val = parseFloat(String(op.hours[i] || '0').replace(',', '.'));
             const parsedVal = isNaN(val) ? 0 : val;
             
             const planVal = parseFloat(String(op.basePlan?.[dayKey] || '0').replace(',', '.'));
             const parsedPlanVal = isNaN(planVal) ? 0 : planVal;

             if (parsedVal > 0 && parsedVal !== parsedPlanVal) {
                dayMismatch = true;
             }
          });
          
          if (dayMismatch) {
             mismatchedDays.push(i + 1);
          }
        }
        
        if (mismatchedDays.length > 0) {
           issues.push({ siteName: site.name, serviceName: service.name, days: mismatchedDays });
        }
      });
    });
    return issues;
  }, [sites, services, operatorStore, activeYear, monthIndex, daysInMonth]);

  return (
    <div className="min-h-screen bg-bg-main font-sans text-text-main">
      {discrepancies.length > 0 && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3 text-sm text-yellow-800 print:hidden flex flex-col gap-1">
          <div className="font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span>Discrepanze rilevate rispetto al piano base nel mese corrente:</span>
          </div>
          <ul className="list-disc pl-8 mt-1 space-y-0.5">
            {discrepancies.map((d, index) => (
              <li key={index} className="text-yellow-700">
                <span className="font-semibold">{d.siteName}</span> ({d.serviceName}): giorni {d.days.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}
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
                    {saveStatus === 'error' && (
                      <span className="flex items-center gap-1 text-red-500 font-medium">
                        <X className="h-3 w-3" />
                        Errore di salvataggio (DB non configurato)
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

        {/* --- PRINT ONLY LAYOUT --- */}
        <div className="hidden print:block pb-12">
          <h2 className="text-xl font-bold uppercase border-b-2 border-black pb-2 mb-6">Cantiere: {activeSiteName}</h2>
          
          {services.map((service: any) => {
            const ops = operatorStore[`${activeSiteId}_${service.id}`] || [];

            const tHours = ops.reduce((tot: number, op: any) => tot + Object.values(op.hours).reduce((s: number, hVal: any) => s + (parseFloat(hVal as string) || 0), 0), 0);

            let summary = null;
            let skipRender = false;
            
            if (service.name.toUpperCase() === 'PULIZIE ORDINARIE') {
              summary = (
                <div className="grid grid-cols-4 gap-4 mt-4 break-inside-avoid">
                  <div className="border border-black p-3 rounded">
                    <div className="text-xs uppercase font-bold mb-1">Ore Eseguite</div>
                    <div className="font-bold text-xl">{formatNumber(tHours)}</div>
                  </div>
                  <div className="border border-black p-3 rounded">
                    <div className="text-xs uppercase font-bold mb-1">Canone Ore</div>
                    <div className="font-bold text-xl">{currentSettings.canone}</div>
                  </div>
                  <div className="border border-black p-3 rounded">
                    <div className="text-xs uppercase font-bold mb-1">Tariffa €/H</div>
                    <div className="font-bold text-xl">{currentSettings.ord}</div>
                  </div>
                  <div className="border border-black p-3 rounded">
                    <div className="text-xs uppercase font-bold mb-1">Valore Canone</div>
                    <div className="font-bold text-xl">{formatNumber(tHours * (parseFloat(currentSettings.ord) || 0))}</div>
                  </div>
                </div>
              );
            } else if (service.name.toUpperCase() === 'EXTRA') {
              const ordS = services.find((s: any) => s.name.toUpperCase() === 'PULIZIE ORDINARIE');
              const ordOps = ordS ? (operatorStore[`${activeSiteId}_${ordS.id}`] || []) : [];
              const oreOrd = ordOps.reduce((tot: number, op: any) => tot + Object.values(op.hours).reduce((s: number, hVal: any) => s + (parseFloat(hVal as string) || 0), 0), 0);
              const canoneStr = currentSettings.canone.toString().replace(',', '.');
              const canoneNum = parseFloat(canoneStr) || 0;
              let oreExtraDaOrdinarie = 0;
              if (canoneNum > 0 && oreOrd > canoneNum) {
                oreExtraDaOrdinarie = oreOrd - canoneNum;
              }
              const totalValoreExtra = (tHours + oreExtraDaOrdinarie) * (parseFloat(currentSettings.ext) || 0);

              if (totalValoreExtra === 0 && ops.length === 0) {
                 skipRender = true;
              } else if (totalValoreExtra > 0 || tHours > 0 || oreExtraDaOrdinarie > 0) {
                  summary = (
                    <div className="grid grid-cols-4 gap-4 mt-4 break-inside-avoid">
                      <div className="border border-black p-3 rounded bg-orange-50">
                        <div className="text-xs uppercase font-bold mb-1">Extra da Ordinarie</div>
                        <div className="font-bold text-xl">{formatNumber(oreExtraDaOrdinarie)}</div>
                      </div>
                      <div className="border border-black p-3 rounded bg-orange-50">
                        <div className="text-xs uppercase font-bold mb-1">Ore Extra Dirette</div>
                        <div className="font-bold text-xl">{formatNumber(tHours)}</div>
                      </div>
                      <div className="border border-black p-3 rounded bg-orange-50">
                        <div className="text-xs uppercase font-bold mb-1">Tariffa Extra €/H</div>
                        <div className="font-bold text-xl">{currentSettings.ext}</div>
                      </div>
                      <div className="border border-black p-3 rounded bg-orange-50">
                        <div className="text-xs uppercase font-bold mb-1">Valore Extra</div>
                        <div className="font-bold text-xl">{formatNumber(totalValoreExtra)}</div>
                      </div>
                    </div>
                  );
              }
            }

            if (skipRender) return null;
            if (ops.length === 0 && !summary) return null;

            return (
              <div key={service.id} className="mb-12 break-inside-avoid">
                <h3 className="font-bold text-lg uppercase mb-4 py-1 px-2 rounded border border-black/20">{service.name}</h3>
                <table className="w-full border-collapse text-[11px] mb-2">
                  <thead>
                    <tr>
                      <th className="border border-black p-1 text-left font-bold w-48 truncate">Operatore</th>
                      {Array.from({ length: daysInMonth }).map((_, i) => (
                        <th key={i} className={cn("border border-black p-1 text-center font-bold w-6", isWeekend(i) && "text-gray-500")}>
                          {i+1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ops.map((op: any) => (
                      <tr key={op.id}>
                        <td className="border border-black p-1 font-medium truncate whitespace-nowrap max-w-[12rem]">{op.operatorName}</td>
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const h = op.hours[i] || '';
                          return <td key={i} className={cn("border border-black p-1 text-center font-bold", isWeekend(i) && "text-gray-500")}>{h}</td>
                        })}
                      </tr>
                    ))}
                    {ops.length > 0 && (
                      <tr className="bg-gray-100 hidden">
                        <td className="border border-black p-1 text-right font-bold uppercase text-[10px]">Totale</td>
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const wday = new Date(activeYear, monthIndex, i + 1).getDay();
                          const dayKey = wday === 0 ? 'DOM' : wday === 1 ? 'LUN' : wday === 2 ? 'MAR' : wday === 3 ? 'MER' : wday === 4 ? 'GIO' : wday === 5 ? 'VEN' : 'SAB';

                          const dayTotal = ops.reduce((sum: number, op: any) => {
                            const val = parseFloat(String(op.hours[i] || '0').replace(',', '.'));
                            return sum + (isNaN(val) ? 0 : val);
                          }, 0);
                          
                          const planTotal = ops.reduce((sum: number, op: any) => {
                            const val = parseFloat(String(op.basePlan?.[dayKey] || '0').replace(',', '.'));
                            return sum + (isNaN(val) ? 0 : val);
                          }, 0);

                          const hasMismatch = dayTotal !== planTotal && (dayTotal > 0 || planTotal > 0);

                          return (
                            <td key={i} className={cn("border border-black p-1 text-center font-bold text-[10px]", isWeekend(i) && "text-gray-500", hasMismatch && "bg-red-100 text-red-600 print:bg-red-100")}>
                               {dayTotal > 0 ? dayTotal : ''}
                            </td>
                          );
                        })}
                      </tr>
                    )}
                    {ops.length > 0 && (
                      <tr className="bg-gray-50 text-gray-500 hidden">
                        <td className="border border-black p-1 text-right font-bold uppercase text-[10px]">Tot. Pianificato</td>
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const wday = new Date(activeYear, monthIndex, i + 1).getDay();
                          const dayKey = wday === 0 ? 'DOM' : wday === 1 ? 'LUN' : wday === 2 ? 'MAR' : wday === 3 ? 'MER' : wday === 4 ? 'GIO' : wday === 5 ? 'VEN' : 'SAB';
                          
                          const dayTotal = ops.reduce((sum: number, op: any) => {
                            const val = parseFloat(String(op.basePlan?.[dayKey] || '0').replace(',', '.'));
                            return sum + (isNaN(val) ? 0 : val);
                          }, 0);
                          return (
                            <td key={i} className={cn("border border-black p-1 text-center font-bold text-[10px]", isWeekend(i) && "opacity-70")}>
                               {dayTotal > 0 ? dayTotal : ''}
                            </td>
                          );
                        })}
                      </tr>
                    )}
                    {ops.length === 0 && (
                      <tr>
                        <td colSpan={daysInMonth + 1} className="border border-black p-4 text-center italic text-gray-500">Nessun operatore inserito</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                {summary}
              </div>
            );
          })}

          {/* Noleggi & Derattizzazione layout below */}
          <div className="grid grid-cols-2 gap-8 mt-8 break-inside-avoid">
            <div>
              <h3 className="font-bold text-lg uppercase mb-2 border-b-2 border-black pb-1">Noleggi</h3>
              <table className="w-full border-collapse text-sm">
                <thead>
                   <tr className="border-b border-black">
                     <th className="text-left py-1">Descrizione</th>
                     <th className="text-right py-1">Importo (€)</th>
                   </tr>
                </thead>
                <tbody>
                  {rentals.map(r => (
                    <tr key={r.id} className="border-b border-gray-300">
                      <td className="py-1">{r.description}</td>
                      <td className="text-right py-1">€ {formatNumber(parseFloat(r.amount) || 0)}</td>
                    </tr>
                  ))}
                  {rentals.length === 0 && <tr><td colSpan={2} className="py-2 text-center italic text-gray-500">Nessuna voce</td></tr>}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                     <td className="py-2">TOTALE</td>
                     <td className="text-right py-2">€ {formatNumber(totalRentals)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div>
              <h3 className="font-bold text-lg uppercase mb-2 border-b-2 border-black pb-1">Derattizzazione</h3>
              <table className="w-full border-collapse text-sm">
                <thead>
                   <tr className="border-b border-black">
                     <th className="text-left py-1">Descrizione</th>
                     <th className="text-right py-1">Importo (€)</th>
                   </tr>
                </thead>
                <tbody>
                  {deratizations.map(d => (
                    <tr key={d.id} className="border-b border-gray-300">
                      <td className="py-1">{d.description}</td>
                      <td className="text-right py-1">€ {formatNumber(parseFloat(d.amount) || 0)}</td>
                    </tr>
                  ))}
                  {deratizations.length === 0 && <tr><td colSpan={2} className="py-2 text-center italic text-gray-500">Nessuna voce</td></tr>}
                </tbody>
                <tfoot>
                  <tr className="font-bold">
                     <td className="py-2">TOTALE</td>
                     <td className="text-right py-2">€ {formatNumber(totalDeratizations)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
        {/* --- FINE PRINT ONLY LAYOUT --- */}

        <div className="print:hidden">
          {/* Sites Navigation */}
          <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2 Touch-none-container">
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
                  {!isReadOnly && editingMainSiteId === activeSiteId ? (
                    <div className="flex items-center gap-2">
                       <input 
                         value={editingMainSiteName} 
                         onChange={(e) => setEditingMainSiteName(e.target.value)}
                         className="border-b border-accent-olive bg-transparent outline-none text-xl font-bold uppercase min-w-[200px] text-text-main"
                         autoFocus
                         onBlur={handleSaveMainSiteEdit}
                         onKeyDown={e => e.key === 'Enter' && handleSaveMainSiteEdit()}
                       />
                       <button onMouseDown={(e) => { e.preventDefault(); handleSaveMainSiteEdit(); }} onClick={handleSaveMainSiteEdit} className="text-accent-olive hover:text-accent-olive/80">
                         <CheckCircle2 className="h-5 w-5" />
                       </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <div className="font-bold uppercase text-xl">{activeSiteName}</div>
                      {!isReadOnly && (
                        <button 
                          onClick={() => handleStartEditMainSite(sites.find((s: any) => s.id === activeSiteId))}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-accent-olive print:hidden"
                          title="Modifica Nome Cantiere"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
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
                <>
                  <button 
                    onClick={handleClearSite}
                    className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 font-medium text-red-700 hover:bg-red-100 border border-red-200"
                  >
                    <Trash2 className="h-4 w-4" /> Svuota Cantiere
                  </button>
                  <button 
                    onClick={handleAutoFillBasePlan}
                    className="flex items-center gap-2 rounded-xl bg-orange-50 px-4 py-2 font-medium text-orange-700 hover:bg-orange-100 border border-orange-200"
                  >
                    <Wand2 className="h-4 w-4" /> Compila da Piano
                  </button>
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 rounded-xl bg-accent-olive px-4 py-2 font-medium text-white hover:bg-accent-olive/90"
                  >
                    <UserPlus className="h-4 w-4" /> Aggiungi Operatore
                  </button>
                  <button 
                    onClick={handleGenerateWithAI}
                    disabled={isGeneratingAI}
                    className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4" />
                    {isGeneratingAI ? 'Generazione in corso...' : 'Genera Mese AI'}
                  </button>
                </>
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
                        activeYear={activeYear}
                        monthIndex={monthIndex}
                        handleDeleteOperator={handleDeleteOperator}
                        handleUpdateHours={handleUpdateHours}
                        cn={cn}
                      />
                    ))}
                    {operators.length > 0 && (
                      <tr className="bg-sidebar-bg font-bold border-t border-border-soft print:hidden">
                        <td className="p-3 text-right uppercase text-xs text-text-muted print:text-black">Totale Ore</td>
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const wday = new Date(activeYear, monthIndex, i + 1).getDay();
                          const dayKey = wday === 0 ? 'DOM' : wday === 1 ? 'LUN' : wday === 2 ? 'MAR' : wday === 3 ? 'MER' : wday === 4 ? 'GIO' : wday === 5 ? 'VEN' : 'SAB';

                          const dayTotal = operators.reduce((sum, op) => {
                            const val = parseFloat(String(op.hours[i] || '0').replace(',', '.'));
                            return sum + (isNaN(val) ? 0 : val);
                          }, 0);
                          
                          const planTotal = operators.reduce((sum, op) => {
                            const val = parseFloat(String(op.basePlan?.[dayKey] || '0').replace(',', '.'));
                            return sum + (isNaN(val) ? 0 : val);
                          }, 0);

                          const hasMismatch = dayTotal !== planTotal && (dayTotal > 0 || planTotal > 0);

                          return (
                            <td key={i} className={cn("p-2 text-center text-text-main print:text-black", isWeekend(i) && "opacity-80", hasMismatch && "bg-red-100 text-red-600 print:bg-red-100")}>
                              {dayTotal > 0 ? dayTotal : ''}
                            </td>
                          );
                        })}
                      </tr>
                    )}
                    {operators.length > 0 && (
                      <tr className="bg-bg-main font-bold border-t border-border-soft text-text-muted print:hidden">
                        <td className="p-3 text-right uppercase text-xs text-text-muted/70">Tot. Pianificato</td>
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const wday = new Date(activeYear, monthIndex, i + 1).getDay();
                          const dayKey = wday === 0 ? 'DOM' : wday === 1 ? 'LUN' : wday === 2 ? 'MAR' : wday === 3 ? 'MER' : wday === 4 ? 'GIO' : wday === 5 ? 'VEN' : 'SAB';
                          
                          const dayTotal = operators.reduce((sum, op) => {
                            const val = parseFloat(String(op.basePlan?.[dayKey] || '0').replace(',', '.'));
                            return sum + (isNaN(val) ? 0 : val);
                          }, 0);
                          return (
                            <td key={i} className={cn("p-2 text-center opacity-70", isWeekend(i) && "opacity-50")}>
                              {dayTotal > 0 ? dayTotal : ''}
                            </td>
                          );
                        })}
                      </tr>
                    )}
                  </tbody>
                </table>
              </SortableContext>
            </DndContext>
          </div>

          {/* Base Plan Configuration Section */}
          <div className="mb-8 print:hidden">
            <h3 className="mb-4 font-serif text-lg font-bold uppercase">Configurazione Piano Settimanale Predefinito</h3>
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-border-soft overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-border-soft p-3 text-left font-medium text-text-muted w-1/4">Operatore</th>
                    <th className="border-b border-border-soft p-2 text-center font-medium text-text-muted">LUN</th>
                    <th className="border-b border-border-soft p-2 text-center font-medium text-text-muted">MAR</th>
                    <th className="border-b border-border-soft p-2 text-center font-medium text-text-muted">MER</th>
                    <th className="border-b border-border-soft p-2 text-center font-medium text-text-muted">GIO</th>
                    <th className="border-b border-border-soft p-2 text-center font-medium text-text-muted">VEN</th>
                    <th className="border-b border-border-soft p-2 text-center font-medium text-text-muted">SAB</th>
                    <th className="border-b border-border-soft p-2 text-center font-medium text-text-muted text-accent-olive">DOM</th>
                    {!isReadOnly && <th className="border-b border-border-soft p-2 text-center font-medium text-text-muted w-12">Azioni</th>}
                  </tr>
                </thead>
                <tbody>
                  {operators.map((op) => (
                    <tr key={op.id} className="group border-b border-border-soft last:border-0 hover:bg-sidebar-bg">
                      <td className="p-3 font-medium text-text-main">
                        <input
                           type="text"
                           value={op.operatorName}
                           onChange={(e) => handleUpdateOperatorName(op.id, e.target.value)}
                           disabled={isReadOnly}
                           className="w-full rounded bg-transparent p-1 font-medium text-text-main outline-none focus:bg-bg-main focus:ring-1 focus:ring-accent-olive disabled:opacity-50"
                           placeholder="Nome Operatore"
                        />
                      </td>
                      {(['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'] as const).map((day) => (
                        <td key={day} className="p-2 text-center">
                          <input
                            type="text"
                            value={op.basePlan?.[day] ?? ''}
                            onChange={(e) => handleUpdateBasePlan(op.id, day, e.target.value)}
                            disabled={isReadOnly}
                            className="w-12 rounded bg-bg-main p-1 text-center font-medium text-text-main outline-none focus:ring-1 focus:ring-accent-olive disabled:opacity-50"
                          />
                        </td>
                      ))}
                      {!isReadOnly && (
                        <td className="p-2 text-center">
                          <button
                            onClick={() => handleDeleteOperator(op.id)}
                            className="text-text-muted hover:text-red-500 rounded p-1 opacity-50 group-hover:opacity-100 transition-opacity"
                            title="Elimina Operatore"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {operators.length === 0 && (
                    <tr>
                      <td colSpan={isReadOnly ? 8 : 9} className="p-4 text-center text-text-muted">Nessun operatore configurato</td>
                    </tr>
                  )}
                </tbody>
              </table>
              {!isReadOnly && (
                <div className="mt-4 flex justify-end">
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 rounded-xl border border-border-soft bg-transparent px-4 py-2 font-medium text-text-main hover:bg-sidebar-bg transition-colors"
                  >
                    <UserPlus className="h-4 w-4" /> Aggiungi Operatore
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Prompt Rules Section */}
          <div className="mb-8 print:hidden">
            <h3 className="mb-4 font-serif text-lg font-bold uppercase">Regole del Cantiere (Prompt AI)</h3>
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-border-soft">
              <p className="text-sm text-text-muted mb-4">
                Inserisci qui le regole specifiche per questo cantiere. Questo testo verrà incluso per istruire l'AI quando genera i turni.
              </p>
              <textarea
                value={currentSettings.promptRules || ''}
                onChange={(e) => updateSettings('promptRules', e.target.value)}
                disabled={isReadOnly}
                placeholder="Esempio: L'operatore X non può fare più di 4 ore al giorno. Il cantiere deve essere pulito sempre la mattina."
                className="w-full h-32 rounded-xl border border-border-soft bg-bg-main p-4 font-medium text-text-main outline-none focus:border-accent-olive focus:ring-1 focus:ring-accent-olive disabled:opacity-50"
              />
              {!isReadOnly && (
                <div className="mt-4 flex justify-end">
                  <button 
                    onClick={handleGenerateWithAI}
                    disabled={isGeneratingAI}
                    className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-2.5 font-medium text-white hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4" />
                    {isGeneratingAI ? 'Elaborazione in corso...' : 'Invia a AI'}
                  </button>
                </div>
              )}
            </div>
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
                {!isReadOnly && (
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
                  Nessuna voce {!isReadOnly && "— clicca + per aggiungere"}
                </div>
              ) : (
                <>
                  <div className="mt-3 space-y-2">
                    {rentals.map(rental => (
                      <div key={rental.id} className="flex justify-between items-center text-sm border-b border-border-soft/50 py-2 last:border-0">
                        <div className="flex items-center gap-2">
                          {!isReadOnly && (
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
                {!isReadOnly && (
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
                  Nessuna voce {!isReadOnly && "— clicca + per aggiungere"}
                </div>
              ) : (
                <>
                  <div className="mt-3 space-y-2">
                    {deratizations.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-sm border-b border-border-soft/50 py-2 last:border-0">
                        <div className="flex items-center gap-2">
                          {!isReadOnly && (
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

      {/* AI Generate Modal */}
      {isGeneratingAI && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-6 flex h-16 w-16 animate-bounce items-center justify-center rounded-full bg-purple-100 text-purple-600">
              <Sparkles className="h-8 w-8 animate-pulse" />
            </div>
            <h3 className="mb-2 font-serif text-2xl font-bold text-gray-900">Motore AI</h3>
            <p className="text-gray-500 font-medium">{generatingAIStatus}</p>
          </div>
        </div>
      )}

      {/* ConformFillPlanModal */}
      {isConfirmClearSiteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-card-bg p-6 shadow-xl border border-border-soft">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-500">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-center font-serif text-xl font-bold mb-2">Svuota Cantiere</h3>
            <p className="text-center text-sm text-text-muted mb-6">
              Questa azione eliminerà tutte le ore inserite per questo cantiere in tutti i servizi nel mese corrente. Vuoi procedere?
            </p>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsConfirmClearSiteOpen(false)}
                className="flex-1 rounded-xl bg-sidebar-bg px-4 py-2.5 font-medium text-text-main transition-colors hover:bg-border-soft"
              >
                Annulla
              </button>
              <button 
                onClick={confirmClearSite}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 font-medium text-white transition-colors hover:bg-red-600"
              >
                Conferma
              </button>
            </div>
          </div>
        </div>
      )}

      {isConfirmFillPlanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-card-bg p-6 shadow-xl border border-border-soft">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-500">
              <Wand2 className="h-6 w-6" />
            </div>
            <h3 className="text-center font-serif text-xl font-bold mb-2">Compila da Piano</h3>
            <p className="text-center text-sm text-text-muted mb-6">
              Questa azione sovrascriverà le ore degli operatori per il mese corrente con quelle del piano base impostato. Vuoi procedere?
            </p>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsConfirmFillPlanOpen(false)}
                className="flex-1 rounded-xl bg-sidebar-bg px-4 py-2.5 font-medium text-text-main transition-colors hover:bg-border-soft"
              >
                Annulla
              </button>
              <button 
                onClick={confirmAutoFillBasePlan}
                className="flex-1 rounded-xl bg-orange-500 px-4 py-2.5 font-medium text-white transition-colors hover:bg-orange-600"
              >
                Conferma
              </button>
            </div>
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
