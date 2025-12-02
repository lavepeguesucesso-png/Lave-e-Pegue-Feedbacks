
export interface NpsCycleStats {
  npsId: string;
  title: string;
  score: number;
  zone: string;
  totalInvited: number;
  totalResponded: number;
  countPromoters: number;
  countNeutrals: number;
  countDetractors: number;
  startDate: string;
  endDate: string;
  // New Unit Metrics
  totalUnitsInvited: number;
  totalUnitsResponded: number;
}

export interface NpsRecord {
  respondentId: string;
  respondentName: string;
  score: number; // 0-10
  status: 'Promotor' | 'Neutro' | 'Detrator';
  justification: string;
  responseDate: string;
  unitId: string;
  unitName: string; // Nome fantasia
  unitCnpj: string;
  unitZone?: string; // Derived if needed, though mostly used from stats
}

export interface MeetingRecord {
  timestamp: string;
  consultant: string;
  csat: number; // 1-5
  relevance: number;
  depth: number;
  expectations: number;
  knowledge: number;
  clarity: number;
  efficacy: number;
  comment: string;
}

export interface MeetingStats {
  totalMeetings: number;
  avgCsat: number;
  topConsultant: string;
  consultantScores: { name: string; score: number; count: number }[];
  criteriaScores: { name: string; score: number }[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface ImplementationRecord {
  timestamp: string;
  name: string;
  unit: string;
  generalSat: number;

  // Training
  trainer: string;
  trainingSat: number;
  trainingEase: string;
  trainingComment: string;
  
  // Team
  teamSat: number;
  teamEase: string;
  teamComment: string;
  
  // Architect
  architectSat: number;
  architectEase: string;
  architectComment: string;
  
  // Machines
  machineSupplier: string;
  machineSat: number;
  machineEase: string;
  machineComment: string;
  
  // Vendpago
  vendpagoSat: number;
  vendpagoEase: string;
  vendpagoComment: string;

  // SULTS
  sultsSat: number;
  sultsEase: string;
  sultsComment: string;
  
  // Stone
  stoneSat: number;
  stoneEase: string;
  stoneComment: string;
  
  // Technician
  technician: string;
  technicianSat: number;
  technicianEase: string;
  technicianComment: string;
}

export interface ImplementationStats {
  totalRecords: number;
  avgGeneral: number;
  averages: {
    training: number;
    team: number;
    architect: number;
    machines: number;
    vendpago: number;
    sults: number;
    stone: number;
    technician: number;
  };
  machineSuppliers: Record<string, { avg: number; count: number }>;
}