import React, { useState } from 'react';
import { 
  Activity, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Terminal,
  Radio,
  RadioTower
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { SeverityBadge, OutcomeBadge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Input';

export const SecurityActivityPage: React.FC = () => {
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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
        <div>
          <div className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#38BDF8] uppercase mb-1">
            INGESTION MONITORING
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
            Security Activity
          </h2>
          <p className="text-sm text-slate-300 font-sans mt-0.5">
            Raw and normalized event telemetry observed across ingestion forwarders.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs px-3.5 py-1.5 rounded-full bg-[#0F1523] border border-[#1E293B] text-slate-300">
          <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
          <span>Active Stream: <strong className="text-[#38BDF8]">{filteredEvents.length}</strong> signals</span>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-[#0F1523] border border-[#1E293B] rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-xs">
        <div className="w-full sm:w-80">
          <Input
            icon={<Search className="w-3.5 h-3.5" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter telemetry by address, user, or event..."
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full sm:w-48"
          >
            <option value="all">All Log Sources</option>
            <option value="linux_ssh">Linux SSH</option>
            <option value="linux_auth">Linux PAM</option>
            <option value="windows_security">Windows AD Security</option>
            <option value="app_auth">SAML SSO</option>
          </Select>

          <Select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            className="w-full sm:w-40"
          >
            <option value="all">All Outcomes</option>
            <option value="failure">Failure</option>
            <option value="success">Success</option>
            <option value="blocked">Blocked</option>
          </Select>
        </div>
      </div>

      {/* Readable Event Stream */}
      <div className="bg-[#0F1523] border border-[#1E293B] rounded-2xl shadow-cyber-lg overflow-hidden divide-y divide-[#1E293B]">
        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#94A3B8] font-mono">
            No telemetry received matching criteria.
          </div>
        ) : (
          filteredEvents.slice(0, 25).map((evt) => {
            const isExpanded = expandedId === evt.id;
            const isCompromise = evt.id === 'EVT-2026-SSH-036';

            return (
              <div
                key={evt.id}
                className={`transition-colors cursor-pointer ${
                  isCompromise ? 'bg-[#FF5722]/10 hover:bg-[#FF5722]/15' : 'hover:bg-[#141C2E]'
                }`}
                onClick={() => setExpandedId(isExpanded ? null : evt.id)}
              >
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-[#38BDF8] text-xs font-semibold whitespace-nowrap">
                      {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <SeverityBadge severity={evt.severity} />
                    <span className="font-bold text-white">{evt.eventType}</span>
                    <span className="text-[#94A3B8]">({evt.username})</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono justify-between sm:justify-end">
                    <div className="flex items-center gap-2">
                      <span className="text-[#64748B]">from</span>
                      <span className="text-[#FF5722] font-bold">{evt.sourceIp}</span>
                      <span className="text-[#64748B]">to</span>
                      <span className="text-white font-semibold">{evt.destinationIp}:{evt.destinationPort}</span>
                    </div>
                    <OutcomeBadge outcome={evt.outcome} />
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-white" /> : <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />}
                  </div>
                </div>

                {/* Expandable Telemetry Payload */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 bg-[#0B0F17] border-t border-[#1E293B] text-xs font-mono space-y-3">
                    <div className="flex items-center justify-between text-xs text-[#94A3B8] pt-1">
                      <span className="text-[#38BDF8] font-bold tracking-wider text-[11px] uppercase flex items-center gap-2">
                        <Terminal className="w-3.5 h-3.5 text-[#38BDF8]" />
                        <span>RAW TELEMETRY INGESTION PAYLOAD [{evt.id}]</span>
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(evt.rawEvent, evt.id);
                        }}
                        className="text-[#FF5722] hover:text-[#FF7A50] hover:underline flex items-center gap-1.5 cursor-pointer font-bold text-xs"
                      >
                        {copiedId === evt.id ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                        Copy Syslog
                      </button>
                    </div>

                    <div className="p-4 bg-[#07090E] rounded-xl border border-[#1E293B] text-slate-200 text-xs leading-relaxed break-all font-mono">
                      {evt.rawEvent}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                      {Object.entries(evt.parsedFields).map(([k, v]) => (
                        <div key={k} className="p-3 rounded-xl bg-[#0F1523] border border-[#1E293B]">
                          <span className="text-[#64748B] text-[10px] uppercase tracking-wider block">{k}</span>
                          <span className="text-white font-bold truncate block mt-0.5">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
