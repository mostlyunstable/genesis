import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  Activity, 
  AlertOctagon, 
  Flame, 
  Ban, 
  Bot, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  Filter,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { Card } from '@/components/ui/Card';
import { Badge, SeverityBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RiskScoreBadge } from '@/components/ui/RiskScoreBadge';

// Telemetry Time-Series Mock (24h Trend)
const AUTH_VOLUME_DATA = [
  { time: '04:00', failed: 45, success: 320, total: 365 },
  { time: '06:00', failed: 82, success: 480, total: 562 },
  { time: '08:00', failed: 190, success: 890, total: 1080 },
  { time: '09:00', failed: 340, success: 1240, total: 1580 }, // Password spray start
  { time: '10:00', failed: 890, success: 1310, total: 2200 }, // SSH brute force spike
  { time: '11:00', failed: 210, success: 1420, total: 1630 }, // Post-mitigation drop
  { time: '12:00', failed: 115, success: 1380, total: 1495 },
  { time: '14:00', failed: 130, success: 1510, total: 1640 },
  { time: '16:00', failed: 140, success: 1490, total: 1630 },
  { time: '18:00', failed: 95, success: 980, total: 1075 },
];

const SEVERITY_PIE_DATA = [
  { name: 'Critical', value: 1, color: '#EF5350' },
  { name: 'Warning', value: 2, color: '#E5AD52' },
  { name: 'Information', value: 1, color: '#6DA9E8' },
  { name: 'Low/Normal', value: 25, color: '#42B883' }
];

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { incidents, detections, events, actions, setSelectedIncidentId } = useSecurityStore();
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');

  // Computed metrics
  const totalEventsCount = '8,421,940';
  const activeIncidents = incidents.filter(i => i.status === 'active' || i.status === 'investigating');
  const criticalThreats = detections.filter(d => d.severity === 'critical');
  const bruteForceAttempts = 35 + 18 + 142; // Correlated attempts
  const blockedIPsCount = actions.filter(a => a.status === 'simulated_success' && a.actionName.includes('Block')).length;
  const aiInvestigations = incidents.length;

  const handleSelectIncident = (id: string) => {
    setSelectedIncidentId(id);
    navigate('/incidents');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#252D38]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-[#E8EDF4]">Autonomous Security Posture</h2>
            <Badge variant="accent" dot>SIMULATED SOAR</Badge>
          </div>
          <p className="text-xs text-[#8994A4] font-mono mt-0.5">
            Real-time correlation of authentication streams, brute-force anomalies, and autonomous playbooks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md bg-[#121720] border border-[#252D38] p-0.5 text-xs font-mono">
            {(['1h', '24h', '7d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  timeRange === r 
                    ? 'bg-[#171E28] text-[#E0A34A] font-semibold border border-[#252D38]' 
                    : 'text-[#8994A4] hover:text-[#E8EDF4]'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* 6 Key Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Metric 1 */}
        <div className="bg-[#121720] border border-[#252D38] p-3.5 rounded-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8994A4] text-xs font-mono">
            <span>TOTAL TELEMETRY</span>
            <Activity className="w-4 h-4 text-[#6DA9E8]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-[#E8EDF4]">{totalEventsCount}</div>
            <div className="flex items-center gap-1 text-[11px] font-mono text-[#42B883] mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>+14.2% vs baseline</span>
            </div>
          </div>
          <div className="text-[10px] text-[#586574] font-mono mt-2 border-t border-[#1C2430] pt-1.5">
            5 Ingest Forwarders
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#121720] border border-[#252D38] p-3.5 rounded-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8994A4] text-xs font-mono">
            <span>ACTIVE INCIDENTS</span>
            <AlertOctagon className="w-4 h-4 text-[#EF5350]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-[#EF5350]">{activeIncidents.length}</div>
            <div className="flex items-center gap-1 text-[11px] font-mono text-[#EF5350] mt-1">
              <span className="font-semibold">1 Critical Priority</span>
            </div>
          </div>
          <div className="text-[10px] text-[#586574] font-mono mt-2 border-t border-[#1C2430] pt-1.5">
            Requires containment
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#121720] border border-[#252D38] p-3.5 rounded-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8994A4] text-xs font-mono">
            <span>CRITICAL THREATS</span>
            <Flame className="w-4 h-4 text-[#E5AD52]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-[#E5AD52]">{criticalThreats.length}</div>
            <div className="flex items-center gap-1 text-[11px] font-mono text-[#8994A4] mt-1">
              <span>98% AI Confidence</span>
            </div>
          </div>
          <div className="text-[10px] text-[#586574] font-mono mt-2 border-t border-[#1C2430] pt-1.5">
            SSH Breach Detected
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-[#121720] border border-[#252D38] p-3.5 rounded-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8994A4] text-xs font-mono">
            <span>BRUTE FORCE TRIES</span>
            <ShieldAlert className="w-4 h-4 text-[#E0A34A]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-[#E8EDF4]">{bruteForceAttempts}</div>
            <div className="flex items-center gap-1 text-[11px] font-mono text-[#EF5350] mt-1">
              <TrendingUp className="w-3 h-3" />
              <span>+38% surge @ 10:15</span>
            </div>
          </div>
          <div className="text-[10px] text-[#586574] font-mono mt-2 border-t border-[#1C2430] pt-1.5">
            Across SSH & SSO
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-[#121720] border border-[#252D38] p-3.5 rounded-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8994A4] text-xs font-mono">
            <span>DEFENDED IPS</span>
            <Ban className="w-4 h-4 text-[#42B883]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-[#42B883]">{blockedIPsCount}</div>
            <div className="flex items-center gap-1 text-[11px] font-mono text-[#42B883] mt-1">
              <span>Simulated IPTables</span>
            </div>
          </div>
          <div className="text-[10px] text-[#586574] font-mono mt-2 border-t border-[#1C2430] pt-1.5">
            198.51.100.42 dropped
          </div>
        </div>

        {/* Metric 6 */}
        <div className="bg-[#121720] border border-[#252D38] p-3.5 rounded-md flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8994A4] text-xs font-mono">
            <span>AI INVESTIGATIONS</span>
            <Bot className="w-4 h-4 text-[#6DA9E8]" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-[#6DA9E8]">{aiInvestigations}</div>
            <div className="flex items-center gap-1 text-[11px] font-mono text-[#8994A4] mt-1">
              <span>Avg Latency 1.2s</span>
            </div>
          </div>
          <div className="text-[10px] text-[#586574] font-mono mt-2 border-t border-[#1C2430] pt-1.5">
            Evidence Synthesized
          </div>
        </div>
      </div>

      {/* Main Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart: Authentication Volume & Attack Surge (2 cols) */}
        <Card 
          className="lg:col-span-2"
          title="Authentication Volume & Attack Velocity Telemetry"
          badge={<Badge variant="info">24H TIMELINE</Badge>}
          action={
            <div className="flex items-center gap-3 text-xs font-mono text-[#8994A4]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#EF5350]" /> Failures / Attack Wave
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#42B883]" /> Legitimate Success
              </span>
            </div>
          }
        >
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={AUTH_VOLUME_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="failGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF5350" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#EF5350" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="succGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#42B883" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#42B883" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1C2430" vertical={false} />
                <XAxis dataKey="time" stroke="#586574" tick={{ fontSize: 11, fill: '#8994A4' }} />
                <YAxis stroke="#586574" tick={{ fontSize: 11, fill: '#8994A4' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#121720', 
                    borderColor: '#252D38', 
                    color: '#E8EDF4', 
                    fontSize: '12px',
                    fontFamily: 'JetBrains Mono' 
                  }} 
                />
                <Area type="monotone" dataKey="failed" stroke="#EF5350" strokeWidth={2} fillOpacity={1} fill="url(#failGrad)" name="Failed / Attack" />
                <Area type="monotone" dataKey="success" stroke="#42B883" strokeWidth={2} fillOpacity={1} fill="url(#succGrad)" name="Success" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 pt-3 border-t border-[#1C2430] flex items-center justify-between text-xs text-[#8994A4] font-mono">
            <span>Peak Attack Anomaly: 10:00 - 10:16 UTC (SSH Brute Force from 198.51.100.42)</span>
            <button onClick={() => navigate('/logs')} className="text-[#E0A34A] hover:underline flex items-center gap-1">
              Explore Raw Logs <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </Card>

        {/* Severity Distribution Donut */}
        <Card
          title="Threat Severity Breakdown"
          badge={<Badge variant="neutral">CURRENT STATE</Badge>}
        >
          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={SEVERITY_PIE_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {SEVERITY_PIE_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#121720" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#121720', 
                    borderColor: '#252D38', 
                    color: '#E8EDF4', 
                    fontSize: '12px' 
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono border-t border-[#1C2430] pt-3">
            {SEVERITY_PIE_DATA.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[#8994A4]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-semibold text-[#E8EDF4]">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Second Row: Attack Activity by Source IP & Live Incident Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Source IP Threat Vectors (1 col) */}
        <Card
          title="High-Risk External Vectors (RFC 5737)"
          badge={<Badge variant="warning">THREAT INTEL</Badge>}
          action={
            <button onClick={() => navigate('/threat-intel')} className="text-xs text-[#E0A34A] hover:underline flex items-center gap-1 font-mono">
              All Indicators <ArrowUpRight className="w-3 h-3" />
            </button>
          }
        >
          <div className="space-y-3 font-mono text-xs">
            <div className="p-3 bg-[#0D1016] border border-[#252D38] rounded">
              <div className="flex items-center justify-between">
                <span className="text-[#EF5350] font-semibold">198.51.100.42</span>
                <RiskScoreBadge score={94} size="sm" />
              </div>
              <div className="text-[11px] text-[#8994A4] mt-1">SSH Brute Force & Session Compromise</div>
              <div className="flex items-center justify-between text-[10px] text-[#586574] mt-2 border-t border-[#1C2430] pt-1">
                <span>36 Correlated Events</span>
                <span className="text-[#42B883]">IPTables Dropped</span>
              </div>
            </div>

            <div className="p-3 bg-[#0D1016] border border-[#252D38] rounded">
              <div className="flex items-center justify-between">
                <span className="text-[#E5AD52] font-semibold">203.0.113.88</span>
                <RiskScoreBadge score={78} size="sm" />
              </div>
              <div className="text-[11px] text-[#8994A4] mt-1">SAML SSO Password Spray (18 accounts)</div>
              <div className="flex items-center justify-between text-[10px] text-[#586574] mt-2 border-t border-[#1C2430] pt-1">
                <span>18 Correlated Events</span>
                <span className="text-[#6DA9E8]">Rate Throttled</span>
              </div>
            </div>

            <div className="p-3 bg-[#0D1016] border border-[#252D38] rounded">
              <div className="flex items-center justify-between">
                <span className="text-[#8994A4] font-semibold">192.0.2.14 / 192.0.2.55</span>
                <RiskScoreBadge score={68} size="sm" />
              </div>
              <div className="text-[11px] text-[#8994A4] mt-1">Credential Stuffing Proxy Cluster</div>
              <div className="flex items-center justify-between text-[10px] text-[#586574] mt-2 border-t border-[#1C2430] pt-1">
                <span>142 Web API Requests</span>
                <span className="text-[#42B883]">WAF Challenged</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Live Incident Feed (2 cols) */}
        <Card
          className="lg:col-span-2"
          title="Active Security Incidents (Deterministic Telemetry Feed)"
          badge={<Badge variant="critical">ATTENTION REQUIRED</Badge>}
          action={
            <Button size="sm" variant="outline" onClick={() => navigate('/incidents')}>
              Manage All Incidents ({incidents.length})
            </Button>
          }
        >
          <div className="divide-y divide-[#1C2430]">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => handleSelectIncident(inc.id)}
                className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#151D28] rounded cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <SeverityBadge severity={inc.severity} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#E8EDF4] hover:text-[#E0A34A] transition-colors">
                        {inc.title}
                      </span>
                      <span className="text-[11px] font-mono text-[#586574]">({inc.id})</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-[#8994A4] mt-1">
                      <span>Source: <span className="text-[#E8EDF4]">{inc.sourceIps[0]}</span></span>
                      <span>Target: <span className="text-[#E8EDF4]">{inc.targetAccounts.slice(0, 2).join(', ')}</span></span>
                      <span>Events: <span className="text-[#E8EDF4]">{inc.eventCount}</span></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  <RiskScoreBadge score={inc.riskScore} size="sm" />
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                    inc.status === 'active' ? 'bg-[#EF5350]/20 text-[#EF5350]' :
                    inc.status === 'investigating' ? 'bg-[#E5AD52]/20 text-[#E5AD52]' :
                    'bg-[#42B883]/20 text-[#42B883]'
                  }`}>
                    {inc.status}
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-[#586574]" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-[#1C2430] flex items-center justify-between text-xs text-[#586574] font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#42B883]" />
              Continuous Event Correlation Loop: Evaluated 1.4s ago
            </span>
            <span>Simulated Telemetry Feed</span>
          </div>
        </Card>
      </div>
    </div>
  );
};
