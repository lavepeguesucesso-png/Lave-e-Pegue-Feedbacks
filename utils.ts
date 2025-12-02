
import { NpsRecord, NpsCycleStats, MeetingRecord, MeetingStats, ImplementationRecord, ImplementationStats } from './types';

// Helper to clean quotes
const clean = (val: string) => {
    if (!val) return '';
    if (val.startsWith('"') && val.endsWith('"')) {
        return val.slice(1, -1).replace(/""/g, '"');
    }
    return val;
};

// Simple CSV parser that handles quoted values properly
export const parseCSV = (csvText: string): { stats: NpsCycleStats | null, records: NpsRecord[] } => {
  const lines = csvText.trim().split('\n');
  const records: NpsRecord[] = [];
  let stats: NpsCycleStats | null = null;
  
  const uniqueUnitsInvited = new Set<string>();
  const uniqueUnitsResponded = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const rowValues: string[] = [];
    let inQuote = false;
    let currentVal = '';

    for (let charIndex = 0; charIndex < line.length; charIndex++) {
        const char = line[charIndex];
        if (char === '"') {
            inQuote = !inQuote;
        } else if (char === ',' && !inQuote) {
            rowValues.push(currentVal.trim());
            currentVal = '';
            continue;
        }
        currentVal += char;
    }
    rowValues.push(currentVal.trim());

    if (rowValues.length < 20) continue;

    if (!stats) {
        try {
            stats = {
                npsId: clean(rowValues[0]),
                title: clean(rowValues[1]),
                score: parseFloat(clean(rowValues[2]).replace(',', '.')), 
                zone: clean(rowValues[3]),
                totalInvited: parseInt(clean(rowValues[4])) || 0,
                totalResponded: parseInt(clean(rowValues[5])) || 0,
                countDetractors: parseInt(clean(rowValues[6])) || 0,
                countNeutrals: parseInt(clean(rowValues[7])) || 0,
                countPromoters: parseInt(clean(rowValues[8])) || 0,
                startDate: clean(rowValues[9]),
                endDate: clean(rowValues[10]),
                totalUnitsInvited: 0, 
                totalUnitsResponded: 0 
            };
        } catch (e) {
            console.warn("Error parsing stats", e);
        }
    }

    try {
        const individualScoreStr = clean(rowValues[14]);
        const unitId = clean(rowValues[18]);
        
        if (unitId) {
            uniqueUnitsInvited.add(unitId);
        }

        let score = NaN;
        if (individualScoreStr !== '') {
            score = parseInt(individualScoreStr);
            if (unitId) {
                uniqueUnitsResponded.add(unitId);
            }
        }

        let status: 'Promotor' | 'Neutro' | 'Detrator' = 'Neutro';
        const rawStatus = clean(rowValues[15]);
        
        if (rawStatus) {
             if (rawStatus.toLowerCase().includes('promotor')) status = 'Promotor';
             else if (rawStatus.toLowerCase().includes('detrator')) status = 'Detrator';
             else status = 'Neutro';
        }

        if (clean(rowValues[13]) || clean(rowValues[19])) {
            records.push({
                respondentId: clean(rowValues[12]),
                respondentName: clean(rowValues[13]),
                score: score,
                status: status,
                justification: clean(rowValues[16]),
                responseDate: clean(rowValues[17]),
                unitId: unitId,
                unitName: clean(rowValues[19]),
                unitCnpj: clean(rowValues[21]),
                unitZone: clean(rowValues[23])
            });
        }
    } catch (e) {
        console.warn(`Failed to parse line ${i}`, e);
    }
  }

  if (stats) {
      stats.totalUnitsInvited = uniqueUnitsInvited.size;
      stats.totalUnitsResponded = uniqueUnitsResponded.size;
  }

  return { stats, records };
};

