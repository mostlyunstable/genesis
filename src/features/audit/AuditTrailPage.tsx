import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Copy, 
  Check 
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { Button } from '@/components/ui/Button';

export const AuditTrailPage: React.FC = () => {
  const { auditRecords, addNotification } = useSecurityStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>('AUD-2026-1049');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredRecords = auditRecords.filter(rec => {
    if (categoryFilter !== 'all' && rec.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        rec.id.toLowerCase().includes(q) ||
        rec.action.toLowerCase().includes(q) ||
        rec.actor.toLowerCase().includes(q) ||
        rec.target.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredRecords, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sentinel-audit-trail-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    addNotification({
      type: 'success',
      title: 'Audit Records Exported',
      message: `Downloaded ${filteredRecords.length} structured audit entries.`
    });
  };

  const handleCopyPayload = (details: any, id: string) => {
    navigator.clipboard.writeText(JSON.stringify(details, null, 2));
    setCopiedId(id);
    addNotification({
      type: 'info',
      title: 'Payload Copied',
      message: `Audit entry ${id} copied to clipboard.`
    });
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto font-sans pb-16">
      
      {/* Editorial Header */}
      <section className="bg-white border border-[#E3E5DC] rounded-3xl p-6 sm:p-8 shadow-origin-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#54765C]" />
              <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#54765C] uppercase">
                IMMUTABLE VERIFICATION LEDGER
              </span>
              <span className="text-[#CFD4C9]">•</span>
              <span className="text-[10px] font-mono text-[#73796F]">
                CRYPTOGRAPHIC SIGNATURES
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl text-[#20251F] tracking-tight">
              Audit Trail
            </h1>
            <p className="text-sm text-[#73796F] font-sans max-w-2xl leading-relaxed">
              Cryptographically verified ledger of detections, policy evaluations, and countermeasure executions.
            </p>
          </div>

          <Button
            variant="outline"
            size="md"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportJson}
          >
            Export Ledger (JSON)
          </Button>
        </div>
      </section>

      {/* Filter Toolbar */}
      <div className="bg-white border border-[#E3E5DC] rounded-3xl p-4 sm:p-5 shadow-origin-sm flex flex-col sm:flex-row items-center justify-between gap-4 font-sans text-xs">
        <div className="w-full sm:w-80">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search action, actor, target or audit ID..."
              className="w-full bg-[#F0F1EB] border border-[#E3E5DC] rounded-full px-4 py-2.5 pl-10 text-xs font-mono text-[#20251F] placeholder-[#969B91] focus:outline-none focus:border-[#54765C]"
            />
            <Search className="w-4 h-4 text-[#969B91] absolute left-3.5 top-3 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-56 bg-[#F0F1EB] border border-[#E3E5DC] text-[#20251F] px-4 py-2.5 rounded-full text-xs font-mono focus:outline-none focus:border-[#54765C]"
          >
            <option value="all">All Audit Categories</option>
            <option value="DETECTION">Detections</option>
            <option value="AI_INVESTIGATION">AI Investigations</option>
            <option value="POLICY_DECISION">Policy Decisions</option>
            <option value="RESPONSE_EXECUTION">Response Executions</option>
            <option value="CONFIG_CHANGE">Configuration Changes</option>
          </select>
        </div>
      </div>

      {/* Audit Record Stream */}
      <div className="bg-white border border-[#E3E5DC] rounded-3xl shadow-origin-sm overflow-hidden divide-y divide-[#E3E5DC]">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#969B91] font-mono">
            No audit records match filter criteria.
          </div>
        ) : (
          filteredRecords.map((rec) => {
            const isExpanded = expandedId === rec.id;

            return (
              <div
                key={rec.id}
                onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                className="hover:bg-[#F0F1EB] transition-colors cursor-pointer"
              >
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-[#54765C] font-bold text-[11px] whitespace-nowrap">
                      {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} UTC
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F0F1EB] text-[#73796F] border border-[#E3E5DC]">
                      {rec.category}
                    </span>
                    <span className="font-bold text-[#20251F] font-sans text-sm">{rec.action}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono justify-between sm:justify-end">
                    <div className="flex items-center gap-2">
                      <span className="text-[#969B91]">actor:</span>
                      <span className="text-[#20251F] font-semibold">{rec.actor}</span>
                      <span className="text-[#969B91]">target:</span>
                      <span className="text-[#54765C] font-semibold">{rec.target}</span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      rec.result === 'SUCCESS' ? 'bg-[#EDF3EF] text-[#64856C] border border-[#DBE7DF]' :
                      rec.result === 'WARNING' ? 'bg-[#FAF5EB] text-[#B28A42] border border-[#F4ECD5]' :
                      'bg-[#F9ECEB] text-[#B94C43] border border-[#F2D5D3]'
                    }`}>
                      {rec.result}
                    </span>

                    {isExpanded ? <ChevronUp className="w-4 h-4 text-[#20251F]" /> : <ChevronDown className="w-4 h-4 text-[#969B91]" />}
                  </div>
                </div>

                {/* Expandable JSON Payload Drawer */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 bg-[#FAFAF7] border-t border-[#E3E5DC] text-xs font-mono space-y-3">
                    <div className="flex items-center justify-between text-xs text-[#73796F] pt-2">
                      <span className="text-[#54765C] font-bold tracking-wider text-[11px]">
                        AUDIT ATTRIBUTE SIGNATURE [{rec.id}]
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyPayload(rec.details, rec.id);
                        }}
                        className="text-[#54765C] hover:underline flex items-center gap-1.5 cursor-pointer font-bold text-xs"
                      >
                        {copiedId === rec.id ? <Check className="w-3.5 h-3.5 text-[#64856C]" /> : <Copy className="w-3.5 h-3.5 text-[#969B91]" />}
                        Copy Record JSON
                      </button>
                    </div>

                    <pre className="p-4 bg-white rounded-2xl border border-[#E3E5DC] text-[#20251F] text-xs leading-relaxed overflow-x-auto shadow-inner">
                      {JSON.stringify(rec.details, null, 2)}
                    </pre>
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
