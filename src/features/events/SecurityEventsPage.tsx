import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Terminal, 
  Filter, 
  Layers, 
  ArrowRight,
  RefreshCw,
  Inbox
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { SeverityBadge, OutcomeBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export const SecurityEventsPage: React.FC = () => {
  const { events, totalEventsCount, fetchEvents, addNotification } = useSecurityStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchEvents({
      source: sourceFilter,
      outcome: outcomeFilter,
      severity: severityFilter,
      query: searchQuery || undefined,
      limit: 100
    });
  }, [fetchEvents, sourceFilter, outcomeFilter, severityFilter, searchQuery]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchEvents({
      source: sourceFilter,
      outcome: outcomeFilter,
      severity: severityFilter,
      query: searchQuery || undefined,
      limit: 100
    });
    setIsRefreshing(false);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    addNotification({
      type: 'info',
      title: 'Copied Telemetry',
      message: `Event ${id} copied to clipboard.`
    });
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & EVENT THROUGHPUT COUNTER
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#E3E5DC] rounded-3xl p-6 sm:p-8 shadow-origin-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#547D70] animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-[#547D70] flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" />
                TELEMETRY INGESTION STREAM
              </span>
              <span className="text-[#CFD4C9]">•</span>
              <span className="text-[10px] font-mono text-[#73796F]">
                RFC 5424 / SYS / AUTH
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl text-[#20251F] tracking-tight">
              Normalized Security Events
            </h1>
            <p className="text-sm text-[#73796F] max-w-2xl leading-relaxed">
              Continuous live stream of ingested, parsed, and cryptographically fingerprinted security log events.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-mono font-bold text-[#20251F]">
                {totalEventsCount.toLocaleString()}
              </div>
              <div className="text-xs text-[#73796F]">Total Persisted Events</div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2.5 rounded-full bg-[#F0F1EB] hover:bg-white border border-[#E3E5DC] text-[#73796F] hover:text-[#20251F] transition-colors cursor-pointer"
              title="Refresh stream"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="pt-6 mt-6 border-t border-[#E3E5DC] grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search IP, user, event ID..."
              className="w-full bg-[#F0F1EB] border border-[#E3E5DC] rounded-full px-4 py-2 text-xs text-[#20251F] placeholder-[#969B91] focus:outline-none focus:border-[#54765C]"
            />
            <Search className="w-3.5 h-3.5 text-[#969B91] absolute right-3 top-2.5 pointer-events-none" />
          </div>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-[#F0F1EB] border border-[#E3E5DC] rounded-full px-4 py-2 text-xs text-[#20251F] focus:outline-none focus:border-[#54765C] cursor-pointer"
          >
            <option value="all">SOURCE: ALL</option>
            <option value="linux_ssh">Linux SSH</option>
            <option value="windows_security">Windows Event Log</option>
            <option value="app_auth">SAML / SSO</option>
            <option value="nginx_access">Nginx Gateway</option>
          </select>

          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="bg-[#F0F1EB] border border-[#E3E5DC] rounded-full px-4 py-2 text-xs text-[#20251F] focus:outline-none focus:border-[#54765C] cursor-pointer"
          >
            <option value="all">OUTCOME: ALL</option>
            <option value="failure">Failure</option>
            <option value="success">Success</option>
            <option value="blocked">Blocked</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-[#F0F1EB] border border-[#E3E5DC] rounded-full px-4 py-2 text-xs text-[#20251F] focus:outline-none focus:border-[#54765C] cursor-pointer"
          >
            <option value="all">SEVERITY: ALL</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. EVENTS TABLE & RAW RFC 5424 TELEMETRY DRAWER
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#E3E5DC] rounded-3xl overflow-hidden shadow-origin-sm">
        {events.length === 0 ? (
          <div className="p-16 text-center space-y-3 bg-white">
            <div className="w-12 h-12 rounded-full bg-[#F0F1EB] text-[#73796F] mx-auto flex items-center justify-center">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="font-display text-lg text-[#20251F]">
              Waiting for incoming security telemetry
            </h3>
            <p className="text-sm text-[#73796F] max-w-md mx-auto">
              No security events match the current criteria. Ingest RFC 5424 Syslog or JSON authentication events into the Sentinel forwarder gateway.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E3E5DC]">
            {events.map((evt) => {
              const isExpanded = expandedId === evt.id;

              return (
                <div key={evt.id} className="transition-colors hover:bg-[#FAFAF7]">
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer font-mono text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <OutcomeBadge outcome={evt.outcome} />
                      <SeverityBadge severity={evt.severity} />
                      <span className="font-bold text-[#54765C] shrink-0">{evt.id}</span>
                      <span className="text-[#969B91] text-[11px] shrink-0">
                        {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : ''}
                      </span>
                      <span className="text-[#20251F] font-semibold truncate">
                        {evt.sourceIp} &rarr; {evt.destinationIp}:{evt.destinationPort}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 text-xs">
                      <span className="text-[#73796F]">
                        user: <strong className="text-[#20251F]">{evt.username}</strong>
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#F0F1EB] border border-[#E3E5DC] text-[#73796F] text-[10px]">
                        {evt.source}
                      </span>
                      <button className="text-[#73796F] hover:text-[#20251F]">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expandable RFC 5424 Raw Payload Drawer */}
                  {isExpanded && (
                    <div className="p-6 bg-[#FAFAF7] border-t border-[#E3E5DC] space-y-4 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#54765C]">
                          RAW PERSISTED TELEMETRY PAYLOAD
                        </span>
                        <button
                          onClick={() => copyToClipboard(evt.rawEvent, evt.id)}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E3E5DC] text-[11px] text-[#73796F] hover:text-[#20251F] cursor-pointer"
                        >
                          {copiedId === evt.id ? <Check className="w-3.5 h-3.5 text-[#54765C]" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedId === evt.id ? 'Copied' : 'Copy Payload'}</span>
                        </button>
                      </div>

                      <pre className="p-4 rounded-2xl bg-white border border-[#E3E5DC] text-[#20251F] overflow-x-auto text-[11px] leading-relaxed whitespace-pre-wrap">
                        {evt.rawEvent}
                      </pre>

                      {evt.parsedFields && Object.keys(evt.parsedFields).length > 0 && (
                        <div className="space-y-2 pt-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[#969B91]">
                            PARSED TELEMETRY FIELDS
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                            {Object.entries(evt.parsedFields).map(([k, v]) => (
                              <div key={k} className="p-2.5 rounded-xl bg-white border border-[#E3E5DC]">
                                <span className="text-[#969B91] block text-[9px] uppercase">{k}</span>
                                <span className="text-[#20251F] font-bold truncate block">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
};
