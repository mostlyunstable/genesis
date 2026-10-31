import React, { useState } from 'react';
import { 
  Activity, 
  Search, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Code,
  Shield,
  Terminal
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { SecurityEvent } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge, SeverityBadge, OutcomeBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E9E6E0]">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#171717] font-sans">
            Security Activity Stream
          </h2>
          <p className="text-xs text-[#77736D] font-sans mt-0.5">
            Real-time telemetry observed by Sentinel across authentication and network forwarders.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-[#77736D]">
          <span className="w-2 h-2 rounded-full bg-[#258A62] animate-pulse" />
          <span>Ingesting: <strong>{filteredEvents.length}</strong> events</span>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white border border-[#E9E6E0] rounded-xl p-3.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 font-sans text-xs">
        <div className="w-full sm:w-72">
          <Input
            icon={<Search className="w-3.5 h-3.5" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events, IPs, usernames..."
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full sm:w-44"
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
            className="w-full sm:w-36"
          >
            <option value="all">All Outcomes</option>
            <option value="failure">Failure</option>
            <option value="success">Success</option>
            <option value="blocked">Blocked</option>
          </Select>
        </div>
      </div>

      {/* Readable Event Stream */}
      <div className="bg-white border border-[#E9E6E0] rounded-2xl shadow-sm overflow-hidden divide-y divide-[#F0ECE6]">
        {filteredEvents.slice(0, 25).map((evt) => {
          const isExpanded = expandedId === evt.id;
          const isCompromise = evt.id === 'EVT-2026-SSH-036';

          return (
            <div
              key={evt.id}
              className={`transition-colors cursor-pointer ${
                isCompromise ? 'bg-[#FFF0E8]/40 hover:bg-[#FFF0E8]/60' : 'hover:bg-[#FAFAF8]'
              }`}
              onClick={() => setExpandedId(isExpanded ? null : evt.id)}
            >
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-[#A5A19A] text-[11px] whitespace-nowrap">
                    {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <SeverityBadge severity={evt.severity} />
                  <span className="font-semibold text-[#171717]">{evt.eventType}</span>
                  <span className="text-[#77736D]">({evt.username})</span>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono justify-between sm:justify-end">
                  <div className="flex items-center gap-2">
                    <span className="text-[#A5A19A]">from</span>
                    <span className="text-[#D94B45] font-semibold">{evt.sourceIp}</span>
                    <span className="text-[#A5A19A]">to</span>
                    <span className="text-[#171717]">{evt.destinationIp}:{evt.destinationPort}</span>
                  </div>
                  <OutcomeBadge outcome={evt.outcome} />
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[#A5A19A]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#A5A19A]" />}
                </div>
              </div>

              {/* Expandable Telemetry Payload */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 bg-[#FAFAF8] border-t border-[#F0ECE6] text-xs font-mono space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] text-[#77736D] pt-1">
                    <span>RAW TELEMETRY PAYLOAD [{evt.id}]</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(evt.rawEvent, evt.id);
                      }}
                      className="text-[#F15A24] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === evt.id ? <Check className="w-3 h-3 text-[#258A62]" /> : <Copy className="w-3 h-3" />}
                      Copy Raw Syslog
                    </button>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-[#E9E6E0] text-[#171717] text-[11px] leading-relaxed break-all">
                    {evt.rawEvent}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-[#77736D]">
                    {Object.entries(evt.parsedFields).map(([k, v]) => (
                      <div key={k} className="p-2 rounded bg-white border border-[#E9E6E0]">
                        <span className="text-[#A5A19A] block">{k}</span>
                        <span className="text-[#171717] font-semibold truncate block">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
