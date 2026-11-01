import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  X,
  Radio,
  Menu
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { GlobalSearchModal } from './GlobalSearchModal';

const routeTitleMap: Record<string, string> = {
  '/': 'Copilot',
  '/copilot': 'Copilot',
  '/response': 'Response',
  '/audit': 'Audit Trail',
  '/settings': 'Settings'
};

export const TopNav: React.FC = () => {
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { 
    notifications, 
    dismissNotification, 
    toggleMobileSidebar
  } = useSecurityStore();

  const title = routeTitleMap[location.pathname] || 'Copilot';

  return (
    <>
      <header className="h-14 bg-white border-b border-[#E3E5DC] px-4 sm:px-6 flex items-center justify-between shrink-0 z-20 select-none">
        {/* Mobile menu toggle & Screen Title */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleMobileSidebar}
            className="md:hidden p-1.5 rounded-full text-[#73796F] hover:text-[#20251F] hover:bg-[#F0F1EB] transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold text-[#20251F] tracking-tight font-sans">
            {title}
          </h1>
        </div>

        {/* Global Search trigger bar (Center) */}
        <div className="flex-1 max-w-md mx-6 hidden md:block">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-full bg-[#F0F1EB] border border-[#E3E5DC] hover:border-[#54765C]/60 text-xs text-[#73796F] transition-all cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[#969B91] group-hover:text-[#54765C] transition-colors" />
              <span className="text-xs">Search logs, playbooks, audit ledger...</span>
            </div>
            <kbd className="px-2 py-0.5 text-[10px] font-mono bg-white text-[#73796F] rounded-full border border-[#E3E5DC]">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-2.5">
          {/* Status Indicator */}
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-[#54765C] bg-[#EAF0E6] border border-[#CFDCC9]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#54765C]" />
            <span>Online</span>
          </div>

          {/* Quick Search mobile icon */}
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search records"
            className="md:hidden p-1.5 rounded-full text-[#73796F] hover:text-[#20251F] hover:bg-[#F0F1EB]"
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
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#54765C]" />
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E3E5DC] rounded-2xl shadow-origin-lg z-50 overflow-hidden text-xs">
                <div className="p-3 border-b border-[#E3E5DC] flex items-center justify-between bg-[#FAFAF7]">
                  <span className="font-semibold text-[#20251F] text-xs flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-[#54765C]" />
                    Notifications ({notifications.length})
                  </span>
                  <button
                    onClick={() => setNotificationsOpen(false)}
                    className="text-[#969B91] hover:text-[#20251F] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-[#E3E5DC]">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-[#969B91] text-xs">
                      No new notifications
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="p-3 hover:bg-[#FAFAF7] transition-colors flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-[#20251F]">{n.title}</div>
                          <div className="text-[11px] text-[#73796F] mt-0.5">{n.message}</div>
                        </div>
                        <button
                          onClick={() => dismissNotification(n.id)}
                          className="text-[#969B91] hover:text-[#20251F] p-0.5 cursor-pointer shrink-0"
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

      {/* Global Quick Search Modal */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};