export const parseMeetingCSV = (csvText: string): { records: MeetingRecord[], stats: MeetingStats } => {
    const lines = csvText.trim().split('\n');
    const records: MeetingRecord[] = [];
    
    const mapLikert = (val: string): number => {
        val = val.toLowerCase();
        if (val.includes('concordo totalmente')) return 5;
        if (val.includes('concordo') && !val.includes('totalmente')) return 4;
        if (val.includes('neutro')) return 3;
        if (val.includes('discordo') && !val.includes('totalmente')) return 2;
        if (val.includes('discordo totalmente')) return 1;
        return 0;
    };

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const rowValues: string[] = [];
        let inQuote = false;
        let currentVal = '';

        for (let charIndex = 0; charIndex < line.length; charIndex++) {
            const char = line[charIndex];
            if (char === '"') inQuote = !inQuote;
            else if (char === ',' && !inQuote) {
                rowValues.push(currentVal.trim());
                currentVal = '';
                continue;
            }
            currentVal += char;
        }
        rowValues.push(currentVal.trim());

        if (rowValues.length < 10) continue;

        try {
            records.push({
                timestamp: clean(rowValues[0]),
                consultant: clean(rowValues[1]),
                csat: parseInt(clean(rowValues[2])) || 0,
                relevance: mapLikert(clean(rowValues[3])),
                depth: mapLikert(clean(rowValues[4])),
                expectations: mapLikert(clean(rowValues[5])),
                knowledge: mapLikert(clean(rowValues[6])),
                clarity: mapLikert(clean(rowValues[7])),
                efficacy: mapLikert(clean(rowValues[8])),
                comment: clean(rowValues[9])
            });
        } catch (e) {
            console.warn(`Failed to parse meeting line ${i}`, e);
        }
    }

    const totalMeetings = records.length;
    const avgCsat = totalMeetings > 0 ? records.reduce((sum, r) => sum + r.csat, 0) / totalMeetings : 0;

    const consultantMap = new Map<string, { sum: number, count: number }>();
    records.forEach(r => {
        if (!r.consultant) return;
        const entry = consultantMap.get(r.consultant) || { sum: 0, count: 0 };
        entry.sum += r.csat;
        entry.count += 1;
        consultantMap.set(r.consultant, entry);
    });

    const consultantScores = Array.from(consultantMap.entries()).map(([name, data]) => ({
        name,
        score: data.sum / data.count,
        count: data.count
    })).sort((a, b) => b.score - a.score);

    const topConsultant = consultantScores.length > 0 ? consultantScores[0].name : 'N/A';

    const criteriaSums = { relevance: 0, depth: 0, expectations: 0, knowledge: 0, clarity: 0, efficacy: 0 };
    records.forEach(r => {
        criteriaSums.relevance += r.relevance;
        criteriaSums.depth += r.depth;
        criteriaSums.expectations += r.expectations;
        criteriaSums.knowledge += r.knowledge;
        criteriaSums.clarity += r.clarity;
        criteriaSums.efficacy += r.efficacy;
    });

    const criteriaScores = [
        { name: 'Relevância', score: totalMeetings ? criteriaSums.relevance / totalMeetings : 0 },
        { name: 'Profundidade', score: totalMeetings ? criteriaSums.depth / totalMeetings : 0 },
        { name: 'Expectativa', score: totalMeetings ? criteriaSums.expectations / totalMeetings : 0 },
        { name: 'Conhecimento', score: totalMeetings ? criteriaSums.knowledge / totalMeetings : 0 },
        { name: 'Clareza', score: totalMeetings ? criteriaSums.clarity / totalMeetings : 0 },
        { name: 'Eficácia', score: totalMeetings ? criteriaSums.efficacy / totalMeetings : 0 },
    ];

    return { records, stats: { totalMeetings, avgCsat, topConsultant, consultantScores, criteriaScores } };
};

