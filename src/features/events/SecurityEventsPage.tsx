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
import { SeverityBadge, OutcomeBadge, Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

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
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER & EVENT THROUGHPUT COUNTER
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#E3E5DC] rounded-3xl p-6 sm:p-8 shadow-origin-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#54765C]" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-[#54765C] flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" />
                TELEMETRY INGESTION STREAM
              </span>
              <span className="text-[#CFD4C9]">•</span>
              <span className="text-[10px] font-mono text-[#73796F]">NORMALIZED RFC 5424</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl text-[#20251F] tracking-tight">
              Security Events Stream
            </h1>
            <p className="text-sm text-[#73796F] max-w-2xl leading-relaxed">
              Normalized real-time telemetry stream ingested across enterprise bastion, auth gateways, and directory services.
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#EAF0E6] border border-[#CFDCC9] text-xs font-mono font-bold text-[#54765C]">
            <span className="w-2 h-2 rounded-full bg-[#54765C] animate-pulse" />
            <span>Active Stream: {events.length} events</span>
          </div>
        </div>

        {/* Global Event Filter Bar */}
        <div className="pt-6 mt-6 border-t border-[#E3E5DC] flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by IP, username, raw payload, or event ID..."
              className="w-full bg-[#F0F1EB] border border-[#E3E5DC] focus:border-[#54765C] rounded-full px-4 py-2.5 pl-10 text-xs text-[#20251F] placeholder-[#969B91] font-mono focus:outline-none transition-colors shadow-inner"
            />
            <Search className="w-4 h-4 text-[#969B91] absolute left-3.5 top-3 pointer-events-none" />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-[#F0F1EB] border border-[#E3E5DC] text-[#20251F] text-xs rounded-full px-4 py-2.5 font-mono focus:outline-none focus:border-[#54765C] cursor-pointer"
            >
              <option value="all">All Sources</option>
              <option value="linux_auth">linux_auth (bastion-01)</option>
              <option value="linux_ssh">linux_ssh (sshd daemon)</option>
              <option value="saml_gateway">saml_gateway (sso-gw-02)</option>
              <option value="windows_ad">windows_ad (AD FS / DC)</option>
              <option value="app_auth">app_auth (customer portal)</option>
            </select>

            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
              className="bg-[#F0F1EB] border border-[#E3E5DC] text-[#20251F] text-xs rounded-full px-4 py-2.5 font-mono focus:outline-none focus:border-[#54765C] cursor-pointer"
            >
              <option value="all">All Outcomes</option>
              <option value="failure">FAILURE</option>
              <option value="success">SUCCESS</option>
              <option value="blocked">BLOCKED</option>
              <option value="challenged">CHALLENGED</option>
            </select>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. EVENT STREAM LEDGER (With Expandable RFC 5424 Payload)
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#E3E5DC] rounded-3xl overflow-hidden shadow-origin-sm">
        <div className="p-5 border-b border-[#E3E5DC] bg-[#FAFAF7] flex items-center justify-between text-xs font-mono font-bold text-[#73796F] tracking-wider uppercase">
          <span>Ingested Event Pipeline</span>
          <span>Click Event to Inspect Payload</span>
        </div>

        <div className="divide-y divide-[#E3E5DC]">
          {filteredEvents.map((evt) => {
            const isExpanded = expandedId === evt.id;

            return (
              <div
                key={evt.id}
                onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                className="hover:bg-[#F0F1EB] transition-colors cursor-pointer group"
              >
                {/* Event Summary Row */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex items-center gap-3 min-w-0">
                    <OutcomeBadge outcome={evt.outcome} />
                    <span className="font-bold text-[#54765C] shrink-0">{evt.id}</span>
                    <span className="text-[#969B91] shrink-0">
                      {evt.timestamp.split('T')[1]?.replace('Z', ' UTC')}
                    </span>
                    <span className="text-[#20251F] font-bold truncate">
                      {evt.sourceIp} &rarr; {evt.destinationIp}:{evt.destinationPort}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs shrink-0 justify-between md:justify-end">
                    <span className="text-[#73796F]">user: <strong className="text-[#20251F]">{evt.username}</strong></span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FAFAF7] border border-[#E3E5DC] text-[#73796F] text-[10px]">
                      {evt.source}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-[#20251F]" /> : <ChevronDown className="w-4 h-4 text-[#969B91]" />}
                  </div>
                </div>

                {/* Expandable RFC 5424 Telemetry String Drawer */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 bg-[#FAFAF7] border-t border-[#E3E5DC] text-xs font-mono space-y-3">
                    <div className="flex items-center justify-between text-xs text-[#73796F] pt-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#969B91]">
                        RAW RFC 5424 TELEMETRY STRING:
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(evt.rawEvent, evt.id);
                        }}
                        className="text-[#54765C] hover:underline flex items-center gap-1.5 cursor-pointer font-bold text-xs"
                      >
                        {copiedId === evt.id ? <Check className="w-3.5 h-3.5 text-[#64856C]" /> : <Copy className="w-3.5 h-3.5 text-[#969B91]" />}
                        Copy Raw Payload
                      </button>
                    </div>

                    <pre className="p-4 bg-white rounded-2xl border border-[#E3E5DC] text-[#20251F] text-xs leading-relaxed overflow-x-auto shadow-inner whitespace-pre-wrap">
                      {evt.rawEvent}
                    </pre>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-[11px]">
                      <div className="p-2.5 rounded-xl bg-white border border-[#E3E5DC]">
                        <span className="text-[#969B91] uppercase text-[9px] block">Event Type</span>
                        <span className="text-[#20251F] font-bold block mt-0.5">{evt.eventType}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-[#E3E5DC]">
                        <span className="text-[#969B91] uppercase text-[9px] block">Source Host / IP</span>
                        <span className="text-[#20251F] font-bold block mt-0.5">{evt.sourceIp}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-[#E3E5DC]">
                        <span className="text-[#969B91] uppercase text-[9px] block">Destination Port</span>
                        <span className="text-[#20251F] font-bold block mt-0.5">{evt.destinationPort}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-[#E3E5DC]">
                        <span className="text-[#969B91] uppercase text-[9px] block">Normalizer Status</span>
                        <span className="text-[#64856C] font-bold block mt-0.5">PARSED (RFC 5424)</span>
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
