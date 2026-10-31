import React from 'react';
import { 
  Radar, 
  ShieldAlert, 
  Globe, 
  Crosshair, 
  Activity, 
  Layers, 
  Zap, 
  TrendingUp,
  ExternalLink
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export const AttackIntelligencePage: React.FC = () => {
  const { incidents, detections, threatIntel } = useSecurityStore();

  const attackVectors = [
    {
      name: 'High-Velocity SSH Password Exhaustion',
      technique: 'T1110.001',
      targets: 'Linux Bastions (Port 22)',
      volume: '36 events (peak 2.5s interval)',
      status: 'Active Incident INC-2026-0042',
      risk: 94
    },
    {
      name: 'Distributed SAML Identity Spray',
      technique: 'T1110.003',
      targets: 'SSO Gateway (Port 443)',
      volume: '18 corporate identities',
      status: 'Contained INC-2026-0041',
      risk: 78
    },
    {
      name: 'Mobile API Credential Stuffing Proxy Pool',
      technique: 'T1110.004',
      targets: 'Customer Login API',
      volume: '142 requests / 3 proxies',
      status: 'WAF Mitigated',
      risk: 68
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#252D38]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-[#E8EDF4]">Attack Intelligence & Threat Landscape</h2>
            <Badge variant="accent">CAMPAIGN CORRELATION</Badge>
          </div>
          <p className="text-xs text-[#8994A4] font-mono mt-0.5">
            Macro-level adversary campaign profiling, credential access vectors, and defense posture coverage.
          </p>
        </div>
      </div>

      {/* Attack Vectors Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {attackVectors.map((v) => (
          <Card
            key={v.name}
            title={
              <div className="flex items-center gap-2">
                <Radar className="w-4 h-4 text-[#E0A34A]" />
                <span className="text-xs font-bold text-[#E8EDF4] truncate">{v.name}</span>
              </div>
            }
            badge={<span className="text-xs font-mono text-[#EF5350] font-bold">{v.risk}/100</span>}
          >
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-[#586574]">Technique:</span>
                <span className="text-[#6DA9E8] font-semibold">{v.technique}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#586574]">Target Surface:</span>
                <span className="text-[#E8EDF4]">{v.targets}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#586574]">Telemetry:</span>
                <span className="text-[#E8EDF4]">{v.volume}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#1C2430]">
                <span className="text-[#586574]">Post-Action Status:</span>
                <span className="text-[#42B883] font-semibold">{v.status}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* MITRE ATT&CK Matrix Coverage Strip */}
      <Card
        title="Active MITRE ATT&CK Enterprise Matrix Footprint"
        badge={<Badge variant="info">TACTICAL MAP</Badge>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3 bg-[#0D1016] border border-[#252D38] rounded space-y-2">
            <div className="text-[10px] text-[#586574] uppercase font-bold">1. Initial Access</div>
            <div className="p-2 rounded bg-[#171E28] border border-[#EF5350]/30 text-[#EF5350]">
              <div className="font-bold">T1078.003</div>
              <div className="text-[11px] text-[#E8EDF4]">Valid Local Accounts</div>
              <div className="text-[10px] text-[#8994A4] mt-1">Matched on user &quot;deploy&quot;</div>
            </div>
          </div>

          <div className="p-3 bg-[#0D1016] border border-[#252D38] rounded space-y-2">
            <div className="text-[10px] text-[#586574] uppercase font-bold">2. Credential Access</div>
            <div className="p-2 rounded bg-[#171E28] border border-[#EF5350]/30 text-[#EF5350]">
              <div className="font-bold">T1110.001</div>
              <div className="text-[11px] text-[#E8EDF4]">Password Guessing (SSH)</div>
              <div className="text-[10px] text-[#8994A4] mt-1">35 failed auth loops</div>
            </div>
            <div className="p-2 rounded bg-[#171E28] border border-[#E5AD52]/30 text-[#E5AD52]">
              <div className="font-bold">T1110.003</div>
              <div className="text-[11px] text-[#E8EDF4]">Password Spraying (SSO)</div>
              <div className="text-[10px] text-[#8994A4] mt-1">18 unique employee usernames</div>
            </div>
          </div>

          <div className="p-3 bg-[#0D1016] border border-[#252D38] rounded space-y-2">
            <div className="text-[10px] text-[#586574] uppercase font-bold">3. Persistence</div>
            <div className="p-2 rounded bg-[#171E28] border border-[#6DA9E8]/30 text-[#6DA9E8]">
              <div className="font-bold">T1098</div>
              <div className="text-[11px] text-[#E8EDF4]">Account Manipulation</div>
              <div className="text-[10px] text-[#8994A4] mt-1">Monitored authorized_keys</div>
            </div>
          </div>

          <div className="p-3 bg-[#0D1016] border border-[#252D38] rounded space-y-2">
            <div className="text-[10px] text-[#586574] uppercase font-bold">4. Defense Evasion</div>
            <div className="p-2 rounded bg-[#171E28] border border-[#E5AD52]/30 text-[#E5AD52]">
              <div className="font-bold">T1070</div>
              <div className="text-[11px] text-[#E8EDF4]">Indicator Removal</div>
              <div className="text-[10px] text-[#8994A4] mt-1">Auditd integrity checked</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
