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
import { Input, Select } from '@/components/ui/Input';

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
    <div className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E2638]">
        <div>
          <div className="text-[10px] font-mono font-bold tracking-[0.2em] text-[#3B82F6] uppercase mb-1">
            IMMUTABLE VERIFICATION LEDGER
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
            Audit Trail
          </h2>
          <p className="text-sm text-[#94A3B8] font-sans mt-0.5">
            Cryptographically timestamped record of detections, policy evaluations, and countermeasure executions.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={<Download className="w-3.5 h-3.5" />}
          onClick={handleExportJson}
        >
          Export Ledger (JSON)
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#0E131F] border border-[#1E2638] rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 font-sans text-xs">
        <div className="w-full sm:w-80">
          <Input
            icon={<Search className="w-3.5 h-3.5" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action, actor, target or audit ID..."
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-56"
          >
            <option value="all">All Audit Categories</option>
            <option value="DETECTION">Detections</option>
            <option value="AI_INVESTIGATION">AI Investigations</option>
            <option value="POLICY_DECISION">Policy Decisions</option>
            <option value="RESPONSE_EXECUTION">Response Executions</option>
            <option value="CONFIG_CHANGE">Configuration Changes</option>
          </Select>
        </div>
      </div>

      {/* Audit Record Stream */}
      <div className="bg-[#0E131F] border border-[#1E2638] rounded-2xl shadow-sm overflow-hidden divide-y divide-[#1E2638]">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#94A3B8] font-mono">
            No audit records match filter criteria.
          </div>
        ) : (
          filteredRecords.map((rec) => {
            const isExpanded = expandedId === rec.id;

            return (
              <div
                key={rec.id}
                onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                className="hover:bg-[#121722] transition-colors cursor-pointer"
              >
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 font-mono">
                    <span className="text-[#3B82F6] font-semibold text-[11px] whitespace-nowrap">
                      {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} UTC
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#141C2B] text-[#94A3B8] border border-[#1E2638]">
                      {rec.category}
                    </span>
                    <span className="font-bold text-white font-sans">{rec.action}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono justify-between sm:justify-end">
                    <div className="flex items-center gap-2">
                      <span className="text-[#64748B]">actor:</span>
                      <span className="text-white font-semibold">{rec.actor}</span>
                      <span className="text-[#64748B]">target:</span>
                      <span className="text-[#F97316] font-semibold">{rec.target}</span>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      rec.result === 'SUCCESS' ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30' :
                      rec.result === 'WARNING' ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30' :
                      'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
                    }`}>
                      {rec.result}
                    </span>

                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-white" /> : <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />}
                  </div>
                </div>

                {/* Expandable JSON Payload Drawer */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 bg-[#090C12] border-t border-[#1E2638] text-xs font-mono space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#94A3B8] pt-1">
                      <span className="text-[#3B82F6] font-bold tracking-wider text-[11px]">
                        AUDIT ATTRIBUTE SIGNATURE [{rec.id}]
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyPayload(rec.details, rec.id);
                        }}
                        className="text-[#F97316] hover:underline flex items-center gap-1.5 cursor-pointer font-bold text-xs"
                      >
                        {copiedId === rec.id ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3 text-[#64748B]" />}
                        Copy Record JSON
                      </button>
                    </div>

                    <pre className="p-4 bg-[#07090E] rounded-xl border border-[#1E2638] text-slate-200 text-xs leading-relaxed overflow-x-auto">
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
