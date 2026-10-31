import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  ShieldCheck, 
  Clock, 
  ChevronRight, 
  CheckCircle, 
  AlertTriangle, 
  X,
  Radio,
  Sliders
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { GlobalSearchModal } from './GlobalSearchModal';

const routeTitleMap: Record<string, { title: string; section: string }> = {
  '/': { title: 'Sentinel Assistant', section: 'Primary' },
  '/investigations': { title: 'Security Investigations', section: 'Primary' },
  '/activity': { title: 'Security Activity Stream', section: 'Primary' },
  '/threats': { title: 'Threat Detections', section: 'Security' },
  '/incidents': { title: 'Active Incidents', section: 'Security' },
  '/response': { title: 'Autonomous Response', section: 'Security' },
  '/integrations': { title: 'Integrations & Sources', section: 'System' },
  '/settings': { title: 'Settings & Policy', section: 'System' }
};

export const TopNav: React.FC = () => {
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { notifications, dismissNotification, autonomousResponseGlobalEnabled, incidents } = useSecurityStore();

  const activeIncidents = incidents.filter(i => i.status === 'active');
  const systemState = !autonomousResponseGlobalEnabled 
    ? { label: 'EMERGENCY HALT', color: 'text-[#D94B45] bg-[#FDF2F2] border-[#D94B45]/20' }
    : activeIncidents.length > 0 
    ? { label: 'THREAT DETECTED', color: 'text-[#F15A24] bg-[#FFF0E8] border-[#F15A24]/30' }
    : { label: 'MONITORING', color: 'text-[#258A62] bg-[#F0FDF4] border-[#258A62]/20' };

  const routeInfo = routeTitleMap[location.pathname] || {
    title: 'SENTINEL AI',
    section: 'Workspace'
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-[#E9E6E0] px-6 flex items-center justify-between sticky top-0 z-20">
        {/* Breadcrumb & Title */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#A5A19A] font-medium font-mono">{routeInfo.section}</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#E9E6E0]" />
          <h1 className="text-sm font-semibold text-[#171717] tracking-tight">
            {routeInfo.title}
          </h1>
        </div>

        {/* Global Search trigger bar (Center) */}
        <div className="flex-1 max-w-sm mx-6 hidden md:block">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-full bg-[#FAFAF8] border border-[#E9E6E0] hover:border-[#F15A24]/40 text-xs text-[#77736D] transition-all cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[#A5A19A] group-hover:text-[#F15A24]" />
              <span className="text-xs">Ask or search anything...</span>
            </div>
            <kbd className="px-1.5 py-0.2 text-[10px] font-mono bg-white text-[#77736D] rounded border border-[#E9E6E0]">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Section: System State & Utilities */}
        <div className="flex items-center gap-3">
          {/* System Status Pill */}
          <div className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-medium border ${systemState.color}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            <span>{systemState.label}</span>
          </div>

          {/* Search Trigger for small screens */}
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            className="md:hidden p-2 rounded-lg text-[#77736D] hover:bg-[#F3F2EE]"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label="Notifications"
              className="p-2 rounded-full text-[#77736D] hover:text-[#171717] hover:bg-[#F3F2EE] transition-colors relative cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#F15A24]" />
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E9E6E0] rounded-xl shadow-lg-soft py-2 z-50">
                <div className="flex items-center justify-between px-4 py-2 border-b border-[#F0ECE6]">
                  <span className="text-xs font-semibold text-[#171717]">
                    Notifications ({notifications.length})
                  </span>
                  <button onClick={() => setNotificationsOpen(false)} className="text-[#A5A19A] hover:text-[#171717]">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-[#F0ECE6]">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[#A5A19A]">
                      No new security alerts
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="p-3 hover:bg-[#FAFAF8] text-xs">
                        <div className="font-medium text-[#171717]">{n.title}</div>
                        <div className="text-[11px] text-[#77736D] mt-0.5">{n.message}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SecOps User Pill */}
          <Link
            to="/settings"
            className="flex items-center gap-2 pl-2 border-l border-[#E9E6E0] hover:opacity-80 transition-opacity"
          >
            <div className="w-7 h-7 rounded-full bg-[#FFF0E8] text-[#F15A24] border border-[#F15A24]/30 flex items-center justify-center font-bold text-xs font-mono">
              S
            </div>
            <span className="text-xs font-medium text-[#171717] hidden lg:inline">
              SecOps Lead
            </span>
          </Link>
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};
