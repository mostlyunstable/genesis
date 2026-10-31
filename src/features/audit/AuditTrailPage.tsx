import React, { useState } from 'react';
import { 
  ScrollText, 
  Search, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Filter,
  Copy,
  Check
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { AuditRecord } from '@/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
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
      title: 'Audit Payload Copied',
      message: `Payload for ${id} copied to clipboard.`
    });
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#252D38]">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-[#E8EDF4]">Compliance & Execution Audit Trail</h2>
            <Badge variant="accent">SOC2 / ISO 27001 LOG</Badge>
          </div>
          <p className="text-xs text-[#8994A4] font-mono mt-0.5">
            Immutable log of policy decisions, autonomous countermeasure executions, and configuration changes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExportJson}
          >
            Export JSON ({filteredRecords.length})
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3 bg-[#121720] border border-[#252D38] rounded-md flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs">
        <div className="flex-1 w-full sm:max-w-md">
          <Input
            icon={<Search className="w-3.5 h-3.5 text-[#8994A4]" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action, actor, target or audit ID..."
          />
        </div>

        <div className="w-full sm:w-auto">
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-64"
          >
            <option value="all">All Audit Categories</option>
            <option value="RESPONSE_EXECUTION">Response Execution</option>
            <option value="POLICY_DECISION">Policy Decision</option>
            <option value="AI_INVESTIGATION">AI Investigation</option>
            <option value="DETECTION">Detection Event</option>
            <option value="CONFIG_CHANGE">Configuration Change</option>
          </Select>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-[#121720] border border-[#252D38] rounded-md overflow-hidden font-mono text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#0F141C] border-b border-[#252D38] text-[#8994A4] uppercase">
              <tr>
                <th className="py-2.5 px-3 w-8"></th>
                <th className="py-2.5 px-3">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">Audit ID</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Target</th>
                <th className="py-2.5 px-3">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1C2430]">
              {filteredRecords.map((rec) => {
                const isExpanded = expandedId === rec.id;

                return (
                  <React.Fragment key={rec.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                      className={`cursor-pointer transition-colors ${
                        isExpanded ? 'bg-[#171E28]' : 'hover:bg-[#151D28]'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-[#586574]">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </td>
                      <td className="py-2.5 px-3 text-[#E8EDF4] whitespace-nowrap">
                        {new Date(rec.timestamp).toLocaleTimeString()}
                        <span className="text-[10px] text-[#586574] ml-1">UTC</span>
                      </td>
                      <td className="py-2.5 px-3 text-[#E0A34A] font-semibold">
                        {rec.id}
                      </td>
                      <td className="py-2.5 px-3 text-[#8994A4]">
                        <span className="px-1.5 py-0.5 rounded bg-[#171E28] border border-[#252D38] text-[10px]">
                          {rec.category}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#E8EDF4]">
                        {rec.action}
                      </td>
                      <td className="py-2.5 px-3 text-[#6DA9E8] truncate max-w-[150px]">
                        {rec.actor}
                      </td>
                      <td className="py-2.5 px-3 text-[#EF5350] truncate max-w-[150px]">
                        {rec.target}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          rec.result === 'SUCCESS' ? 'bg-[#42B883]/15 text-[#42B883] border border-[#42B883]/30' :
                          rec.result === 'WARNING' ? 'bg-[#E5AD52]/15 text-[#E5AD52] border border-[#E5AD52]/30' :
                          'bg-[#EF5350]/15 text-[#EF5350] border border-[#EF5350]/30'
                        }`}>
                          {rec.result}
                        </span>
                      </td>
                    </tr>

                    {/* Expandable JSON Payload */}
                    {isExpanded && (
                      <tr className="bg-[#0D1016]">
                        <td colSpan={8} className="p-4 border-b border-[#252D38]">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-[10px] text-[#586574]">
                              <span>STRUCTURED AUDIT PAYLOAD DETAILS</span>
                              <button
                                onClick={() => handleCopyPayload(rec.details, rec.id)}
                                className="text-[#E0A34A] hover:underline flex items-center gap-1"
                              >
                                {copiedId === rec.id ? <Check className="w-3 h-3 text-[#42B883]" /> : <Copy className="w-3 h-3" />}
                                Copy Payload
                              </button>
                            </div>
                            <pre className="p-3 bg-[#080A0E] rounded border border-[#1C2430] text-xs text-[#6DA9E8] overflow-x-auto">
                              {JSON.stringify(rec.details, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
