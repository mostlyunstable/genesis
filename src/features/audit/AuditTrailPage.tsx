import React, { useState, useEffect } from 'react';
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
  Check,
  RefreshCw,
  Lock,
  Inbox
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { Button } from '@/components/ui/Button';
import { sentinelApi } from '@/services/api';

export const AuditTrailPage: React.FC = () => {
  const { auditRecords, fetchAuditRecords, addNotification } = useSecurityStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    totalRecords: number;
    tamperedCount: number;
    latestHash?: string;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchAuditRecords();
  }, [fetchAuditRecords]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAuditRecords();
    setIsRefreshing(false);
  };

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

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    try {
      const res = await sentinelApi.audit.verify();
      setVerificationResult(res);
      addNotification({
        type: res.verified ? 'success' : 'error',
        title: res.verified ? 'Cryptographic Integrity Confirmed' : 'Tampering Detected',
        message: `${res.totalRecords} records verified against SHA-256 block pointers.`
      });
    } catch (err: any) {
      addNotification({
        type: 'error',
        title: 'Verification Error',
        message: err.message || 'Failed to verify cryptographic chain'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredRecords, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `genesis-audit-trail-${new Date().toISOString().slice(0, 10)}.json`);
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
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          1. EDITORIAL HEADER & VERIFICATION ACTIONS (DE-BOXED)
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E2E4DC]">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.15em] text-[#5C645B]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1E4BD8]" />
            <span>Cryptographic Ledger</span>
            <span className="text-[#CFD4C9]">•</span>
            <span>SHA-256 Merkle Chain</span>
          </div>
          <h1 className="font-display font-semibold text-2xl sm:text-3xl text-[#111417] tracking-tight">
            Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-[#5C645B]">
            Immutable governance ledger with block-level cryptographic verification ({auditRecords.length} records).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="action"
            size="md"
            onClick={handleVerifyChain}
            isLoading={isVerifying}
            icon={<ShieldCheck className="w-4 h-4" />}
          >
            Verify Chain
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={handleExportJson}
            icon={<Download className="w-4 h-4" />}
          >
            Export JSON
          </Button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-[#F0F1EA] hover:bg-white border border-[#E2E4DC] text-[#5C645B] hover:text-[#111417] transition-colors cursor-pointer"
            title="Refresh audit log"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Verification Status Banner if executed */}
      {verificationResult && (
        <div className="p-4 rounded-xl bg-[#EFF4FF] border border-[#D0DEFF] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono shadow-xs">
          <div className="flex items-center gap-2 text-[#1E4BD8]">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-bold">
              Chain Integrity Verified: {verificationResult.totalRecords} blocks validated. 0 tampered pointers.
            </span>
          </div>
          {verificationResult.latestHash && (
            <span className="text-[#5C645B] text-[11px] truncate max-w-xs">
              Root: {verificationResult.latestHash.slice(0, 20)}...
            </span>
          )}
        </div>
      )}

      {/* Search & Category Filter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action, actor, target or record ID..."
            className="w-full bg-[#F0F1EA] border border-[#E2E4DC] rounded-lg px-3.5 py-2 pl-9 text-xs text-[#111417] placeholder-[#889085] focus:outline-none focus:border-[#1E4BD8] focus:bg-white focus:ring-2 focus:ring-[#1E4BD8]/10 font-sans"
          />
          <Search className="w-3.5 h-3.5 text-[#889085] absolute left-3 top-2.5 pointer-events-none" />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-[#F0F1EA] border border-[#E2E4DC] rounded-lg px-3 py-2 text-xs text-[#111417] focus:outline-none focus:border-[#1E4BD8] focus:bg-white focus:ring-2 focus:ring-[#1E4BD8]/10 cursor-pointer font-sans"
        >
          <option value="all">Category: All Types</option>
          <option value="CONFIG_CHANGE">Configuration Changes</option>
          <option value="POLICY_DECISION">Policy Decisions</option>
          <option value="RESPONSE_EXECUTION">Response Executions</option>
        </select>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. AUDIT LOG LEDGER & EXPANDABLE DETAIL DRAWER
          ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#E2E4DC] rounded-xl overflow-hidden shadow-xs">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center space-y-3 bg-white">
            <div className="w-10 h-10 rounded-lg bg-[#F0F1EA] text-[#5C645B] mx-auto flex items-center justify-center">
              <Inbox className="w-5 h-5" />
            </div>
            <h3 className="font-display text-base font-semibold text-[#111417]">No audit records found</h3>
            <p className="text-xs text-[#5C645B] max-w-md mx-auto">
              No audit entries match the current filter. System actions and policy modifications will log here automatically.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E4DC]">
            {filteredRecords.map((rec) => {
              const isExpanded = expandedId === rec.id;

              return (
                <div key={rec.id} className="transition-colors hover:bg-[#F8F8F5]">
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                    className="p-4 sm:p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer font-mono text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        rec.result === 'SUCCESS' ? 'bg-[#EFF4FF] text-[#1E4BD8]' : 'bg-[#F0F1EA] text-[#5C645B]'
                      }`}>
                        {rec.result}
                      </span>
                      <span className="font-bold text-[#1E4BD8] shrink-0">{rec.id}</span>
                      <span className="text-[#889085] text-[11px] shrink-0">
                        {rec.timestamp ? new Date(rec.timestamp).toLocaleTimeString() : ''}
                      </span>
                      <span className="text-[#111417] font-semibold truncate">
                        {rec.action}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 text-xs">
                      <span className="text-[#5C645B]">
                        by: <strong className="text-[#111417]">{rec.actor}</strong>
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-[#F0F1EA] border border-[#E2E4DC] text-[#5C645B] text-[10px]">
                        {rec.category}
                      </span>
                      <button className="text-[#889085] hover:text-[#111417]">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-5 bg-[#F8F8F5] border-t border-[#E2E4DC] space-y-3 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#1E4BD8]">
                          STRUCTURED AUDIT PAYLOAD &bull; SHA-256 SIGNED
                        </span>
                        <button
                          onClick={() => handleCopyPayload(rec.details, rec.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-[#E2E4DC] text-[11px] text-[#5C645B] hover:text-[#111417] hover:border-[#1E4BD8] cursor-pointer shadow-2xs transition-colors"
                        >
                          {copiedId === rec.id ? <Check className="w-3 h-3 text-[#1E4BD8]" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedId === rec.id ? 'Copied' : 'Copy JSON'}</span>
                        </button>
                      </div>

                      <pre className="p-3.5 rounded-lg bg-white border border-[#E2E4DC] text-[#111417] overflow-x-auto text-[11px] leading-relaxed">
                        {JSON.stringify(rec.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
