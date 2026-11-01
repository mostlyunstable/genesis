import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Grid, 
  Search, 
  ExternalLink, 
  ShieldAlert, 
  Layers, 
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Radio
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { Button } from '@/components/ui/Button';

interface MitreColumn {
  tactic: string;
  tacticId: string;
  techniques: {
    id: string;
    name: string;
    active: boolean;
    incidentCount?: number;
  }[];
}

const MITRE_TACTIC_FRAMEWORK: { tactic: string; tacticId: string; defaultTechniques: { id: string; name: string }[] }[] = [
  {
    tactic: 'Initial Access',
    tacticId: 'TA0001',
    defaultTechniques: [
      { id: 'T1190', name: 'Exploit Public Application' },
      { id: 'T1133', name: 'External Remote Services' },
      { id: 'T1566', name: 'Phishing' }
    ]
  },
  {
    tactic: 'Execution',
    tacticId: 'TA0002',
    defaultTechniques: [
      { id: 'T1059.004', name: 'Unix Shell' },
      { id: 'T1059.001', name: 'PowerShell' },
      { id: 'T1204', name: 'User Execution' }
    ]
  },
  {
    tactic: 'Persistence',
    tacticId: 'TA0003',
    defaultTechniques: [
      { id: 'T1098', name: 'Account Manipulation' },
      { id: 'T1078.003', name: 'Local Accounts' },
      { id: 'T1053', name: 'Scheduled Task/Job' }
    ]
  },
  {
    tactic: 'Privilege Escalation',
    tacticId: 'TA0004',
    defaultTechniques: [
      { id: 'T1548.003', name: 'Sudo and Sudo Caching' },
      { id: 'T1068', name: 'Exploitation for Privilege' }
    ]
  },
  {
    tactic: 'Credential Access',
    tacticId: 'TA0006',
    defaultTechniques: [
      { id: 'T1110.001', name: 'Password Guessing' },
      { id: 'T1110.003', name: 'Password Spraying' },
      { id: 'T1003', name: 'OS Credential Dumping' }
    ]
  },
  {
    tactic: 'Lateral Movement',
    tacticId: 'TA0008',
    defaultTechniques: [
      { id: 'T1021.004', name: 'SSH' },
      { id: 'T1021.001', name: 'Remote Desktop' },
      { id: 'T1570', name: 'Lateral Tool Transfer' }
    ]
  }
];

export const MitreMatrixPage: React.FC = () => {
  const navigate = useNavigate();
  const { overviewMetrics, fetchOverviewMetrics } = useSecurityStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchOverviewMetrics();
  }, [fetchOverviewMetrics]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchOverviewMetrics();
    setIsRefreshing(false);
  };

  const activeTechniques = overviewMetrics?.mitreTechniqueDistribution || [];
  const activeCount = activeTechniques.length;

  // Build matrix dynamically based on actual persisted techniques in database
  const matrix: MitreColumn[] = MITRE_TACTIC_FRAMEWORK.map((tacticGroup) => {
    return {
      tactic: tacticGroup.tactic,
      tacticId: tacticGroup.tacticId,
      techniques: tacticGroup.defaultTechniques.map((t) => {
        const found = activeTechniques.find(at => at.techniqueId === t.id);
        return {
          id: t.id,
          name: t.name,
          active: !!found,
          incidentCount: found ? found.count : 0
        };
      })
    };
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          1. EDITORIAL HEADER & TACTICAL SUMMARY
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#E3E5DC] rounded-3xl p-6 sm:p-8 shadow-origin-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#54765C]" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#54765C] flex items-center gap-1.5">
                <Grid className="w-3.5 h-3.5" />
                ENTERPRISE TACTICS FRAMEWORK
              </span>
              <span className="text-[#CFD4C9]">•</span>
              <span className="text-[10px] font-mono text-[#73796F]">
                MITRE ATT&amp;CK MATRIX v14
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl text-[#20251F] tracking-tight">
              ATT&amp;CK Coverage Matrix
            </h1>
            <p className="text-sm text-[#73796F] max-w-2xl leading-relaxed">
              Standardized tactics and techniques observed in enterprise telemetry, correlated incidents, and behavioral detection rules.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#EAF0E6] border border-[#CFDCC9] font-mono text-xs text-[#54765C]">
              <span className="w-2 h-2 rounded-full bg-[#54765C] animate-pulse" />
              <span>{activeCount} Active Techniques</span>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2.5 rounded-full bg-[#F0F1EB] hover:bg-white border border-[#E3E5DC] text-[#73796F] hover:text-[#20251F] transition-colors cursor-pointer"
              title="Refresh matrix"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. EMPTY STATE VS ACTIVE TECHNIQUE GRID
          ───────────────────────────────────────────────────────────── */}
      {activeCount === 0 ? (
        <section className="bg-white border border-[#E3E5DC] rounded-3xl p-16 text-center space-y-4 shadow-origin-sm">
          <div className="w-14 h-14 rounded-full bg-[#EAF0E6] text-[#54765C] mx-auto flex items-center justify-center">
            <Layers className="w-7 h-7" />
          </div>
          <h2 className="font-display text-2xl text-[#20251F]">
            Technique mapping will appear when detections are available
          </h2>
          <p className="text-sm text-[#73796F] max-w-md mx-auto leading-relaxed">
            No adversary techniques have been mapped in live telemetry or correlated incidents yet. Techniques activate automatically as behavioral detections trigger.
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/events')}
              icon={<Radio className="w-4 h-4" />}
            >
              View Telemetry Stream
            </Button>
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {matrix.map((col) => {
            const activeInCol = col.techniques.filter(t => t.active).length;

            return (
              <div 
                key={col.tacticId}
                className="bg-white border border-[#E3E5DC] rounded-3xl p-5 shadow-origin-sm space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="border-b border-[#E3E5DC] pb-3 space-y-1">
                    <span className="text-[10px] font-mono font-bold text-[#969B91] uppercase">
                      {col.tacticId}
                    </span>
                    <h3 className="font-display text-base text-[#20251F] font-bold">
                      {col.tactic}
                    </h3>
                    <div className="text-[11px] font-mono text-[#54765C] font-semibold">
                      {activeInCol} active
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-3">
                    {col.techniques.map((tech) => (
                      <div
                        key={tech.id}
                        className={`p-3 rounded-2xl border text-xs font-mono transition-all ${
                          tech.active
                            ? 'bg-[#EAF0E6] border-[#A1B69A] text-[#20251F] shadow-sm'
                            : 'bg-[#FAFAF7] border-[#E3E5DC] text-[#73796F] opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold">{tech.id}</span>
                          {tech.active && (
                            <span className="w-2 h-2 rounded-full bg-[#54765C]" />
                          )}
                        </div>
                        <div className="text-[11px] font-sans mt-1 leading-snug">
                          {tech.name}
                        </div>
                        {tech.active && tech.incidentCount !== undefined && (
                          <div className="text-[10px] text-[#54765C] font-bold mt-2">
                            {tech.incidentCount} incidents
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
