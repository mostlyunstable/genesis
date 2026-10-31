import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  ChevronRight, 
  X,
  Radio,
  Cpu
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { GlobalSearchModal } from './GlobalSearchModal';

const routeTitleMap: Record<string, { title: string; section: string }> = {
  '/': { title: 'Autonomous Workspace', section: 'OPERATIONS' },
  '/investigations': { title: 'Investigations & Root Cause', section: 'OPERATIONS' },
  '/activity': { title: 'Live Activity Stream', section: 'OPERATIONS' },
  '/threats': { title: 'Threat Intelligence', section: 'INTELLIGENCE' },
  '/incidents': { title: 'Incident Command', section: 'INTELLIGENCE' },
  '/response': { title: 'Autonomous Response', section: 'DEFENSE' },
  '/integrations': { title: 'Telemetry Forwarders', section: 'PLATFORM' },
  '/audit': { title: 'Cryptographic Audit Trail', section: 'PLATFORM' },
  '/settings': { title: 'Engine Configuration', section: 'PLATFORM' }
};

export const TopNav: React.FC = () => {
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { notifications, dismissNotification, autonomousResponseGlobalEnabled, incidents } = useSecurityStore();

  const activeIncidents = incidents.filter(i => i.status === 'active');
  const systemState = !autonomousResponseGlobalEnabled 
    ? { label: 'DEFENSE HALTED', color: 'text-[#EF4444] bg-[#EF4444]/15 border-[#EF4444]/30' }
    : activeIncidents.length > 0 
    ? { label: 'DEFENSE ARMED • THREAT ACTIVE', color: 'text-[#F97316] bg-[#F97316]/15 border-[#F97316]/30' }
    : { label: 'AUTONOMOUS DEFENSE ARMED', color: 'text-[#38BDF8] bg-[#0284C7]/15 border-[#0284C7]/30' };

  const routeInfo = routeTitleMap[location.pathname] || {
    title: 'GENYSIS',
    section: 'Workspace'
  };

  return (
    <>
      <header className="h-16 bg-[#090D16] border-b border-[#1A2333] px-6 flex items-center justify-between sticky top-0 z-20">
        {/* Breadcrumb & Title */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#64748B] font-semibold font-mono tracking-wider">{routeInfo.section}</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#334155]" />
          <h1 className="text-sm font-bold text-white tracking-tight font-sans">
            {routeInfo.title}
          </h1>
        </div>

        {/* Global Search trigger bar (Center) */}
        <div className="flex-1 max-w-md mx-6 hidden md:block">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-lg bg-[#0E1422] border border-[#1E293B] hover:border-[#3B82F6]/60 text-xs text-[#94A3B8] transition-all cursor-pointer group shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#38BDF8] transition-colors" />
              <span className="text-xs">Search Genysis telemetry, IPs, IOCs, or playbooks...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#162032] text-[#94A3B8] rounded border border-[#1E293B]">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-3">
          {/* Autonomous Bot Engine Pill */}
          <div className={`hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono font-bold border tracking-wide uppercase ${systemState.color}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            <Cpu className="w-3 h-3 text-current" />
            <span>{systemState.label}</span>
          </div>

          {/* Quick Search mobile icon */}
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search telemetry and playbooks"
            className="md:hidden p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#162032]"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label="View security notifications"
              className="relative p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#162032] transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F97316] ring-2 ring-[#090D16]" />
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-84 bg-[#0E1422] border border-[#1E293B] rounded-xl shadow-cyber-lg z-50 overflow-hidden text-xs">
                <div className="p-3 border-b border-[#1E293B] flex items-center justify-between">
                  <span className="font-bold text-white uppercase text-[10px] font-mono tracking-wider flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-[#3B82F6]" />
                    Autonomous Alerts ({notifications.length})
                  </span>
                  <button
                    onClick={() => setNotificationsOpen(false)}
                    className="text-[#64748B] hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-[#1E293B]">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[#64748B]">
                      No active alerts. Autonomous engine is monitoring all streams.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="p-3 hover:bg-[#162032] transition-colors flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-white">{n.title}</div>
                          <div className="text-[11px] text-[#94A3B8] mt-0.5">{n.message}</div>
                        </div>
                        <button
                          onClick={() => dismissNotification(n.id)}
                          className="text-[#64748B] hover:text-white p-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Dialog Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};
