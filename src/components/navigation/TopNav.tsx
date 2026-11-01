import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Search, 
  Bell, 
  X,
  Radio,
  Menu,
  Sparkles
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { useChatStore } from '@/stores/useChatStore';
import { GlobalSearchModal } from './GlobalSearchModal';

const routeTitleMap: Record<string, string> = {
  '/': 'Overview',
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
  const { setSideDrawerOpen } = useChatStore();

  const title = routeTitleMap[location.pathname] || 'Overview';

  return (
    <>
      <header className="h-14 bg-white border-b border-[#E2E4DC] px-4 sm:px-6 flex items-center justify-between shrink-0 z-20 select-none">
        {/* Mobile menu toggle & Screen Title */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleMobileSidebar}
            className="md:hidden p-1.5 rounded-lg text-[#5E656D] hover:text-[#111417] hover:bg-[#F0F1EA] transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold text-[#111417] tracking-tight font-display">
            {title}
          </h1>
        </div>

        {/* Global Search trigger bar (Center - Visible on large screens) */}
        <div className="flex-1 max-w-md mx-6 hidden lg:block">
          <button
            onClick={() => setSearchOpen(true)}
            className="w-full flex items-center justify-between px-3.5 h-8.5 rounded-lg bg-[#F0F1EA] border border-[#E2E4DC] hover:border-[#CDCFCE] hover:bg-white text-xs text-[#5E656D] hover:text-[#111417] transition-all cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Search className="w-3.5 h-3.5 text-[#8A939E] group-hover:text-[#1E4BD8] transition-colors shrink-0" />
              <span className="text-xs truncate">Search playbooks, activity ledger, entities...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white text-[#5E656D] rounded border border-[#E2E4DC] shadow-2xs shrink-0 ml-2">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Search icon (Visible on tablet & mobile) */}
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search records"
            className="lg:hidden p-1.5 rounded-lg text-[#5E656D] hover:text-[#111417] hover:bg-[#F0F1EA] transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label="View notifications"
              className="relative p-1.5 rounded-lg text-[#5E656D] hover:text-[#111417] hover:bg-[#F0F1EA] transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#1E4BD8]" />
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E2E4DC] rounded-xl shadow-origin-lg z-50 overflow-hidden text-xs">
                <div className="p-3 border-b border-[#E2E4DC] flex items-center justify-between bg-[#F8F8F5]">
                  <span className="font-semibold text-[#111417] text-xs flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-[#1E4BD8]" />
                    Notifications ({notifications.length})
                  </span>
                  <button
                    onClick={() => setNotificationsOpen(false)}
                    className="text-[#8A939E] hover:text-[#111417] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto divide-y divide-[#E2E4DC]">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-[#8A939E] text-xs">
                      No new notifications
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="p-3 hover:bg-[#F8F8F5] transition-colors flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-[#111417]">{n.title}</div>
                          <div className="text-[11px] text-[#5E656D] mt-0.5">{n.message}</div>
                        </div>
                        <button
                          onClick={() => dismissNotification(n.id)}
                          className="text-[#8A939E] hover:text-[#111417] p-0.5 cursor-pointer shrink-0"
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
