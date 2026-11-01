import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  ChevronRight, 
  X,
  Radio,
  Cpu,
  ShieldCheck,
  Menu
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { GlobalSearchModal } from './GlobalSearchModal';

const routeTitleMap: Record<string, { title: string; section: string }> = {
  '/': { title: 'Overview', section: 'OPERATIONS' },
  '/copilot': { title: 'Copilot', section: 'OPERATIONS' },
  '/threats': { title: 'Threat Intel', section: 'INVESTIGATION' },
  '/events': { title: 'Events', section: 'OPERATIONS' },
  '/activity': { title: 'Events', section: 'OPERATIONS' },
  '/detections': { title: 'Detections', section: 'OPERATIONS' },
  '/incidents': { title: 'Incidents', section: 'OPERATIONS' },
  '/investigator': { title: 'Investigator', section: 'INVESTIGATION' },
  '/investigations': { title: 'Investigator', section: 'INVESTIGATION' },
  '/assets': { title: 'Assets', section: 'INVESTIGATION' },
  '/mitre': { title: 'MITRE ATT&CK', section: 'INVESTIGATION' },
  '/response': { title: 'Response', section: 'SYSTEM' },
  '/audit': { title: 'Audit Log', section: 'SYSTEM' },
  '/settings': { title: 'Settings', section: 'SYSTEM' },
  '/integrations': { title: 'Sensors', section: 'SYSTEM' }
};

export const TopNav: React.FC = () => {
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { 
    notifications, 
    dismissNotification, 
    autonomousResponseGlobalEnabled, 
    incidents, 
    toggleSidebar
  } = useSecurityStore();

  const activeIncidents = incidents.filter(i => i.status === 'active');
  const systemState = !autonomousResponseGlobalEnabled 
    ? { label: 'DEFENSE PAUSED', color: 'text-[#B94C43] bg-[#F9ECEB] border-[#F2D5D3]' }
    : activeIncidents.length > 0 
    ? { label: 'ATTENTION REQUIRED', color: 'text-[#C47A45] bg-[#FAF2EC] border-[#F4E2D5]' }
    : { label: 'SECURE', color: 'text-[#54765C] bg-[#EAF0E6] border-[#CFDCC9]' };

  const routeInfo = routeTitleMap[location.pathname] || {
    title: 'SENTINEL',
    section: 'INTELLIGENCE'
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-[#E3E5DC] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 select-none transition-colors">
        {/* Mobile menu toggle & Breadcrumb & Screen Title */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={toggleSidebar}
            className="md:hidden p-1.5 rounded-full text-[#73796F] hover:text-[#20251F] hover:bg-[#F0F1EB] transition-colors mr-1 cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-4 h-4" />
          </button>
          <span className="text-[#969B91] font-semibold font-mono tracking-wider uppercase text-[10px] hidden sm:inline">{routeInfo.section}</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#CFD4C9] hidden sm:inline" />
          <h1 className="text-sm font-bold text-[#20251F] tracking-tight font-sans">
            {routeInfo.title}
          </h1>
        </div>

        {/* Global Search trigger bar (Center) */}
        <div className="flex-1 max-w-md mx-6 hidden md:block">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between px-4 py-1.5 rounded-full bg-[#F0F1EB] border border-[#E3E5DC] hover:border-[#54765C]/60 text-xs text-[#73796F] transition-all cursor-pointer group shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[#969B91] group-hover:text-[#54765C] transition-colors" />
              <span className="text-xs">Search IPs, identities, detections, MITRE codes...</span>
            </div>
            <kbd className="px-2 py-0.5 text-[10px] font-mono bg-white text-[#73796F] rounded-full border border-[#E3E5DC]">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right Action Tools & Telemetry HUD */}
        <div className="flex items-center gap-3">
          {/* Autonomous Engine Operational Pill */}
          <div className={`hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono font-bold border tracking-wide uppercase ${systemState.color}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            <Cpu className="w-3 h-3 text-current" />
            <span>{systemState.label}</span>
          </div>

          {/* Quick Search mobile icon */}
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search telemetry and indicators"
            className="md:hidden p-2 rounded-full text-[#73796F] hover:text-[#20251F] hover:bg-[#F0F1EB]"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label="View notifications"
              className="relative p-2 rounded-full text-[#73796F] hover:text-[#20251F] hover:bg-[#F0F1EB] transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#54765C]" />
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-84 bg-white border border-[#E3E5DC] rounded-2xl shadow-origin-lg z-50 overflow-hidden text-xs">
                <div className="p-3.5 border-b border-[#E3E5DC] flex items-center justify-between bg-[#FAFAF7]">
                  <span className="font-bold text-[#20251F] uppercase text-[10px] font-mono tracking-wider flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-[#54765C]" />
                    Security Signals ({notifications.length})
                  </span>
                  <button
                    onClick={() => setNotificationsOpen(false)}
                    className="text-[#969B91] hover:text-[#20251F] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto divide-y divide-[#E3E5DC]">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[#969B91]">
                      No active operational notifications.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="p-3 hover:bg-[#F0F1EB] transition-colors flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-[#20251F] font-sans">{n.title}</div>
                          <div className="text-[11px] text-[#73796F] mt-0.5 font-sans leading-tight">{n.message}</div>
                        </div>
                        <button
                          onClick={() => dismissNotification(n.id)}
                          className="text-[#969B91] hover:text-[#20251F] p-1 cursor-pointer"
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
