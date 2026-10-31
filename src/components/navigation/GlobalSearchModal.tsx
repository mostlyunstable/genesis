import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, AlertOctagon, Crosshair, FileText, Globe, ArrowRight } from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { incidents, detections, events, threatIntel, setSelectedIncidentId } = useSecurityStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent or shortcut
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  const matchedIncidents = q ? incidents.filter(i => 
    i.id.toLowerCase().includes(q) || 
    i.title.toLowerCase().includes(q) ||
    i.sourceIps.some(ip => ip.includes(q))
  ) : incidents.slice(0, 3);

  const matchedDetections = q ? detections.filter(d => 
    d.id.toLowerCase().includes(q) || 
    d.name.toLowerCase().includes(q) ||
    d.sourceIp.includes(q)
  ) : detections.slice(0, 3);

  const matchedEvents = q ? events.filter(e => 
    e.id.toLowerCase().includes(q) || 
    e.sourceIp.includes(q) ||
    e.username.toLowerCase().includes(q)
  ).slice(0, 4) : [];

  const matchedIntel = q ? threatIntel.filter(ti => 
    ti.ip.includes(q) || 
    ti.threatClassification.toLowerCase().includes(q)
  ) : [];

  const handleSelectIncident = (id: string) => {
    setSelectedIncidentId(id);
    navigate('/incidents');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-start justify-center pt-20 px-4">
      <div className="bg-[#121720] border border-[#252D38] rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-[#252D38] gap-3">
          <Search className="w-5 h-5 text-[#8994A4]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search incidents, IP addresses, events, or MITRE techniques (e.g. 198.51.100.42, brute force)..."
            className="flex-1 bg-transparent border-none text-sm text-[#E8EDF4] placeholder-[#586574] focus:outline-none font-mono"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-[#8994A4] bg-[#171E28] border border-[#252D38] rounded">
            ESC
          </kbd>
          <button onClick={onClose} className="text-[#8994A4] hover:text-[#E8EDF4]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4 text-xs font-mono">
          {/* Incidents */}
          {matchedIncidents.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-[#586574] uppercase px-2 mb-1.5 flex items-center gap-1.5">
                <AlertOctagon className="w-3.5 h-3.5 text-[#EF5350]" />
                Incidents
              </div>
              <div className="space-y-1">
                {matchedIncidents.map(inc => (
                  <button
                    key={inc.id}
                    onClick={() => handleSelectIncident(inc.id)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-[#171E28] flex items-center justify-between text-[#E8EDF4] transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[#E0A34A] font-semibold">{inc.id}</span>
                      <span className="truncate">{inc.title}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#EF5350]/20 text-[#EF5350]">
                        {inc.severity}
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#586574] group-hover:text-[#E8EDF4] shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Threat Detections */}
          {matchedDetections.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-[#586574] uppercase px-2 mb-1.5 flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-[#E5AD52]" />
                Threat Detections
              </div>
              <div className="space-y-1">
                {matchedDetections.map(det => (
                  <button
                    key={det.id}
                    onClick={() => {
                      navigate('/detections');
                      onClose();
                    }}
                    className="w-full text-left px-3 py-2 rounded hover:bg-[#171E28] flex items-center justify-between text-[#E8EDF4] transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[#6DA9E8]">{det.id}</span>
                      <span className="truncate">{det.name}</span>
                      <span className="text-[#8994A4] text-[11px]">({det.sourceIp})</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#586574] group-hover:text-[#E8EDF4] shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Threat Intel Indicators */}
          {matchedIntel.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-[#586574] uppercase px-2 mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#6DA9E8]" />
                Threat Intelligence Indicators
              </div>
              <div className="space-y-1">
                {matchedIntel.map(ti => (
                  <button
                    key={ti.ip}
                    onClick={() => {
                      navigate('/threat-intel');
                      onClose();
                    }}
                    className="w-full text-left px-3 py-2 rounded hover:bg-[#171E28] flex items-center justify-between text-[#E8EDF4] transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[#EF5350] font-semibold">{ti.ip}</span>
                      <span className="text-[#8994A4] truncate">{ti.threatClassification}</span>
                      <span className="text-[10px] text-[#E0A34A]">Score: {ti.reputationScore}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#586574] group-hover:text-[#E8EDF4] shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Raw Events */}
          {matchedEvents.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-[#586574] uppercase px-2 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#8994A4]" />
                Security Events
              </div>
              <div className="space-y-1">
                {matchedEvents.map(evt => (
                  <button
                    key={evt.id}
                    onClick={() => {
                      navigate('/logs');
                      onClose();
                    }}
                    className="w-full text-left px-3 py-2 rounded hover:bg-[#171E28] flex items-center justify-between text-[#E8EDF4] transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 truncate text-[11px]">
                      <span className="text-[#586574]">{evt.id}</span>
                      <span className="text-[#E0A34A]">{evt.eventType}</span>
                      <span className="text-[#8994A4]">{evt.username}</span>
                      <span className="text-[#6DA9E8]">{evt.sourceIp}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#586574] group-hover:text-[#E8EDF4] shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {q && matchedIncidents.length === 0 && matchedDetections.length === 0 && matchedIntel.length === 0 && matchedEvents.length === 0 && (
            <div className="py-8 text-center text-[#586574]">
              No security entities matching &ldquo;{query}&rdquo; found in local telemetry.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-[#0D1016] border-t border-[#252D38] flex items-center justify-between text-[10px] text-[#586574] font-mono">
          <span>ProTip: Press <kbd className="text-[#8994A4]">Enter</kbd> to jump directly to entity</span>
          <span>Scope: Local Synthetic Sandbox</span>
        </div>
      </div>
    </div>
  );
};
