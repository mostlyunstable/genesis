import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  ShieldCheck, 
  User, 
  Clock, 
  ChevronRight, 
  CheckCircle, 
  AlertTriangle, 
  Info,
  X,
  ExternalLink
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { GlobalSearchModal } from './GlobalSearchModal';

const routeTitleMap: Record<string, { title: string; section: string }> = {
  '/': { title: 'Command Center', section: 'Overview' },
  '/logs': { title: 'Live Logs Explorer', section: 'Monitoring' },
  '/detections': { title: 'Threat Detection', section: 'Monitoring' },
  '/attack-intelligence': { title: 'Attack Intelligence', section: 'Monitoring' },
  '/incidents': { title: 'Incident Investigation Workspace', section: 'Investigation' },
  '/analyst': { title: 'Sentinel AI Analyst', section: 'Investigation' },
  '/timeline': { title: 'Attack Progression Timeline', section: 'Investigation' },
  '/response': { title: 'Autonomous Response Center', section: 'Response' },
  '/playbooks': { title: 'Defensive Playbooks', section: 'Response' },
  '/action-history': { title: 'Action Execution History', section: 'Response' },
  '/sources': { title: 'Log Sources & Forwarders', section: 'Administration' },
  '/threat-intel': { title: 'Threat Intelligence Indicators', section: 'Administration' },
  '/audit': { title: 'Compliance & Execution Audit Trail', section: 'Administration' },
  '/settings': { title: 'Platform Settings & Thresholds', section: 'Administration' }
};

export const TopNav: React.FC = () => {
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  const { notifications, dismissNotification, autonomousResponseGlobalEnabled } = useSecurityStore();

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toUTCString().replace('GMT', 'UTC'));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const routeInfo = routeTitleMap[location.pathname] || {
    title: 'SENTINEL AI Platform',
    section: 'Console'
  };

  return (
    <>
      <header className="h-14 bg-[#0D1016] border-b border-[#252D38] px-4 flex items-center justify-between sticky top-0 z-20">
        {/* Breadcrumb & Title */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[#586574]">{routeInfo.section}</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#252D38]" />
          <h1 className="text-sm font-semibold text-[#E8EDF4] font-sans tracking-tight">
            {routeInfo.title}
          </h1>
        </div>

        {/* Center / Search bar trigger */}
        <div className="flex-1 max-w-md mx-6 hidden md:block">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded bg-[#121720] border border-[#252D38] hover:border-[#E0A34A]/50 text-xs text-[#586574] hover:text-[#8994A4] transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[#586574] group-hover:text-[#8994A4]" />
              <span>Search incidents, IPs, rules, telemetry...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#171E28] text-[#8994A4] rounded border border-[#252D38]">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Nav Utilities */}
        <div className="flex items-center gap-3">
          {/* UTC Clock */}
          <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-mono text-[#8994A4] bg-[#121720] px-2.5 py-1 rounded border border-[#252D38]">
            <Clock className="w-3 h-3 text-[#E0A34A]" />
            <span>{currentTime || 'Syncing UTC...'}</span>
          </div>

          {/* Autonomous Status Pill */}
          <Link
            to="/settings"
            title="Autonomous Defense Engine Status"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono border border-[#252D38] bg-[#121720] hover:bg-[#171E28] transition-colors"
          >
            <span className={`w-2 h-2 rounded-full ${autonomousResponseGlobalEnabled ? 'bg-[#42B883] animate-pulse' : 'bg-[#EF5350]'}`} />
            <span className="text-[11px] text-[#8994A4]">DEFENSE:</span>
            <span className={`text-[11px] font-bold ${autonomousResponseGlobalEnabled ? 'text-[#42B883]' : 'text-[#EF5350]'}`}>
              {autonomousResponseGlobalEnabled ? 'ACTIVE' : 'HALT'}
            </span>
          </Link>

          {/* Search button on small screens */}
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search incidents and telemetry"
            className="md:hidden p-1.5 rounded text-[#8994A4] hover:text-[#E8EDF4] hover:bg-[#171E28] transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label="View security notifications"
              className="p-1.5 rounded text-[#8994A4] hover:text-[#E8EDF4] hover:bg-[#171E28] transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#E0A34A] animate-pulse" />
              )}
            </button>

            {/* Notifications Flyout */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-[#121720] border border-[#252D38] rounded-md shadow-2xl py-2 z-50 animate-in fade-in-0 duration-100">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#252D38]">
                  <span className="text-xs font-semibold text-[#E8EDF4] font-mono uppercase">
                    Security Alerts ({notifications.length})
                  </span>
                  <button
                    onClick={() => setNotificationsOpen(false)}
                    className="text-[#8994A4] hover:text-[#E8EDF4]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-[#1C2430]">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[#586574]">
                      No unread system events
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="p-2.5 hover:bg-[#171E28] transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {n.type === 'error' && <AlertTriangle className="w-3.5 h-3.5 text-[#EF5350]" />}
                            {n.type === 'success' && <CheckCircle className="w-3.5 h-3.5 text-[#42B883]" />}
                            {n.type === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-[#E5AD52]" />}
                            {n.type === 'info' && <Info className="w-3.5 h-3.5 text-[#6DA9E8]" />}
                            <span className="text-xs font-semibold text-[#E8EDF4] truncate">{n.title}</span>
                          </div>
                          <span className="text-[10px] text-[#586574] font-mono shrink-0">{n.timestamp}</span>
                        </div>
                        <p className="text-[11px] text-[#8994A4] mt-1 line-clamp-2">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 pl-2 border-l border-[#252D38] cursor-pointer"
            >
              <div className="w-7 h-7 rounded bg-[#171E28] border border-[#252D38] flex items-center justify-center text-[#E8EDF4] text-xs font-mono font-semibold">
                SA
              </div>
              <div className="hidden lg:flex flex-col text-left leading-none">
                <span className="text-xs font-medium text-[#E8EDF4]">SecOps Lead</span>
                <span className="text-[10px] text-[#586574] font-mono">Tier-3 Analyst</span>
              </div>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[#121720] border border-[#252D38] rounded-md shadow-2xl py-2 z-50 text-xs font-mono">
                <div className="px-3 py-2 border-b border-[#252D38]">
                  <div className="font-semibold text-[#E8EDF4]">secops_analyst@sentinel.ai</div>
                  <div className="text-[10px] text-[#42B883]">Role: Incident Commander</div>
                </div>
                <Link
                  to="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="block px-3 py-2 text-[#8994A4] hover:text-[#E8EDF4] hover:bg-[#171E28]"
                >
                  Detection Thresholds
                </Link>
                <Link
                  to="/audit"
                  onClick={() => setProfileOpen(false)}
                  className="block px-3 py-2 text-[#8994A4] hover:text-[#E8EDF4] hover:bg-[#171E28]"
                >
                  My Audit Activity
                </Link>
                <div className="border-t border-[#252D38] mt-1 pt-1">
                  <div className="px-3 py-1.5 text-[10px] text-[#586574]">
                    Auth: Kerberos SSO Token (Valid 6h)
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Cmd+K Global Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};
