import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Flame, ShieldAlert, Activity, ArrowRight } from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { incidents, detections, events, setSelectedIncidentId } = useSecurityStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose();
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
  ).slice(0, 3) : [];

  const handleSelectIncident = (id: string, title: string) => {
    navigate(`/copilot?q=${encodeURIComponent(`Investigate incident ${id}: ${title}`)}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-start justify-center pt-24 px-4 animate-in fade-in-0 duration-150">
      <div className="bg-white border border-[#E2E4DC] rounded-xl shadow-origin-lg w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-5 py-3.5 border-b border-[#E2E4DC] gap-3 bg-white">
          <Search className="w-4.5 h-4.5 text-[#1E4BD8] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search playbooks, activity ledger, IPs, users, entities..."
            className="flex-1 bg-transparent border-none text-xs sm:text-sm text-[#111417] placeholder-[#8A939E] focus:outline-none font-sans"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-[#5E656D] bg-[#F0F1EA] border border-[#E2E4DC] rounded">
            ESC
          </kbd>
          <button onClick={onClose} className="text-[#8A939E] hover:text-[#111417] p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-3 text-xs font-sans">
          {/* Incidents */}
          {matchedIncidents.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-[#8A939E] tracking-wider uppercase px-2 mb-1.5 flex items-center gap-1.5 font-mono">
                <Flame className="w-3.5 h-3.5 text-[#C27814]" />
                Correlated Incidents
              </div>
              <div className="space-y-1">
                {matchedIncidents.map(inc => (
                  <button
                    key={inc.id}
                    onClick={() => handleSelectIncident(inc.id, inc.title)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#F0F1EA] flex items-center justify-between text-[#111417] transition-colors group cursor-pointer border border-transparent hover:border-[#E2E4DC]"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[#1E4BD8] font-semibold font-mono text-[11px]">{inc.id}</span>
                      <span className="truncate text-xs">{inc.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono border bg-[#FDF7ED] text-[#C27814] border-[#F7E1C0]">
                        {inc.severity}
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#8A939E] group-hover:text-[#1E4BD8] shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Threat Detections */}
          {matchedDetections.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-[#8A939E] tracking-wider uppercase px-2 mb-1.5 flex items-center gap-1.5 font-mono">
                <ShieldAlert className="w-3.5 h-3.5 text-[#1E4BD8]" />
                Threat Detections
              </div>
              <div className="space-y-1">
                {matchedDetections.map(det => (
                  <button
                    key={det.id}
                    onClick={() => {
                      navigate(`/copilot?q=${encodeURIComponent(`Analyze detection ${det.id}: ${det.name} from ${det.sourceIp}`)}`);
                      onClose();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#F0F1EA] flex items-center justify-between text-[#111417] transition-colors group cursor-pointer border border-transparent hover:border-[#E2E4DC]"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[#1E4BD8] font-mono text-[11px]">{det.id}</span>
                      <span className="truncate text-xs">{det.name}</span>
                      <span className="text-[#5E656D] font-mono text-[11px]">({det.sourceIp})</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#8A939E] group-hover:text-[#1E4BD8] shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Activity Events */}
          {matchedEvents.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-[#8A939E] tracking-wider uppercase px-2 mb-1.5 flex items-center gap-1.5 font-mono">
                <Activity className="w-3.5 h-3.5 text-[#1E4BD8]" />
                Security Activity Events
              </div>
              <div className="space-y-1">
                {matchedEvents.map(evt => (
                  <button
                    key={evt.id}
                    onClick={() => {
                      navigate(`/copilot?q=${encodeURIComponent(`Inspect event ${evt.id}: ${evt.eventType} for user ${evt.username} from IP ${evt.sourceIp}`)}`);
                      onClose();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#F0F1EA] flex items-center justify-between text-[#111417] transition-colors group cursor-pointer border border-transparent hover:border-[#E2E4DC]"
                  >
                    <div className="flex items-center gap-2 truncate font-mono text-[11px]">
                      <span className="text-[#8A939E]">{evt.id}</span>
                      <span className="text-[#1E4BD8] font-semibold">{evt.eventType}</span>
                      <span className="text-[#5E656D]">{evt.username}</span>
                      <span className="text-[#111417]">{evt.sourceIp}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#8A939E] group-hover:text-[#1E4BD8] shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {q && matchedIncidents.length === 0 && matchedDetections.length === 0 && matchedEvents.length === 0 && (
            <div className="py-8 text-center text-[#8A939E]">
              No security entities matching &ldquo;{query}&rdquo; found.
            </div>
          )}
        </div>

        <div className="px-5 py-2.5 bg-[#F8F8F5] border-t border-[#E2E4DC] flex items-center justify-between text-[11px] text-[#5E656D] font-mono">
          <span>Press <kbd className="text-[#111417] font-semibold">↵ Enter</kbd> to inspect in Copilot</span>
          <span>Genesis Intelligence</span>
        </div>
      </div>
    </div>
  );
};