export const parseImplementationCSV = (csvText: string): { records: ImplementationRecord[], stats: ImplementationStats | null } => {
    const lines = csvText.trim().split('\n');
    const records: ImplementationRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const rowValues: string[] = [];
        let inQuote = false;
        let currentVal = '';

        for (let charIndex = 0; charIndex < line.length; charIndex++) {
            const char = line[charIndex];
            if (char === '"') inQuote = !inQuote;
            else if (char === ',' && !inQuote) {
                rowValues.push(currentVal.trim());
                currentVal = '';
                continue;
            }
            currentVal += char;
        }
        rowValues.push(currentVal.trim());

        if (rowValues.length < 25) continue; 

        try {
            const getVal = (idx: number) => clean(rowValues[idx] || '');
            const getNum = (idx: number) => parseInt(getVal(idx)) || 0;

            const record: ImplementationRecord = {
                timestamp: getVal(0),
                name: getVal(1),
                unit: getVal(2),
                generalSat: getNum(3),
                
                // Training (Col 4, 5, 6, 7)
                trainer: getVal(4),
                trainingSat: getNum(5),
                trainingEase: getVal(6),
                trainingComment: getVal(7),

                // Team (Col 8, 9, 10)
                teamSat: getNum(8),
                teamEase: getVal(9),
                teamComment: getVal(10),

                // Architect (Col 11, 12, 13)
                architectSat: getNum(11),
                architectEase: getVal(12),
                architectComment: getVal(13),

                // Machines (Col 14, 15, 16, 17)
                machineSupplier: getVal(14),
                machineSat: getNum(15),
                machineEase: getVal(16),
                machineComment: getVal(17),

                // Vendpago (Col 18, 19, 20)
                vendpagoSat: getNum(18),
                vendpagoEase: getVal(19),
                vendpagoComment: getVal(20),

                // SULTS (Col 21, 22, 23)
                sultsSat: getNum(21),
                sultsEase: getVal(22),
                sultsComment: getVal(23),

                // Stone (Col 24, 25, 26)
                stoneSat: getNum(24),
                stoneEase: getVal(25),
                stoneComment: getVal(26),

                // Technician (Col 27, 28, 29, 30)
                technician: getVal(27),
                technicianSat: getNum(28),
                technicianEase: getVal(29),
                technicianComment: getVal(30),
            };
            
            records.push(record);
        } catch (e) {
            console.warn(`Failed to parse implementation line ${i}`, e);
        }
    }
    
    if (records.length === 0) return { records: [], stats: null };

    // Calculate Stats
    const totalRecords = records.length;
    const avg = (key: keyof ImplementationRecord) => {
        const valid = records.filter(r => (r[key] as number) > 0);
        return valid.length ? valid.reduce((acc, r) => acc + (r[key] as number), 0) / valid.length : 0;
    };
    
    const machineSuppliers: Record<string, { sum: number, count: number }> = {};

    records.forEach(r => {
        if (r.machineSupplier) {
             if (!machineSuppliers[r.machineSupplier]) machineSuppliers[r.machineSupplier] = { sum: 0, count: 0 };
             machineSuppliers[r.machineSupplier].sum += r.machineSat;
             machineSuppliers[r.machineSupplier].count += 1;
        }
    });

    const averages = {
        training: avg('trainingSat'),
        team: avg('teamSat'),
        architect: avg('architectSat'),
        machines: avg('machineSat'),
        vendpago: avg('vendpagoSat'),
        sults: avg('sultsSat'),
        stone: avg('stoneSat'),
        technician: avg('technicianSat')
    };

    const machineSuppliersStats: Record<string, { avg: number, count: number }> = {};
    Object.entries(machineSuppliers).forEach(([key, val]) => {
        machineSuppliersStats[key] = { avg: val.sum / val.count, count: val.count };
    });

    // General Sat Avg
    const avgGeneral = avg('generalSat');

    return {
        records,
        stats: {
            totalRecords,
            avgGeneral,
            averages,
            machineSuppliers: machineSuppliersStats
        }
    };
};
