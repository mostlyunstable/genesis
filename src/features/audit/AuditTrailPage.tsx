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
    <div className="space-y-8 max-w-7xl mx-auto font-sans pb-16">
      
      {/* ─────────────────────────────────────────────────────────────
          1. EDITORIAL HEADER & CRYPTOGRAPHIC VERIFICATION
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#E3E5DC] rounded-3xl p-6 sm:p-8 shadow-origin-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="font-display text-2xl sm:text-3xl text-[#20251F] tracking-tight">
              Audit Log
            </h1>
            <p className="text-sm text-[#73796F]">
              Immutable activity log with SHA-256 integrity verification ({auditRecords.length} entries).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={handleVerifyChain}
              isLoading={isVerifying}
              icon={<ShieldCheck className="w-4 h-4" />}
            >
              Verify Chain Integrity
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
              className="p-2.5 rounded-full bg-[#F0F1EB] hover:bg-white border border-[#E3E5DC] text-[#73796F] hover:text-[#20251F] transition-colors cursor-pointer"
              title="Refresh audit log"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Verification Status Banner if executed */}
        {verificationResult && (
          <div className="mt-6 p-4 rounded-2xl bg-[#EAF0E6] border border-[#CFDCC9] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-[#54765C]">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-bold">
                Chain Integrity Verified: {verificationResult.totalRecords} records validated. 0 tampered blocks.
              </span>
            </div>
            {verificationResult.latestHash && (
              <span className="text-[#73796F] text-[11px] truncate max-w-xs">
                Root Hash: {verificationResult.latestHash.slice(0, 16)}...
              </span>
            )}
          </div>
        )}

        {/* Search & Category Filter */}
        <div className="pt-6 mt-6 border-t border-[#E3E5DC] grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search action, actor, target or record ID..."
              className="w-full bg-[#F0F1EB] border border-[#E3E5DC] rounded-full px-4 py-2 text-xs text-[#20251F] placeholder-[#969B91] focus:outline-none focus:border-[#54765C]"
            />
            <Search className="w-3.5 h-3.5 text-[#969B91] absolute right-3 top-2.5 pointer-events-none" />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#F0F1EB] border border-[#E3E5DC] rounded-full px-4 py-2 text-xs text-[#20251F] focus:outline-none focus:border-[#54765C] cursor-pointer"
          >
            <option value="all">CATEGORY: ALL</option>
            <option value="CONFIG_CHANGE">Configuration Changes</option>
            <option value="POLICY_DECISION">Policy Decisions</option>
            <option value="RESPONSE_EXECUTION">Response Executions</option>
          </select>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. AUDIT LOG LEDGER & EXPANDABLE DETAIL DRAWER
          ───────────────────────────────────────────────────────────── */}
      <section className="bg-white border border-[#E3E5DC] rounded-3xl overflow-hidden shadow-origin-sm">
        {filteredRecords.length === 0 ? (
          <div className="p-16 text-center space-y-3 bg-white">
            <div className="w-12 h-12 rounded-full bg-[#F0F1EB] text-[#73796F] mx-auto flex items-center justify-center">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="font-display text-lg text-[#20251F]">No audit records found</h3>
            <p className="text-sm text-[#73796F] max-w-md mx-auto">
              No audit entries match the current filter. System actions and policy modifications will log here automatically.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E3E5DC]">
            {filteredRecords.map((rec) => {
              const isExpanded = expandedId === rec.id;

              return (
                <div key={rec.id} className="transition-colors hover:bg-[#FAFAF7]">
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer font-mono text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        rec.result === 'SUCCESS' ? 'bg-[#EAF0E6] text-[#54765C]' : 'bg-[#FAFAF7] text-[#73796F]'
                      }`}>
                        {rec.result}
                      </span>
                      <span className="font-bold text-[#54765C] shrink-0">{rec.id}</span>
                      <span className="text-[#969B91] text-[11px] shrink-0">
                        {rec.timestamp ? new Date(rec.timestamp).toLocaleTimeString() : ''}
                      </span>
                      <span className="text-[#20251F] font-semibold truncate">
                        {rec.action}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 text-xs">
                      <span className="text-[#73796F]">
                        by: <strong className="text-[#20251F]">{rec.actor}</strong>
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#F0F1EB] border border-[#E3E5DC] text-[#73796F] text-[10px]">
                        {rec.category}
                      </span>
                      <button className="text-[#73796F] hover:text-[#20251F]">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-6 bg-[#FAFAF7] border-t border-[#E3E5DC] space-y-4 font-mono text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#54765C]">
                          STRUCTURED AUDIT PAYLOAD &bull; SHA-256 SIGNED
                        </span>
                        <button
                          onClick={() => handleCopyPayload(rec.details, rec.id)}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E3E5DC] text-[11px] text-[#73796F] hover:text-[#20251F] cursor-pointer"
                        >
                          {copiedId === rec.id ? <Check className="w-3.5 h-3.5 text-[#54765C]" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedId === rec.id ? 'Copied' : 'Copy JSON'}</span>
                        </button>
                      </div>

                      <pre className="p-4 rounded-2xl bg-white border border-[#E3E5DC] text-[#20251F] overflow-x-auto text-[11px] leading-relaxed">
                        {JSON.stringify(rec.details, null, 2)}
                      </pre>
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
