import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  ChevronRight, 
  CheckCircle, 
  AlertTriangle, 
  X,
  Radio
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { GlobalSearchModal } from './GlobalSearchModal';

const routeTitleMap: Record<string, { title: string; section: string }> = {
  '/': { title: 'Assistant', section: 'Primary' },
  '/investigations': { title: 'Investigations', section: 'Primary' },
  '/activity': { title: 'Security Activity', section: 'Primary' },
  '/threats': { title: 'Threats', section: 'Security' },
  '/incidents': { title: 'Incidents', section: 'Security' },
  '/response': { title: 'Autonomous Response', section: 'Security' },
  '/integrations': { title: 'Telemetry Forwarders', section: 'System' },
  '/settings': { title: 'System Configuration', section: 'System' }
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
    ? { label: 'THREAT IDENTIFIED', color: 'text-[#FF5722] bg-[#FF5722]/15 border-[#FF5722]/30' }
    : { label: 'MONITORING', color: 'text-[#38BDF8] bg-[#0066FF]/15 border-[#0066FF]/30' };

  const routeInfo = routeTitleMap[location.pathname] || {
    title: 'SENTINEL',
    section: 'Workspace'
  };

  return (
    <>
      <header className="h-16 bg-[#0B0F17] border-b border-[#1E293B] px-6 flex items-center justify-between sticky top-0 z-20">
        {/* Breadcrumb & Title */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#64748B] font-medium font-mono">{routeInfo.section}</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#334155]" />
          <h1 className="text-sm font-bold text-white tracking-tight">
            {routeInfo.title}
          </h1>
        </div>

        {/* Global Search trigger bar (Center) */}
        <div className="flex-1 max-w-sm mx-6 hidden md:block">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-full bg-[#0F1523] border border-[#1E293B] hover:border-[#0066FF]/60 text-xs text-[#94A3B8] transition-all cursor-pointer group shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#38BDF8]" />
              <span className="text-xs">Search signals, assets, or techniques...</span>
            </div>
            <kbd className="px-1.5 py-0.2 text-[10px] font-mono bg-[#141C2E] text-[#94A3B8] rounded border border-[#1E293B]">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-3">
          {/* System Defense Pill */}
          <div className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold border tracking-wide uppercase ${systemState.color}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {systemState.label}
          </div>

          {/* Quick Search mobile icon */}
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search signals, assets, or techniques"
            className="md:hidden p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#141C2E]"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label="View security notifications"
              className="relative p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#141C2E] transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF5722] ring-2 ring-[#0B0F17]" />
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-[#0F1523] border border-[#1E293B] rounded-xl shadow-cyber-lg z-50 overflow-hidden text-xs">
                <div className="p-3 border-b border-[#1E293B] flex items-center justify-between">
                  <span className="font-bold text-white uppercase text-[10px] font-mono tracking-wider">
                    Security Alerts ({notifications.length})
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
                      No active notifications.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="p-3 hover:bg-[#141C2E] transition-colors flex items-start justify-between gap-2">
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
