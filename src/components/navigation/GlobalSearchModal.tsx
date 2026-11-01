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

  const handleSelectIncident = (id: string) => {
    setSelectedIncidentId(id);
    navigate('/incidents');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-start justify-center pt-24 px-4 animate-in fade-in-0 duration-150">
      <div className="bg-white border border-[#E3E5DC] rounded-3xl shadow-origin-lg w-full max-w-2xl overflow-hidden">
        {/* Search Input Bar */}
        <div className="flex items-center px-6 py-4 border-b border-[#E3E5DC] gap-3">
          <Search className="w-5 h-5 text-[#54765C]" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search threats, incidents, IPs, users, or playbooks..."
            className="flex-1 bg-transparent border-none text-sm text-[#20251F] placeholder-[#969B91] focus:outline-none font-sans"
          />
          <kbd className="px-2 py-0.5 text-[10px] font-mono text-[#73796F] bg-[#F0F1EB] border border-[#E3E5DC] rounded-full">
            ESC
          </kbd>
          <button onClick={onClose} className="text-[#969B91] hover:text-[#20251F] p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4 text-xs font-sans">
          {/* Incidents */}
          {matchedIncidents.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-[#969B91] tracking-wider uppercase px-2 mb-1.5 flex items-center gap-1.5 font-mono">
                <Flame className="w-3.5 h-3.5 text-[#C47A45]" />
                Incidents
              </div>
              <div className="space-y-1">
                {matchedIncidents.map(inc => (
                  <button
                    key={inc.id}
                    onClick={() => handleSelectIncident(inc.id)}
                    className="w-full text-left px-3.5 py-2.5 rounded-2xl hover:bg-[#F0F1EB] flex items-center justify-between text-[#20251F] transition-colors group cursor-pointer border border-transparent hover:border-[#E3E5DC]"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[#54765C] font-semibold font-mono">{inc.id}</span>
                      <span className="truncate">{inc.title}</span>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#FAF2EC] text-[#C47A45] font-mono border border-[#F4E2D5]">
                        {inc.severity}
                      </span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#969B91] group-hover:text-[#54765C] shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Threat Detections */}
          {matchedDetections.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-[#969B91] tracking-wider uppercase px-2 mb-1.5 flex items-center gap-1.5 font-mono">
                <ShieldAlert className="w-3.5 h-3.5 text-[#54765C]" />
                Threat Detections
              </div>
              <div className="space-y-1">
                {matchedDetections.map(det => (
                  <button
                    key={det.id}
                    onClick={() => {
                      navigate('/threats');
                      onClose();
                    }}
                    className="w-full text-left px-3.5 py-2.5 rounded-2xl hover:bg-[#F0F1EB] flex items-center justify-between text-[#20251F] transition-colors group cursor-pointer border border-transparent hover:border-[#E3E5DC]"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[#54765C] font-mono">{det.id}</span>
                      <span className="truncate">{det.name}</span>
                      <span className="text-[#73796F] font-mono text-[11px]">({det.sourceIp})</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#969B91] group-hover:text-[#54765C] shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Activity Events */}
          {matchedEvents.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-[#969B91] tracking-wider uppercase px-2 mb-1.5 flex items-center gap-1.5 font-mono">
                <Activity className="w-3.5 h-3.5 text-[#54765C]" />
                Security Activity Events
              </div>
              <div className="space-y-1">
                {matchedEvents.map(evt => (
                  <button
                    key={evt.id}
                    onClick={() => {
                      navigate('/events');
                      onClose();
                    }}
                    className="w-full text-left px-3.5 py-2.5 rounded-2xl hover:bg-[#F0F1EB] flex items-center justify-between text-[#20251F] transition-colors group cursor-pointer border border-transparent hover:border-[#E3E5DC]"
                  >
                    <div className="flex items-center gap-2 truncate font-mono text-[11px]">
                      <span className="text-[#969B91]">{evt.id}</span>
                      <span className="text-[#54765C] font-semibold">{evt.eventType}</span>
                      <span className="text-[#73796F]">{evt.username}</span>
                      <span className="text-[#20251F]">{evt.sourceIp}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#969B91] group-hover:text-[#54765C] shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {q && matchedIncidents.length === 0 && matchedDetections.length === 0 && matchedEvents.length === 0 && (
            <div className="py-8 text-center text-[#969B91]">
              No security entities matching &ldquo;{query}&rdquo; found.
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-[#FAFAF7] border-t border-[#E3E5DC] flex items-center justify-between text-[11px] text-[#73796F] font-mono">
          <span>Press <kbd className="text-[#20251F] font-semibold">↵ Enter</kbd> to inspect entity</span>
          <span>Scope: Local Synthetic Sandbox</span>
        </div>
      </div>
    </div>
  );
};
