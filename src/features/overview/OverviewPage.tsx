import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Radio, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Flame, 
  Clock, 
  Server, 
  Cpu, 
  Search, 
  Sparkles,
  ExternalLink,
  ChevronRight,
  Send,
  AlertTriangle,
  FileText,
  RefreshCw,
  Activity,
  Layers,
  Inbox
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { SeverityBadge, OutcomeBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export const OverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    overviewMetrics,
    incidents, 
    events, 
    logSources, 
    isLoading,
    error,
    isStale,
    lastUpdated,
    autonomousResponseGlobalEnabled,
    fetchOverviewMetrics,
    fetchIncidents,
    fetchEvents,
    fetchSources,
    setSelectedIncidentId,
    executePlaybookAction
  } = useSecurityStore();

  const [promptInput, setPromptInput] = useState('');
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedWindow, setSelectedWindow] = useState<'1h' | '24h' | '7d'>('24h');

  // Load real data from backend on mount and when window changes
  useEffect(() => {
    let isMounted = true;
    const loadAll = async () => {
      await Promise.all([
        fetchOverviewMetrics(selectedWindow),
        fetchIncidents({ limit: 5 }),
        fetchEvents({ limit: 8 }),
        fetchSources()
      ]);
    };
    loadAll();

    // Auto-refresh metrics every 15 seconds to reflect incoming events
    const interval = setInterval(() => {
      if (isMounted) {
        fetchOverviewMetrics(selectedWindow);
        fetchEvents({ limit: 8 });
        fetchIncidents({ limit: 5 });
      }
    }, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedWindow]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchOverviewMetrics(selectedWindow),
      fetchIncidents({ limit: 5 }),
      fetchEvents({ limit: 8 }),
      fetchSources()
    ]);
    setIsRefreshing(false);
  };

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;
    setIsSynthesizing(true);
    setTimeout(() => {
      setIsSynthesizing(false);
      navigate(`/copilot?q=${encodeURIComponent(promptInput.trim())}`);
    }, 250);
  };

  // Find real critical incident needing operator attention, if any exists in DB
  const criticalIncident = incidents.find(i => i.severity === 'critical' && (i.status === 'active' || i.status === 'investigating'));
  const primaryIncident = incidents[0] || null;

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          ERROR / STALE DATA ALERT (Visible if Backend Fails)
          ───────────────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-[#FBF1F0] border-l-4 border-l-[#B94C43] border-y border-r border-[#E3E5DC] rounded-r-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#B94C43] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm text-[#20251F]">
                Backend Telemetry Unavailable
              </h4>
              <p className="text-xs text-[#73796F] mt-0.5">
                {error}. Ensure FastAPI backend server is running on <code className="bg-[#F0F1EB] px-1 py-0.5 rounded text-[11px] text-[#20251F]">http://127.0.0.1:8000</code>.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleManualRefresh}
            isLoading={isRefreshing}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Retry Connection
          </Button>
        </div>
      )}

      {isStale && !error && (
        <div className="bg-[#FAF7EB] border border-[#E9E1B8] rounded-2xl p-3 px-4 flex items-center justify-between text-xs text-[#B28A42]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>
              Showing stale cached data from {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'prior sync'}. Synchronizing with backend...
            </span>
          </div>
          <button 
            onClick={handleManualRefresh} 
            className="font-bold underline hover:text-[#916E2E] cursor-pointer"
          >
            Refresh Now
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          1. EDITORIAL INTELLIGENCE BRIEFING MASTHEAD (Light Botanical)
          ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-white border border-[#E3E5DC] p-6 sm:p-10 shadow-origin-sm">
        {/* Subtle Warm Atmosphere */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#EAF0E6]/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#F0F1EB]/50 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Top metadata kicker */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E3E5DC] pb-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${overviewMetrics?.systemHealth.databaseConnected ? 'bg-[#54765C] animate-pulse' : 'bg-[#B94C43]'}`} />
              <span className="text-[10px] tracking-[0.16em] uppercase font-bold text-[#54765C]">
                SENTINEL AUTONOMOUS INTELLIGENCE BRIEFING
              </span>
              <span className="text-[#CFD4C9]">•</span>
              <span className="text-[#73796F] text-[11px]">
                {lastUpdated ? `SYNC: ${new Date(lastUpdated).toLocaleTimeString()} UTC` : 'INITIALIZING...'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                autonomousResponseGlobalEnabled 
                  ? 'bg-[#EAF0E6] text-[#54765C] border border-[#CFDCC9]' 
                  : 'bg-[#F9ECEB] text-[#B94C43] border border-[#F2D5D3]'
              }`}>
                <Cpu className="w-3 h-3" />
                {autonomousResponseGlobalEnabled ? 'DEFENSE ARMED' : 'DEFENSE HALTED'}
              </span>
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="text-[#73796F] hover:text-[#20251F] text-[10px] flex items-center gap-1 cursor-pointer"
                title="Sync telemetry"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>SYNC</span>
              </button>
            </div>
          </div>

          {/* Main Hero Serif Headline (Origin X Caprasimo) */}
          <div className="max-w-3xl space-y-3">
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-[#20251F] leading-[1.08] tracking-tight">
              Every signal. <span className="text-[#54765C]">One truth.</span>
            </h1>
            <p className="text-base sm:text-lg text-[#73796F] leading-relaxed font-sans max-w-2xl">
              Real-time autonomous cybersecurity intelligence backed by live telemetry. Ingesting, correlating, and evaluating defensive actions without manufactured data.
            </p>
          </div>

          {/* Natural Language Investigation Directive Bar */}
          <div className="pt-2">
            <form onSubmit={handlePromptSubmit} className="relative flex items-center max-w-3xl">
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Direct Sentinel: 'Investigate IP 198.51.100.42', 'Assess lateral exposure'..."
                className="w-full bg-[#F0F1EB] border border-[#E3E5DC] hover:border-[#54765C]/60 focus:border-[#54765C] rounded-full px-5 py-3.5 pl-12 text-sm text-[#20251F] placeholder-[#969B91] focus:outline-none transition-all shadow-inner font-sans"
              />
              <Search className="w-5 h-5 text-[#969B91] absolute left-4 pointer-events-none" />
              <button
                type="submit"
                disabled={!promptInput.trim() || isSynthesizing}
                className="absolute right-2 px-5 py-2 rounded-full bg-[#54765C] hover:bg-[#436049] text-white font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-40"
              >
                <span>{isSynthesizing ? 'Synthesizing...' : 'Investigate'}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Clean 4-Phase Telemetry Pipeline Ribbon (REAL DATA ONLY) */}
          <div className="pt-6 border-t border-[#E3E5DC] grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* 1. OBSERVE */}
            <div 
              onClick={() => navigate('/events')}
              className="p-4 rounded-2xl hover:bg-[#F0F1EB] transition-colors cursor-pointer group"
            >
              <div className="text-[10px] font-mono font-bold tracking-[0.16em] text-[#547D70] flex items-center justify-between uppercase">
                <span>1. OBSERVE</span>
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[#547D70]" />
              </div>
              <div className="text-2xl font-mono font-bold text-[#20251F] mt-1">
                {overviewMetrics ? overviewMetrics.totalEvents.toLocaleString() : (isLoading ? '...' : '0')}
              </div>
              <div className="text-xs text-[#73796F] mt-0.5">
                {overviewMetrics?.totalEvents === 0 ? 'No events ingested yet' : 'Telemetry Ingested (24h)'}
              </div>
            </div>

            {/* 2. DETECT */}
            <div 
              onClick={() => navigate('/detections')}
              className="p-4 rounded-2xl hover:bg-[#F0F1EB] transition-colors cursor-pointer group"
            >
              <div className="text-[10px] font-mono font-bold tracking-[0.16em] text-[#B94C43] flex items-center justify-between uppercase">
                <span>2. DETECT</span>
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[#B94C43]" />
              </div>
              <div className="text-2xl font-mono font-bold text-[#20251F] mt-1">
                {overviewMetrics ? overviewMetrics.totalDetections : (isLoading ? '...' : '0')}
                {overviewMetrics && overviewMetrics.criticalDetections > 0 && (
                  <span className="text-xs text-[#B94C43] font-normal ml-1">
                    ({overviewMetrics.criticalDetections} Critical)
                  </span>
                )}
              </div>
              <div className="text-xs text-[#73796F] mt-0.5">
                {overviewMetrics?.totalDetections === 0 ? '0 Behavioral Detections' : 'Behavioral Detections'}
              </div>
            </div>

            {/* 3. INVESTIGATE */}
            <div 
              onClick={() => navigate('/incidents')}
              className="p-4 rounded-2xl hover:bg-[#F0F1EB] transition-colors cursor-pointer group"
            >
              <div className="text-[10px] font-mono font-bold tracking-[0.16em] text-[#C47A45] flex items-center justify-between uppercase">
                <span>3. INVESTIGATE</span>
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[#C47A45]" />
              </div>
              <div className="text-2xl font-mono font-bold text-[#20251F] mt-1">
                {overviewMetrics ? overviewMetrics.activeIncidents : (isLoading ? '...' : '0')}
                <span className="text-xs text-[#C47A45] font-normal ml-1">
                  {overviewMetrics?.activeIncidents === 0 ? 'Active (Clean)' : 'Active'}
                </span>
              </div>
              <div className="text-xs text-[#73796F] mt-0.5">
                {overviewMetrics?.activeIncidents === 0 ? 'No incidents detected' : 'Correlated Incidents'}
              </div>
            </div>

            {/* 4. RESPOND */}
            <div 
              onClick={() => navigate('/response')}
              className="p-4 rounded-2xl hover:bg-[#F0F1EB] transition-colors cursor-pointer group"
            >
              <div className="text-[10px] font-mono font-bold tracking-[0.16em] text-[#64856C] flex items-center justify-between uppercase">
                <span>4. RESPOND</span>
                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-[#64856C]" />
              </div>
              <div className="text-2xl font-mono font-bold text-[#20251F] mt-1">
                {overviewMetrics ? overviewMetrics.totalActionsTaken : (isLoading ? '...' : '0')}
                <span className="text-xs text-[#64856C] font-normal ml-1">Actions</span>
              </div>
              <div className="text-xs text-[#73796F] mt-0.5">
                {overviewMetrics?.totalActionsTaken === 0 ? 'No actions executed' : 'Defensive Actions Taken'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. OPERATOR ACTION REQUIRED STRIP (Real Pending Critical Action)
          ───────────────────────────────────────────────────────────── */}
      {criticalIncident ? (
        <section className="bg-white border-l-4 border-l-[#C47A45] border-y border-r border-[#E3E5DC] rounded-r-3xl p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-origin-sm">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-[#C47A45] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#C47A45]" />
                OPERATOR ACTION REQUIRED
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F9ECEB] text-[#B94C43] border border-[#F2D5D3]">
                CRITICAL INCIDENT {criticalIncident.id}
              </span>
            </div>
            <h3 className="font-display text-xl sm:text-2xl text-[#20251F]">
              {criticalIncident.title}
            </h3>
            <p className="text-sm text-[#73796F] leading-relaxed">
              Target: <strong className="font-mono text-[#20251F]">{criticalIncident.targetAccounts.join(', ') || 'N/A'}</strong> | Adversary: <strong className="font-mono text-[#B94C43]">{criticalIncident.sourceIps.join(', ') || 'Unknown'}</strong>. {criticalIncident.aiSummary?.executiveSummary}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="primary"
              size="md"
              icon={<ShieldCheck className="w-4 h-4" />}
              onClick={() => {
                setSelectedIncidentId(criticalIncident.id);
                navigate('/investigator');
              }}
            >
              Investigate &amp; Contain
            </Button>
          </div>
        </section>
      ) : (
        <section className="bg-white border border-[#E3E5DC] rounded-3xl p-5 px-6 flex items-center justify-between text-xs font-mono shadow-origin-sm">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-[#EAF0E6] flex items-center justify-center text-[#54765C]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-[#20251F]">Autonomous Security Posture: Baseline Secure</span>
              <p className="text-[#73796F] text-[11px] font-sans">
                No active critical incidents requiring manual intervention. Automated correlation rules are active.
              </p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-bold text-[#54765C] bg-[#EAF0E6] px-3 py-1 rounded-full border border-[#CFDCC9]">
            NOMINAL STATE
          </span>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN INTELLIGENCE GRID: INCIDENTS & REASONING
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (7 cols): Priority Incidents & Telemetry Stream */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Priority Incidents Real Queue */}
          <section className="bg-white border border-[#E3E5DC] rounded-3xl overflow-hidden shadow-origin-sm">
            <div className="p-6 border-b border-[#E3E5DC] flex items-center justify-between bg-[#FAFAF7]">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#C47A45]" />
                <h2 className="font-display text-lg text-[#20251F]">
                  Priority Correlated Incidents
                </h2>
              </div>
              <button
                onClick={() => navigate('/incidents')}
                className="text-xs font-mono font-semibold text-[#54765C] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>All Incidents ({incidents.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {incidents.length === 0 ? (
              <div className="p-10 text-center space-y-3 bg-white">
                <div className="w-12 h-12 rounded-full bg-[#EAF0E6] text-[#54765C] mx-auto flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-display text-lg text-[#20251F]">No incidents detected</h3>
                <p className="text-sm text-[#73796F] max-w-md mx-auto">
                  Sentinel AI is actively monitoring normalized telemetry. Correlated incidents will appear here when event clusters meet escalation thresholds.
                </p>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/events')}
                    icon={<Radio className="w-3.5 h-3.5" />}
                  >
                    View Telemetry Stream
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[#E3E5DC]">
                {incidents.slice(0, 3).map((incident) => (
                  <div 
                    key={incident.id} 
                    onClick={() => {
                      setSelectedIncidentId(incident.id);
                      navigate('/incidents');
                    }}
                    className="p-6 hover:bg-[#F0F1EB] transition-colors cursor-pointer space-y-3 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-mono font-bold text-[#54765C]">{incident.id}</span>
                        <SeverityBadge severity={incident.severity} />
                        <span className="text-[10px] font-mono text-[#969B91] uppercase">Risk: {incident.riskScore}/100</span>
                      </div>
                      <span className="text-xs font-mono text-[#969B91] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(incident.createdAt).toLocaleTimeString()}</span>
                      </span>
                    </div>

                    <h3 className="font-display text-xl text-[#20251F] group-hover:text-[#54765C] transition-colors">
                      {incident.title}
                    </h3>

                    <p className="text-sm text-[#73796F] leading-relaxed line-clamp-2">
                      {incident.aiSummary?.executiveSummary || incident.detectionExplanation || 'No executive summary provided.'}
                    </p>

                    <div className="flex items-center gap-3 pt-1 text-xs font-mono text-[#73796F] flex-wrap">
                      <span>Target: <strong className="text-[#20251F]">{incident.targetAccounts?.join(', ') || 'N/A'}</strong></span>
                      <span>•</span>
                      <span>Adversary: <strong className="text-[#B94C43]">{incident.sourceIps?.join(', ') || 'N/A'}</strong></span>
                      <span>•</span>
                      <span>Evidence: <strong className="text-[#20251F]">{incident.eventCount} evts</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Live Normalized Event Stream */}
          <section className="bg-white border border-[#E3E5DC] rounded-3xl overflow-hidden shadow-origin-sm">
            <div className="p-6 border-b border-[#E3E5DC] flex items-center justify-between bg-[#FAFAF7]">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#54765C] animate-pulse" />
                <h2 className="font-display text-lg text-[#20251F]">
                  Live Normalized Telemetry Stream
                </h2>
              </div>
              <button
                onClick={() => navigate('/events')}
                className="text-xs font-mono font-semibold text-[#54765C] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Full Stream ({events.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {events.length === 0 ? (
              <div className="p-10 text-center space-y-3 bg-white">
                <div className="w-12 h-12 rounded-full bg-[#F0F1EB] text-[#73796F] mx-auto flex items-center justify-center">
                  <Inbox className="w-6 h-6" />
                </div>
                <h3 className="font-display text-lg text-[#20251F]">Waiting for incoming telemetry</h3>
                <p className="text-sm text-[#73796F] max-w-md mx-auto">
                  No security events have been ingested yet. Send Syslog (RFC 5424), Windows Event Logs, or structured JSON to the ingestion endpoint.
                </p>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/integrations')}
                    icon={<Server className="w-3.5 h-3.5" />}
                  >
                    Configure Ingestion Sources
                  </Button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[#E3E5DC] font-mono text-xs">
                {events.slice(0, 6).map((evt) => (
                  <div key={evt.id} className="p-4 hover:bg-[#F0F1EB] transition-colors flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <OutcomeBadge outcome={evt.outcome} />
                      <span className="text-[#969B91] text-[11px] shrink-0">
                        {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : ''}
                      </span>
                      <span className="text-[#20251F] font-semibold truncate">
                        {evt.sourceIp} &rarr; {evt.destinationIp}:{evt.destinationPort}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 text-[11px]">
                      <span className="text-[#73796F]">user: <strong className="text-[#20251F]">{evt.username}</strong></span>
                      <span className="px-2 py-0.5 rounded-full bg-[#F0F1EB] border border-[#E3E5DC] text-[#73796F] text-[10px]">
                        {evt.source}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>

        {/* Right Column (5 cols): AI Investigation & Sensor Topology */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* AI Investigation Working Hypothesis Card */}
          <section className="bg-white border border-[#E3E5DC] rounded-3xl p-6 sm:p-7 space-y-5 shadow-origin-sm">
            <div className="flex items-center justify-between border-b border-[#E3E5DC] pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#54765C]" />
                <h2 className="font-display text-lg text-[#20251F]">
                  AI Investigation Reasoning
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#EAF0E6] text-[#54765C] border border-[#CFDCC9] uppercase">
                {primaryIncident ? 'ACTIVE SYNTHESIS' : 'IDLE'}
              </span>
            </div>

            {primaryIncident ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#54765C] font-bold">
                    Case {primaryIncident.id} &bull; {primaryIncident.confidenceScore}% Confidence
                  </div>
                  <h3 className="font-display text-xl text-[#20251F] leading-snug">
                    {primaryIncident.title}
                  </h3>
                  <p className="text-sm text-[#73796F] leading-relaxed">
                    {primaryIncident.aiSummary?.rootCauseAnalysis || primaryIncident.detectionExplanation || 'Continuous analysis active.'}
                  </p>
                </div>

                <div className="space-y-2.5 pt-2 border-t border-[#E3E5DC] text-xs font-mono">
                  <div className="text-[10px] text-[#969B91] uppercase tracking-wider font-bold">
                    Confirmed Telemetry Evidence:
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAFAF7] border border-[#E3E5DC]">
                      <span className="text-[#73796F]">Source Adversary:</span>
                      <span className="text-[#B94C43] font-bold">{primaryIncident.sourceIps?.join(', ') || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAFAF7] border border-[#E3E5DC]">
                      <span className="text-[#73796F]">Target Accounts:</span>
                      <span className="text-[#20251F] font-bold">{primaryIncident.targetAccounts?.join(', ') || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAFAF7] border border-[#E3E5DC]">
                      <span className="text-[#73796F]">Correlated Events:</span>
                      <span className="text-[#20251F] font-bold">{primaryIncident.eventCount} events</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="md"
                  className="w-full"
                  onClick={() => {
                    setSelectedIncidentId(primaryIncident.id);
                    navigate('/investigator');
                  }}
                  icon={<Search className="w-4 h-4" />}
                >
                  Open Investigation Dossier
                </Button>
              </div>
            ) : (
              <div className="py-6 text-center space-y-2 text-[#73796F]">
                <p className="text-sm">
                  Autonomous Reasoning Standby. No active incidents require analytical synthesis.
                </p>
                <p className="text-xs text-[#969B91]">
                  AI hypotheses and root-cause analysis will automatically construct upon threat detection.
                </p>
              </div>
            )}
          </section>

          {/* Telemetry Sensor Forwarder Matrix */}
          <section className="bg-white border border-[#E3E5DC] rounded-3xl p-6 sm:p-7 space-y-5 shadow-origin-sm">
            <div className="flex items-center justify-between border-b border-[#E3E5DC] pb-4">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-[#54765C]" />
                <h2 className="font-display text-lg text-[#20251F]">
                  Ingestion Sensors ({logSources.length})
                </h2>
              </div>
              <span className="text-[10px] font-mono text-[#54765C] font-bold uppercase tracking-wider">
                {overviewMetrics?.systemHealth.databaseConnected ? 'SYSTEM ONLINE' : 'DISCONNECTED'}
              </span>
            </div>

            {logSources.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#969B91]">
                No ingestion sensors configured yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {logSources.map((source) => (
                  <div 
                    key={source.id} 
                    className="p-3.5 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC] flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full ${source.status === 'active' ? 'bg-[#54765C]' : 'bg-[#B94C43]'}`} />
                      <div>
                        <div className="text-[#20251F] font-bold text-xs">{source.name}</div>
                        <div className="text-[10px] text-[#969B91]">{source.host}:{source.port}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#20251F] text-xs font-bold">
                        {source.eventsProcessed24h.toLocaleString()} evts
                      </div>
                      <div className="text-[9px] text-[#54765C] font-bold uppercase">
                        {source.status.toUpperCase()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs font-mono"
              onClick={() => navigate('/integrations')}
            >
              Configure Sensor Forwarders
            </Button>
          </section>

        </div>

      </div>

    </div>
  );
};
