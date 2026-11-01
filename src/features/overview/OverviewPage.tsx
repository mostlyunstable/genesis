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
          1. ENVIRONMENT STATUS & COPILOT PROMPT MASTHEAD
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#E3E5DC] rounded-3xl p-6 sm:p-8 shadow-origin-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${overviewMetrics?.systemHealth.databaseConnected ? 'bg-[#54765C]' : 'bg-[#B94C43]'}`} />
              <span className="font-semibold text-[#54765C]">
                {criticalIncident ? 'INCIDENT ACTIVE' : 'ENVIRONMENT SECURE'}
              </span>
              <span className="text-[#CFD4C9]">•</span>
              <span className="text-[#73796F]">
                {lastUpdated ? `Synced ${new Date(lastUpdated).toLocaleTimeString()}` : 'Connecting...'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-medium text-[#20251F] tracking-tight">
              {criticalIncident ? 'Action required on active incident' : 'Security posture is nominal'}
            </h1>
            <p className="text-sm text-[#73796F]">
              {criticalIncident 
                ? `Incident ${criticalIncident.id} requires review. ${criticalIncident.sourceIps.length} adversary sources identified.`
                : 'All telemetry pipelines are reporting normally with zero critical alerts.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {criticalIncident && (
              <Button
                variant="primary"
                size="md"
                icon={<ShieldCheck className="w-4 h-4" />}
                onClick={() => {
                  setSelectedIncidentId(criticalIncident.id);
                  navigate('/investigator');
                }}
              >
                Investigate & Contain
              </Button>
            )}
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-2.5 rounded-full border border-[#E3E5DC] text-[#73796F] hover:text-[#20251F] hover:bg-[#F0F1EB] transition-colors cursor-pointer"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Natural Language Query Bar */}
        <div>
          <form onSubmit={handlePromptSubmit} className="relative flex items-center">
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Ask Copilot anything about your security data..."
              className="w-full bg-[#F0F1EB] border border-[#E3E5DC] hover:border-[#54765C]/60 focus:border-[#54765C] rounded-full px-5 py-3 pl-12 text-sm text-[#20251F] placeholder-[#969B91] focus:outline-none transition-all shadow-inner font-sans"
            />
            <Search className="w-4 h-4 text-[#969B91] absolute left-4.5 pointer-events-none" />
            <button
              type="submit"
              disabled={!promptInput.trim() || isSynthesizing}
              className="absolute right-1.5 px-4 py-1.5 rounded-full bg-[#54765C] hover:bg-[#436049] text-white font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-40"
            >
              <span>{isSynthesizing ? 'Searching...' : 'Ask'}</span>
              <Send className="w-3 h-3" />
            </button>
          </form>
        </div>

        {/* 4 Clean Metric Cards */}
        <div className="pt-2 grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-[#E3E5DC]">
          <div 
            onClick={() => navigate('/events')}
            className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC] hover:bg-[#F0F1EB] transition-colors cursor-pointer group"
          >
            <div className="text-xs text-[#73796F] font-medium flex items-center justify-between">
              <span>Events (24h)</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#54765C]" />
            </div>
            <div className="text-2xl font-mono font-bold text-[#20251F] mt-1.5">
              {overviewMetrics ? overviewMetrics.totalEvents.toLocaleString() : (isLoading ? '...' : '0')}
            </div>
          </div>

          <div 
            onClick={() => navigate('/detections')}
            className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC] hover:bg-[#F0F1EB] transition-colors cursor-pointer group"
          >
            <div className="text-xs text-[#73796F] font-medium flex items-center justify-between">
              <span>Detections</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#54765C]" />
            </div>
            <div className="text-2xl font-mono font-bold text-[#20251F] mt-1.5">
              {overviewMetrics ? overviewMetrics.totalDetections : (isLoading ? '...' : '0')}
              {overviewMetrics && overviewMetrics.criticalDetections > 0 && (
                <span className="text-xs text-[#B94C43] font-normal ml-1.5">
                  ({overviewMetrics.criticalDetections} critical)
                </span>
              )}
            </div>
          </div>

          <div 
            onClick={() => navigate('/incidents')}
            className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC] hover:bg-[#F0F1EB] transition-colors cursor-pointer group"
          >
            <div className="text-xs text-[#73796F] font-medium flex items-center justify-between">
              <span>Active Incidents</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#54765C]" />
            </div>
            <div className="text-2xl font-mono font-bold text-[#20251F] mt-1.5">
              {overviewMetrics ? overviewMetrics.activeIncidents : (isLoading ? '...' : '0')}
            </div>
          </div>

          <div 
            onClick={() => navigate('/response')}
            className="p-4 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC] hover:bg-[#F0F1EB] transition-colors cursor-pointer group"
          >
            <div className="text-xs text-[#73796F] font-medium flex items-center justify-between">
              <span>Actions Taken</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#54765C]" />
            </div>
            <div className="text-2xl font-mono font-bold text-[#20251F] mt-1.5">
              {overviewMetrics ? overviewMetrics.totalActionsTaken : (isLoading ? '...' : '0')}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN OPERATIONAL GRID: INCIDENTS & RECENT TELEMETRY
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (7 cols): Incidents & Events */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Priority Incidents */}
          <section className="bg-white border border-[#E3E5DC] rounded-3xl overflow-hidden shadow-origin-sm">
            <div className="p-5 px-6 border-b border-[#E3E5DC] flex items-center justify-between bg-[#FAFAF7]">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#C47A45]" />
                <h2 className="font-display text-base font-semibold text-[#20251F]">
                  Active Incidents
                </h2>
              </div>
              <button
                onClick={() => navigate('/incidents')}
                className="text-xs font-mono font-medium text-[#54765C] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View all ({incidents.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {incidents.length === 0 ? (
              <div className="p-8 text-center space-y-2 bg-white">
                <div className="w-10 h-10 rounded-full bg-[#EAF0E6] text-[#54765C] mx-auto flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-display text-base text-[#20251F]">No incidents detected</h3>
                <p className="text-xs text-[#73796F] max-w-sm mx-auto">
                  Sentinel is monitoring telemetry. Incidents will appear here when event clusters meet escalation criteria.
                </p>
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
                    className="p-5 hover:bg-[#F0F1EB] transition-colors cursor-pointer space-y-2.5 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#54765C]">{incident.id}</span>
                        <SeverityBadge severity={incident.severity} />
                        <span className="text-[10px] font-mono text-[#969B91]">Risk: {incident.riskScore}/100</span>
                      </div>
                      <span className="text-xs font-mono text-[#969B91] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(incident.createdAt).toLocaleTimeString()}</span>
                      </span>
                    </div>

                    <h3 className="font-display text-lg text-[#20251F] group-hover:text-[#54765C] transition-colors">
                      {incident.title}
                    </h3>

                    <p className="text-xs text-[#73796F] leading-relaxed line-clamp-2">
                      {incident.aiSummary?.executiveSummary || incident.detectionExplanation || 'No summary provided.'}
                    </p>

                    <div className="flex items-center gap-3 pt-0.5 text-xs font-mono text-[#73796F] flex-wrap">
                      <span>Target: <strong className="text-[#20251F]">{incident.targetAccounts?.join(', ') || 'N/A'}</strong></span>
                      <span>•</span>
                      <span>Source: <strong className="text-[#B94C43]">{incident.sourceIps?.join(', ') || 'N/A'}</strong></span>
                      <span>•</span>
                      <span>{incident.eventCount} events</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Events */}
          <section className="bg-white border border-[#E3E5DC] rounded-3xl overflow-hidden shadow-origin-sm">
            <div className="p-5 px-6 border-b border-[#E3E5DC] flex items-center justify-between bg-[#FAFAF7]">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#54765C]" />
                <h2 className="font-display text-base font-semibold text-[#20251F]">
                  Recent Events
                </h2>
              </div>
              <button
                onClick={() => navigate('/events')}
                className="text-xs font-mono font-medium text-[#54765C] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View all ({events.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {events.length === 0 ? (
              <div className="p-8 text-center space-y-2 bg-white">
                <div className="w-10 h-10 rounded-full bg-[#F0F1EB] text-[#73796F] mx-auto flex items-center justify-center">
                  <Inbox className="w-5 h-5" />
                </div>
                <h3 className="font-display text-base text-[#20251F]">No events ingested yet</h3>
                <p className="text-xs text-[#73796F] max-w-sm mx-auto">
                  Forward syslog (RFC 5424) or auth logs to begin streaming.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#E3E5DC] font-mono text-xs">
                {events.slice(0, 5).map((evt) => (
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

        {/* Right Column (5 cols): Investigation & Sensors */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Investigation Summary Card */}
          <section className="bg-white border border-[#E3E5DC] rounded-3xl p-5 sm:p-6 space-y-4 shadow-origin-sm">
            <div className="flex items-center justify-between border-b border-[#E3E5DC] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#54765C]" />
                <h2 className="font-display text-base font-semibold text-[#20251F]">
                  Investigation Summary
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[#EAF0E6] text-[#54765C] border border-[#CFDCC9] uppercase">
                {primaryIncident ? 'Active' : 'Standby'}
              </span>
            </div>

            {primaryIncident ? (
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#54765C] font-semibold">
                    Incident {primaryIncident.id} • {primaryIncident.confidenceScore}% confidence
                  </div>
                  <h3 className="font-display text-lg text-[#20251F] leading-snug">
                    {primaryIncident.title}
                  </h3>
                  <p className="text-xs text-[#73796F] leading-relaxed">
                    {primaryIncident.aiSummary?.rootCauseAnalysis || primaryIncident.detectionExplanation || 'Analysis in progress.'}
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-[#E3E5DC] text-xs font-mono">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#FAFAF7] border border-[#E3E5DC]">
                    <span className="text-[#73796F]">Adversary IP:</span>
                    <span className="text-[#B94C43] font-bold">{primaryIncident.sourceIps?.join(', ') || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#FAFAF7] border border-[#E3E5DC]">
                    <span className="text-[#73796F]">Target Identity:</span>
                    <span className="text-[#20251F] font-bold">{primaryIncident.targetAccounts?.join(', ') || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-[#FAFAF7] border border-[#E3E5DC]">
                    <span className="text-[#73796F]">Evidence Count:</span>
                    <span className="text-[#20251F] font-bold">{primaryIncident.eventCount} events</span>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    setSelectedIncidentId(primaryIncident.id);
                    navigate('/investigator');
                  }}
                  icon={<Search className="w-3.5 h-3.5" />}
                >
                  Open Investigation Dossier
                </Button>
              </div>
            ) : (
              <div className="py-6 text-center space-y-1.5 text-[#73796F]">
                <p className="text-xs">
                  No active incidents requiring analysis.
                </p>
              </div>
            )}
          </section>

          {/* Sensor Matrix */}
          <section className="bg-white border border-[#E3E5DC] rounded-3xl p-5 sm:p-6 space-y-4 shadow-origin-sm">
            <div className="flex items-center justify-between border-b border-[#E3E5DC] pb-3">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-[#54765C]" />
                <h2 className="font-display text-base font-semibold text-[#20251F]">
                  Sensors ({logSources.length})
                </h2>
              </div>
              <span className="text-[10px] font-mono text-[#54765C] font-semibold uppercase">
                {overviewMetrics?.systemHealth.databaseConnected ? 'Connected' : 'Offline'}
              </span>
            </div>

            {logSources.length === 0 ? (
              <div className="py-4 text-center text-xs text-[#969B91]">
                No sensors configured.
              </div>
            ) : (
              <div className="space-y-2">
                {logSources.map((source) => (
                  <div 
                    key={source.id} 
                    className="p-3 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC] flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${source.status === 'active' ? 'bg-[#54765C]' : 'bg-[#B94C43]'}`} />
                      <div>
                        <div className="text-[#20251F] font-semibold text-xs">{source.name}</div>
                        <div className="text-[10px] text-[#969B91]">{source.host}:{source.port}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[#20251F] text-xs font-semibold">
                        {source.eventsProcessed24h.toLocaleString()} evts
                      </div>
                      <div className="text-[9px] text-[#54765C] uppercase">
                        {source.status}
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
              Configure Sensors
            </Button>
          </section>

        </div>

      </div>

    </div>
  );
};
