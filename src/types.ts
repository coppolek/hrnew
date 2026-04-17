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
}

export interface SiteSummary {
  canoneOre: number;
  daDecurtare: number;
  tariffa: number;
  tariffaExtra: number;
}
