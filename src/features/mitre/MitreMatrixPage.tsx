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
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16">
      {/* Header */}
      <section className="bg-[#FFFEFA] dark:bg-[#1B3532] border border-[#D9D9CE] dark:border-[#294640] rounded p-5 shadow-forensic-sm transition-colors">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#26796C] dark:text-[#C6D36C] flex items-center gap-1.5">
              <Grid className="w-3.5 h-3.5" />
              MITRE ATT&amp;CK FOR ENTERPRISE MATRIX
            </span>
            <span className="text-[#BCBCAC] dark:text-[#294640]">•</span>
            <span className="text-[10px] font-mono text-[#69746D] dark:text-[#A3B1AB]">
              CORRELATED ADVERSARY TACTICS
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[#192622] dark:text-[#F2F0E8] tracking-tight">
            MITRE ATT&amp;CK Threat Matrix
          </h1>
          <p className="text-xs text-[#69746D] dark:text-[#A3B1AB]">
            Active techniques correlated across incoming telemetry streams, identified brute-force indicators, and active incidents.
          </p>
        </div>
      </section>

      {/* MITRE Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 items-start">
        {MITRE_MATRIX.map((col) => (
          <div 
            key={col.tacticId}
            className="bg-[#FFFEFA] dark:bg-[#1B3532] border border-[#D9D9CE] dark:border-[#294640] rounded p-3 shadow-forensic-sm space-y-2 text-xs font-mono"
          >
            <div className="border-b border-[#D9D9CE] dark:border-[#294640] pb-2">
              <span className="text-[9px] text-[#69746D] dark:text-[#A3B1AB] uppercase block">{col.tacticId}</span>
              <span className="text-xs font-bold text-[#192622] dark:text-white block font-sans">{col.tactic}</span>
            </div>

            <div className="space-y-1.5">
              {col.techniques.map((t) => (
                <div
                  key={t.id}
                  className={`p-2 rounded border text-[11px] ${
                    t.active
                      ? 'bg-[#E87950]/10 border-[#E87950]/40 text-[#192622] dark:text-white'
                      : 'bg-[#F2F0E8] dark:bg-[#142C29] border-[#D9D9CE] dark:border-[#294640] text-[#69746D] dark:text-[#A3B1AB] opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#E87950]">{t.id}</span>
                    {t.active && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E87950] animate-pulse" />
                    )}
                  </div>
                  <div className="text-[10px] mt-0.5 leading-tight font-sans font-medium">{t.name}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
