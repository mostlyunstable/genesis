import React, { useState } from 'react';
import { 
  Grid, 
  Search, 
  ExternalLink, 
  ShieldAlert, 
  Layers, 
  ArrowRight 
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';

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

const MITRE_MATRIX: MitreColumn[] = [
  {
    tactic: 'Initial Access',
    tacticId: 'TA0001',
    techniques: [
      { id: 'T1190', name: 'Exploit Public Application', active: false },
      { id: 'T1133', name: 'External Remote Services', active: true, incidentCount: 1 },
      { id: 'T1566', name: 'Phishing', active: false }
    ]
  },
  {
    tactic: 'Execution',
    tacticId: 'TA0002',
    techniques: [
      { id: 'T1059.004', name: 'Unix Shell (Bash PID 12436)', active: true, incidentCount: 1 },
      { id: 'T1059.001', name: 'PowerShell Execution', active: false },
      { id: 'T1204', name: 'User Execution', active: false }
    ]
  },
  {
    tactic: 'Persistence',
    tacticId: 'TA0003',
    techniques: [
      { id: 'T1098', name: 'Account Manipulation', active: false },
      { id: 'T1078.003', name: 'Local Accounts (deploy)', active: true, incidentCount: 1 },
      { id: 'T1053', name: 'Scheduled Task/Job', active: false }
    ]
  },
  {
    tactic: 'Privilege Escalation',
    tacticId: 'TA0004',
    techniques: [
      { id: 'T1548.003', name: 'Sudo and Sudo Caching', active: true, incidentCount: 1 },
      { id: 'T1068', name: 'Exploitation for Privilege', active: false }
    ]
  },
  {
    tactic: 'Credential Access',
    tacticId: 'TA0006',
    techniques: [
      { id: 'T1110.001', name: 'Password Guessing (SSH Brute)', active: true, incidentCount: 1 },
      { id: 'T1110.003', name: 'Password Spraying (SAML SSO)', active: true, incidentCount: 1 },
      { id: 'T1003', name: 'OS Credential Dumping', active: false }
    ]
  },
  {
    tactic: 'Lateral Movement',
    tacticId: 'TA0008',
    techniques: [
      { id: 'T1021.004', name: 'SSH Lateral Pivot', active: true, incidentCount: 1 },
      { id: 'T1021.002', name: 'SMB/Windows Admin Shares', active: false }
    ]
  }
];

export const MitreMatrixPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      
      {/* Editorial Header */}
      <section className="bg-white border border-[#E3E5DC] rounded-3xl p-6 sm:p-8 shadow-origin-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#54765C]" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#54765C] flex items-center gap-1.5">
              <Grid className="w-3.5 h-3.5" />
              MITRE ATT&amp;CK FOR ENTERPRISE MATRIX
            </span>
            <span className="text-[#CFD4C9]">•</span>
            <span className="text-[10px] font-mono text-[#73796F]">
              MAPPED THREAT TACTICS &amp; TECHNIQUES
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-[#20251F] tracking-tight">
            Adversary Tactic Matrix
          </h1>
          <p className="text-sm text-[#73796F] font-sans max-w-2xl leading-relaxed">
            Active adversarial techniques correlated across telemetry streams, heuristic velocity models, and active incidents.
          </p>
        </div>
      </section>

      {/* MITRE Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
        {MITRE_MATRIX.map((col) => (
          <div 
            key={col.tacticId}
            className="bg-white border border-[#E3E5DC] rounded-3xl p-4 shadow-origin-sm space-y-3 text-xs font-mono"
          >
            <div className="border-b border-[#E3E5DC] pb-3">
              <span className="text-[10px] text-[#54765C] uppercase font-bold block">{col.tacticId}</span>
              <span className="text-sm font-bold text-[#20251F] block font-sans mt-0.5">{col.tactic}</span>
            </div>

            <div className="space-y-2">
              {col.techniques.map((t) => (
                <div
                  key={t.id}
                  className={`p-3 rounded-2xl border transition-all text-[11px] ${
                    t.active
                      ? 'bg-[#EAF0E6] border-[#CFDCC9] text-[#20251F] shadow-sm'
                      : 'bg-[#FAFAF7] border-[#E3E5DC] text-[#969B91] opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#54765C]">{t.id}</span>
                    {t.active && (
                      <span className="w-2 h-2 rounded-full bg-[#54765C] animate-pulse" />
                    )}
                  </div>
                  <div className="text-[11px] mt-1 leading-snug font-sans font-medium text-[#20251F]">{t.name}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
