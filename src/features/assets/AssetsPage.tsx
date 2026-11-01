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
  ArrowRight,
  Network
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { SeverityBadge, Badge } from '@/components/ui/Badge';
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
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      
      {/* Editorial Header */}
      <section className="bg-white border border-[#E3E5DC] rounded-3xl p-6 sm:p-8 shadow-origin-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#54765C]" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#54765C] flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5" />
                ASSET INVENTORY &amp; TOPOLOGY
              </span>
              <span className="text-[#CFD4C9]">•</span>
              <span className="text-[10px] font-mono text-[#73796F]">
                BLAST RADIUS &amp; LATERAL ROUTING
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl text-[#20251F] tracking-tight">
              Enterprise Asset Registry
            </h1>
            <p className="text-sm text-[#73796F] font-sans max-w-2xl leading-relaxed">
              Infrastructure topology, lateral routing exposure, privileged identity bindings, and forensic risk evaluation.
            </p>
          </div>

          <div className="w-full md:w-80">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search host, IP address, role..."
                className="w-full bg-[#F0F1EB] border border-[#E3E5DC] rounded-full px-4 py-2.5 pl-10 text-xs font-mono text-[#20251F] placeholder-[#969B91] focus:outline-none focus:border-[#54765C] transition-all shadow-inner"
              />
              <Search className="w-4 h-4 text-[#969B91] absolute left-3.5 top-3 pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Two-Column Master Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Asset Cards */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#969B91] px-1">
            Registered Assets ({filteredAssets.length})
          </div>

          <div className="space-y-3">
            {filteredAssets.map((asset) => {
              const isSelected = asset.id === selectedAsset.id;

              return (
                <div
                  key={asset.id}
                  onClick={() => setSelectedAssetId(asset.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-[#54765C] shadow-origin-sm ring-1 ring-[#54765C]/30'
                      : 'bg-white border-[#E3E5DC] hover:border-[#CFD4C9] hover:bg-[#FAFAF7]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-[#20251F] text-sm">{asset.name}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      asset.status === 'COMPROMISED' ? 'bg-[#F9ECEB] text-[#B94C43] border border-[#F2D5D3]' :
                      asset.status === 'ELEVATED_RISK' ? 'bg-[#FAF2EC] text-[#C47A45] border border-[#F4E2D5]' :
                      'bg-[#EDF3EF] text-[#64856C] border border-[#DBE7DF]'
                    }`}>
                      {asset.status}
                    </span>
                  </div>

                  <div className="text-xs text-[#73796F] font-sans mt-2">
                    {asset.role}
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#E3E5DC] text-[11px] font-mono text-[#969B91]">
                    <span>{asset.ip}</span>
                    <span>Risk Score: <strong className={asset.riskScore > 75 ? 'text-[#B94C43]' : 'text-[#54765C]'}>{asset.riskScore}/100</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Asset Deep Dossier */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-[#E3E5DC] rounded-3xl shadow-origin-sm p-6 sm:p-8 space-y-6">
            <div className="border-b border-[#E3E5DC] pb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-[#969B91] uppercase tracking-wider">{selectedAsset.zone}</span>
                <h2 className="font-display text-2xl text-[#20251F] mt-1">
                  {selectedAsset.name} <span className="font-mono text-base font-normal text-[#73796F]">({selectedAsset.ip})</span>
                </h2>
              </div>
              <div className="px-3.5 py-1.5 rounded-full bg-[#FAFAF7] border border-[#E3E5DC] text-xs font-mono font-bold text-[#B94C43]">
                Risk Index: {selectedAsset.riskScore}/100
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 font-mono text-xs">
              <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
                <span className="text-[10px] text-[#969B91] uppercase block">Operating System</span>
                <span className="text-[#20251F] font-bold block mt-1">{selectedAsset.os}</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
                <span className="text-[10px] text-[#969B91] uppercase block">Open Ingress Ports</span>
                <span className="text-[#20251F] font-bold block mt-1">{selectedAsset.openPorts.join(', ')}</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
                <span className="text-[10px] text-[#969B91] uppercase block">Connected VPC Subnets</span>
                <span className="text-[#C47A45] font-bold block mt-1">{selectedAsset.connectedSubnets} Subnets Reachable</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC]">
                <span className="text-[10px] text-[#969B91] uppercase block">Active Local Identities</span>
                <span className="text-[#20251F] font-bold block mt-1">{selectedAsset.activeIdentities.join(', ')}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E3E5DC] space-y-2">
              <span className="text-[10px] font-mono uppercase text-[#969B91] font-bold tracking-wider">
                FORENSIC POSTURE EVALUATION
              </span>
              <p className="text-sm text-[#20251F] font-sans leading-relaxed">
                Host <strong className="font-mono text-[#54765C]">{selectedAsset.name}</strong> operates as a primary ingress gateway. Interactive session credentials identified on account <strong className="font-mono text-[#20251F]">deploy</strong> pose an immediate lateral propagation risk across {selectedAsset.connectedSubnets} peered subnets. Deterministic isolation playbook recommended.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
