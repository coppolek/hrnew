export interface Project {
  id: string;
  name: string;
  description: string;
  siteCount: number;
}

export interface Site {
  id: string;
  projectId: string;
  name: string;
}

export interface Service {
  id: string;
  siteId: string;
  name: string;
}

export interface OperatorRecord {
  id: string;
  operatorName: string;
  hours: Record<number, number | string>; // day -> hours
  basePlan?: { LUN?: number | string, MAR?: number | string, MER?: number | string, GIO?: number | string, VEN?: number | string, SAB?: number | string, DOM?: number | string };
}

export interface SiteSummary {
  canoneOre: number;
  daDecurtare: number;
  tariffa: number;
  tariffaExtra: number;
}
