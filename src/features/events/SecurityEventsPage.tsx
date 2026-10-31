import React, { useState } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { SeverityBadge, OutcomeBadge } from '@/components/ui/Badge';

export const SecurityEventsPage: React.FC = () => {
  const { events, addNotification } = useSecurityStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [outcomeFilter, setOutcomeFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>('EVT-2026-SSH-036');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredEvents = events.filter((e) => {
    if (sourceFilter !== 'all' && e.source !== sourceFilter) return false;
    if (outcomeFilter !== 'all' && e.outcome !== outcomeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        e.id.toLowerCase().includes(q) ||
        e.sourceIp.includes(q) ||
        e.username.toLowerCase().includes(q) ||
        e.eventType.toLowerCase().includes(q) ||
        e.rawEvent.toLowerCase().includes(q)
      );
    }
    return true;
  });

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
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & EVENT THROUGHPUT COUNTER
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#10131B] border border-[#1C2230] rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-[#38BDF8] flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-[#38BDF8] animate-pulse" />
                TELEMETRY INGESTION STREAM
              </span>
              <span className="text-[#64748B]">•</span>
              <span className="text-[10px] font-mono text-[#94A3B8]">NORMALIZED RFC 5424 FORMAT</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Security Events
            </h1>
            <p className="text-xs text-[#94A3B8]">
              High-throughput security event stream ingested across enterprise bastion, auth, and gateway forwarders.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs px-3.5 py-1.5 rounded-lg bg-[#07080B] border border-[#1C2230] text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span>Active Filtered Stream: <strong className="text-[#38BDF8]">{filteredEvents.length}</strong> events</span>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 mt-4 border-t border-[#1C2230] font-mono text-xs">
          <div className="relative w-full sm:flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by IP, username, raw payload, or event ID..."
              className="w-full bg-[#07080B] border border-[#1C2230] focus:border-[#38BDF8] rounded-lg px-3.5 py-2 pl-9 text-xs text-white placeholder-[#64748B] font-mono focus:outline-none"
            />
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5 pointer-events-none" />
          </div>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full sm:w-48 bg-[#07080B] border border-[#1C2230] text-white px-3 py-2 rounded-lg text-xs font-mono focus:outline-none"
          >
            <option value="all">All Sources</option>
            <option value="linux_ssh">Linux SSH</option>
            <option value="linux_auth">Linux PAM</option>
            <option value="windows_security">Windows AD Security</option>
            <option value="app_auth">SAML SSO</option>
          </select>

          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="w-full sm:w-40 bg-[#07080B] border border-[#1C2230] text-white px-3 py-2 rounded-lg text-xs font-mono focus:outline-none"
          >
            <option value="all">All Outcomes</option>
            <option value="failure">Failure</option>
            <option value="success">Success</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. HIGH-DENSITY EVENT STREAM LIST
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-[#10131B] border border-[#1C2230] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#1C2230] bg-[#0C0E14] flex items-center justify-between text-xs font-mono text-[#64748B]">
          <span>INGESTED EVENT STREAM</span>
          <span>CLICK EVENT TO EXPAND RAW PAYLOAD</span>
        </div>

        <div className="divide-y divide-[#1C2230]">
          {filteredEvents.map((evt) => {
            const isExpanded = expandedId === evt.id;

            return (
              <div key={evt.id} className="transition-colors hover:bg-[#121622]">
                <div 
                  onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer text-xs font-mono"
                >
                  <div className="flex items-center gap-3">
                    <OutcomeBadge outcome={evt.outcome} />
                    <span className="text-[#38BDF8] font-bold shrink-0">{evt.id}</span>
                    <span className="text-[#64748B] text-[11px] shrink-0">
                      {evt.timestamp.split('T')[1]?.replace('Z', ' UTC')}
                    </span>
                    <span className="text-white font-semibold truncate">
                      {evt.sourceIp} &rarr; {evt.destinationIp}:{evt.destinationPort}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-[11px]">
                    <span className="text-slate-300">user: <strong className="text-white">{evt.username}</strong></span>
                    <span className="px-2 py-0.5 rounded bg-[#07080B] border border-[#1C2230] text-[#64748B]">
                      {evt.source}
                    </span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[#64748B]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />}
                  </div>
                </div>

                {/* Expanded Raw Syslog & Parsed Fields Drawer */}
                {isExpanded && (
                  <div className="p-4 bg-[#07080B] border-t border-[#1C2230] font-mono text-xs space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-[#64748B] uppercase pb-1">
                        <span>Raw Telemetry String:</span>
                        <button
                          onClick={() => copyToClipboard(evt.rawEvent, evt.id)}
                          className="hover:text-white flex items-center gap-1 cursor-pointer text-[#38BDF8]"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy Raw Payload</span>
                        </button>
                      </div>
                      <div className="p-3 rounded-lg bg-[#0C0E14] border border-[#1C2230] text-slate-300 text-[11px] break-all leading-relaxed">
                        {evt.rawEvent}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#1C2230] text-[11px]">
                      <div>
                        <span className="text-[#64748B] text-[10px] uppercase block">Event Type</span>
                        <span className="text-white font-bold block mt-0.5">{evt.eventType}</span>
                      </div>
                      <div>
                        <span className="text-[#64748B] text-[10px] uppercase block">Destination Port</span>
                        <span className="text-white font-bold block mt-0.5">{evt.destinationPort}</span>
                      </div>
                      <div>
                        <span className="text-[#64748B] text-[10px] uppercase block">Geo ASN</span>
                        <span className="text-[#38BDF8] font-bold block mt-0.5">{evt.parsedFields.asn || 'AS64496'}</span>
                      </div>
                      <div>
                        <span className="text-[#64748B] text-[10px] uppercase block">Auth Protocol</span>
                        <span className="text-white font-bold block mt-0.5">{evt.parsedFields.authMethod || 'ssh2/publickey'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
};

// Aliased export so existing imports keep functioning
export const SecurityActivityPage = SecurityEventsPage;
