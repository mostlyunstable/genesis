import React, { useState } from 'react';
import { 
  Server, 
  Search, 
  ShieldAlert, 
  ShieldCheck, 
  Lock, 
  Layers, 
  ExternalLink,
  Cpu,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { SeverityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface AssetRecord {
  id: string;
  name: string;
  ip: string;
  role: string;
  os: string;
  zone: string;
  riskScore: number;
  status: 'COMPROMISED' | 'ELEVATED_RISK' | 'HEALTHY' | 'ISOLATED';
  openPorts: number[];
  connectedSubnets: number;
  activeIdentities: string[];
}

const CORP_ASSETS: AssetRecord[] = [
  {
    id: 'ASSET-01',
    name: 'bastion-01',
    ip: '10.240.10.15',
    role: 'Production DMZ Bastion Host',
    os: 'Ubuntu 22.04 LTS (OpenSSH 8.9p1)',
    zone: 'us-east-1a VPC (DMZ)',
    riskScore: 92,
    status: 'COMPROMISED',
    openPorts: [22, 9100],
    connectedSubnets: 14,
    activeIdentities: ['deploy', 'root', 'ubuntu']
  },
  {
    id: 'ASSET-02',
    name: 'sso-gw-02',
    ip: '10.240.20.5',
    role: 'Enterprise SAML 2.0 Auth Gateway',
    os: 'Windows Server 2022 (AD FS)',
    zone: 'us-east-1b VPC (Auth Zone)',
    riskScore: 68,
    status: 'ELEVATED_RISK',
    openPorts: [443, 8443],
    connectedSubnets: 4,
    activeIdentities: ['ad_sync', 'svc_saml', 'federation']
  },
  {
    id: 'ASSET-03',
    name: 'db-cluster-01',
    ip: '10.240.30.12',
    role: 'Production Primary PostgreSQL Node',
    os: 'Debian 12 Bookworm',
    zone: 'us-east-1c VPC (Data Tier)',
    riskScore: 24,
    status: 'HEALTHY',
    openPorts: [5432],
    connectedSubnets: 2,
    activeIdentities: ['postgres', 'backup_agent']
  },
  {
    id: 'ASSET-04',
    name: 'auth-proxy-01',
    ip: '10.240.10.20',
    role: 'Edge Ingress WAF & Reverse Proxy',
    os: 'Alpine Linux 3.19 (NGINX 1.25)',
    zone: 'us-east-1a VPC (Public Edge)',
    riskScore: 15,
    status: 'HEALTHY',
    openPorts: [80, 443],
    connectedSubnets: 3,
    activeIdentities: ['nginx', 'certbot']
  },
  {
    id: 'ASSET-05',
    name: 'ad-dc-01',
    ip: '10.240.20.2',
    role: 'Enterprise Active Directory Domain Controller',
    os: 'Windows Server 2022 Datacenter',
    zone: 'us-east-1b VPC (Identity Tier)',
    riskScore: 45,
    status: 'ELEVATED_RISK',
    openPorts: [88, 389, 636],
    connectedSubnets: 8,
    activeIdentities: ['krbtgt', 'Administrator']
  }
];

export const AssetsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState<string>('ASSET-01');

  const selectedAsset = CORP_ASSETS.find(a => a.id === selectedAssetId) || CORP_ASSETS[0];

  const filteredAssets = CORP_ASSETS.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.ip.includes(q) ||
      a.role.toLowerCase().includes(q) ||
      a.zone.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16">
      
      {/* Header */}
      <section className="bg-[#FFFEFA] dark:bg-[#1B3532] border border-[#D9D9CE] dark:border-[#294640] rounded p-5 shadow-forensic-sm transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#26796C] dark:text-[#C6D36C] flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" />
                ASSET INVENTORY &amp; TOPOLOGY
              </span>
              <span className="text-[#BCBCAC] dark:text-[#294640]">•</span>
              <span className="text-[10px] font-mono text-[#69746D] dark:text-[#A3B1AB]">
                CORRELATED BLAST RADIUS ANALYSIS
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#192622] dark:text-[#F2F0E8] tracking-tight">
              Enterprise Asset Registry
            </h1>
            <p className="text-xs text-[#69746D] dark:text-[#A3B1AB]">
              Infrastructure inventory, lateral route exposure, privileged identity bindings, and posture risk index.
            </p>
          </div>

          <div className="w-full md:w-80">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search host, IP address, role or zone..."
                className="w-full bg-[#F2F0E8] dark:bg-[#142C29] border border-[#D9D9CE] dark:border-[#294640] rounded px-3 py-1.5 pl-8 text-xs font-mono text-[#192622] dark:text-white placeholder-[#69746D] focus:outline-none focus:border-[#26796C]"
              />
              <Search className="w-3.5 h-3.5 text-[#69746D] absolute left-2.5 top-2 pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Two-Column Master Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: Asset Cards */}
        <div className="lg:col-span-5 space-y-2">
          {filteredAssets.map((asset) => {
            const isSelected = asset.id === selectedAsset.id;

            return (
              <div
                key={asset.id}
                onClick={() => setSelectedAssetId(asset.id)}
                className={`p-3.5 rounded border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#FFFEFA] dark:bg-[#203A35] border-[#26796C] dark:border-[#C6D36C] shadow-forensic-sm ring-1 ring-[#26796C]/20'
                    : 'bg-[#FFFEFA] dark:bg-[#1B3532] border-[#D9D9CE] dark:border-[#294640] hover:border-[#BCBCAC]'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-[#192622] dark:text-white text-sm">{asset.name}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                    asset.status === 'COMPROMISED' ? 'bg-[#D94F45]/15 text-[#D94F45]' :
                    asset.status === 'ELEVATED_RISK' ? 'bg-[#E87950]/15 text-[#E87950]' :
                    'bg-[#648B70]/15 text-[#648B70]'
                  }`}>
                    {asset.status}
                  </span>
                </div>

                <div className="text-xs text-[#69746D] dark:text-[#A3B1AB] font-sans mt-1">
                  {asset.role}
                </div>

                <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#D9D9CE] dark:border-[#294640] text-[10px] font-mono text-[#69746D] dark:text-[#A3B1AB]">
                  <span>{asset.ip}</span>
                  <span>Risk Score: <strong className={asset.riskScore > 75 ? 'text-[#D94F45]' : 'text-[#26796C]'}>{asset.riskScore}</strong></span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Asset Deep Dossier */}
        <div className="lg:col-span-7">
          <div className="bg-[#FFFEFA] dark:bg-[#1B3532] border border-[#D9D9CE] dark:border-[#294640] rounded shadow-forensic-sm p-5 space-y-5">
            <div className="border-b border-[#D9D9CE] dark:border-[#294640] pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-[#69746D] dark:text-[#A3B1AB] uppercase">{selectedAsset.zone}</span>
                <h2 className="text-lg font-bold text-[#192622] dark:text-white font-mono mt-0.5">{selectedAsset.name} ({selectedAsset.ip})</h2>
              </div>
              <div className="px-3 py-1 rounded bg-[#F2F0E8] dark:bg-[#142C29] text-xs font-mono font-bold text-[#D94F45]">
                Risk: {selectedAsset.riskScore}/100
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 font-mono text-xs">
              <div>
                <span className="text-[10px] text-[#69746D] dark:text-[#A3B1AB] uppercase block">Operating System</span>
                <span className="text-[#192622] dark:text-white block mt-0.5">{selectedAsset.os}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#69746D] dark:text-[#A3B1AB] uppercase block">Open Ingress Ports</span>
                <span className="text-[#192622] dark:text-white block mt-0.5">{selectedAsset.openPorts.join(', ')}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#69746D] dark:text-[#A3B1AB] uppercase block">Connected VPC Subnets</span>
                <span className="text-[#E87950] font-bold block mt-0.5">{selectedAsset.connectedSubnets} Subnets at Risk</span>
              </div>
              <div>
                <span className="text-[10px] text-[#69746D] dark:text-[#A3B1AB] uppercase block">Active Local Identities</span>
                <span className="text-[#192622] dark:text-white block mt-0.5">{selectedAsset.activeIdentities.join(', ')}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#D9D9CE] dark:border-[#294640] space-y-1">
              <span className="text-[10px] font-mono uppercase text-[#69746D] dark:text-[#A3B1AB] font-bold">
                FORENSIC POSTURE EVALUATION
              </span>
              <p className="text-xs text-[#192622] dark:text-slate-200 font-sans leading-relaxed">
                Host bastion-01 acts as primary DMZ bastion gateway. Credential compromise on user "deploy" poses immediate lateral traversal risk into 14 peered VPC subnets. Host session PID 12436 requires immediate automated quarantine.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
