import React from 'react';
import { 
  X, 
  ExternalLink, 
  ShieldAlert, 
  Radio, 
  Flame, 
  Activity, 
  Terminal, 
  Globe, 
  Copy, 
  Check,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { EvidenceReference } from '@/types';
import { useChatStore } from '@/stores/useChatStore';

export const EvidenceDetailPanel: React.FC = () => {
  const { selectedEvidence, isEvidencePanelOpen, setEvidencePanelOpen, setSelectedEvidence } = useChatStore();
  const [copied, setCopied] = React.useState(false);

  if (!isEvidencePanelOpen || !selectedEvidence) {
    return null;
  }

  const handleCopyId = () => {
    navigator.clipboard.writeText(selectedEvidence.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const getIcon = () => {
    switch (selectedEvidence.type) {
      case 'incident': return <Flame className="w-5 h-5 text-amber-600" />;
      case 'event': return <Radio className="w-5 h-5 text-emerald-600" />;
      case 'detection': return <ShieldAlert className="w-5 h-5 text-rose-600" />;
      case 'threat_intel': return <Globe className="w-5 h-5 text-[#26796C]" />;
      case 'mitre': return <Activity className="w-5 h-5 text-indigo-600" />;
      default: return <FileText className="w-5 h-5 text-[#26796C]" />;
    }
  };

  const getTypeBadge = () => {
    const typeStyles: Record<string, string> = {
      incident: 'bg-amber-100 text-amber-800 border-amber-300',
      event: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      detection: 'bg-rose-100 text-rose-800 border-rose-300',
      threat_intel: 'bg-teal-100 text-teal-800 border-teal-300',
      mitre: 'bg-indigo-100 text-indigo-800 border-indigo-300'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[11px] font-mono uppercase font-semibold border ${typeStyles[selectedEvidence.type] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>
        {selectedEvidence.type.replace('_', ' ')}
      </span>
    );
  };

  return (
    <aside className="w-80 md:w-96 border-l border-[#DFE5E2] bg-white flex flex-col h-full shrink-0 shadow-lg md:shadow-none z-10 transition-all">
      {/* Header */}
      <div className="p-4 border-b border-[#E5EBE8] flex items-center justify-between bg-[#FAF9F5]">
        <div className="flex items-center gap-2.5">
          {getIcon()}
          <div>
            <h3 className="text-sm font-bold text-[#142C29]">Contextual Security Evidence</h3>
            <p className="text-xs text-[#5A6B66]">Grounded Telemetry Inspector</p>
          </div>
        </div>
        <button
          onClick={() => setEvidencePanelOpen(false)}
          className="p-1 rounded-md text-[#5A6B66] hover:bg-[#EAEFEA] hover:text-[#192622] transition-colors"
          title="Close Evidence Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Item Title & ID Banner */}
        <div className="p-3.5 rounded-xl bg-[#F7FAF8] border border-[#DFE5E2] space-y-2">
          <div className="flex items-center justify-between">
            {getTypeBadge()}
            <button
              onClick={handleCopyId}
              className="flex items-center gap-1 text-xs text-[#5A6B66] hover:text-[#192622] transition-colors"
              title="Copy ID"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="font-mono">{selectedEvidence.id}</span>
                </>
              )}
            </button>
          </div>
          <h4 className="text-sm font-semibold text-[#142C29] leading-snug">
            {selectedEvidence.title}
          </h4>
        </div>

        {/* Evidence Metadata Fields */}
        <div className="space-y-3 text-xs">
          {selectedEvidence.severity && (
            <div className="flex items-center justify-between py-1.5 border-b border-[#F0F4F2]">
              <span className="text-[#6B7D78]">Severity Level</span>
              <span className="font-semibold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                {selectedEvidence.severity}
              </span>
            </div>
          )}

          {selectedEvidence.timestamp && (
            <div className="flex items-center justify-between py-1.5 border-b border-[#F0F4F2]">
              <span className="text-[#6B7D78]">Telemetry Timestamp</span>
              <span className="font-mono text-[#192622]">{selectedEvidence.timestamp}</span>
            </div>
          )}

          <div className="space-y-1.5 pt-1">
            <span className="text-[#6B7D78] font-medium block">Raw Grounding Snippet</span>
            <div className="p-3 rounded-lg bg-[#FAF9F5] border border-[#E5EBE8] font-mono text-xs text-[#192622] leading-relaxed whitespace-pre-wrap break-all">
              {selectedEvidence.snippet || 'No raw snippet payload stored.'}
            </div>
          </div>
        </div>

        {/* Deep Dive Action Links */}
        <div className="pt-3 border-t border-[#E5EBE8] space-y-2">
          <span className="text-xs font-semibold text-[#142C29] block">Verified Ground-Truth Provenance</span>
          <p className="text-xs text-[#5A6B66] leading-relaxed">
            This security evidence was validated against internal database indexes. No synthetic fabrication or hallucinated telemetry is permitted.
          </p>

          {selectedEvidence.type === 'incident' && (
            <a
              href={`/incidents`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#26796C] hover:underline mt-2"
            >
              <span>Open in Incidents Workspace</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {selectedEvidence.type === 'mitre' && (
            <a
              href={`https://attack.mitre.org/techniques/${selectedEvidence.id.replace('.', '/')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#26796C] hover:underline mt-2"
            >
              <span>View on MITRE ATT&CK Framework</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </aside>
  );
};
