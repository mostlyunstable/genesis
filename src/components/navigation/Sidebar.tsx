import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Compass,
  ShieldCheck, 
  FileText, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  X
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { SentinelLogo } from '@/components/ui/SentinelLogo';

interface NavItem {
  id: string;
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const Sidebar: React.FC = () => {
  const { 
    sidebarCollapsed, 
    toggleSidebar, 
    mobileSidebarOpen, 
    setMobileSidebarOpen 
  } = useSecurityStore();
  const location = useLocation();

  // Navigation Items: Overview (Landing), Copilot, Response, Audit Trail, Settings
  const navItems: NavItem[] = [
    { name: 'Overview', path: '/', id: 'overview', icon: Compass },
    { name: 'Copilot', path: '/copilot', id: 'copilot', icon: Sparkles },
    { name: 'Response', path: '/response', id: 'response', icon: ShieldCheck },
    { name: 'Audit Trail', path: '/audit', id: 'audit', icon: FileText },
    { name: 'Settings', path: '/settings', id: 'settings', icon: Settings }
  ];

  return (
    <>
      {/* Mobile Backdrop when open on small screens */}
      {mobileSidebarOpen && (
        <div 
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/30 z-40 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      <aside
        className={`bg-white border-r border-[#E2E4DC] flex flex-col shrink-0 min-h-0 h-full transition-all duration-200 z-50 select-none ${
          mobileSidebarOpen
            ? 'fixed inset-y-0 left-0 w-[240px] shadow-origin-lg flex md:relative md:shadow-none'
            : sidebarCollapsed
            ? 'hidden md:flex w-[72px]'
            : 'hidden md:flex w-[240px]'
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-[#E2E4DC] shrink-0">
          <NavLink 
            to="/" 
            onClick={() => setMobileSidebarOpen(false)}
            className="flex items-center gap-2 group overflow-hidden"
          >
            <SentinelLogo size="md" showWordmark={!sidebarCollapsed || mobileSidebarOpen} brandName="GENESIS" />
          </NavLink>

          {/* Desktop Collapse / Mobile Close Button */}
          <div className="flex items-center">
            {/* Mobile close button */}
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-[#5E656D] hover:text-[#111417] hover:bg-[#F0F1EA] transition-colors cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Desktop collapse toggle */}
            <button
              onClick={toggleSidebar}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden md:inline-flex p-1.5 rounded-lg text-[#5E656D] hover:text-[#111417] hover:bg-[#F0F1EA] transition-colors cursor-pointer"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-2.5 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileSidebarOpen(false)}
                title={sidebarCollapsed && !mobileSidebarOpen ? item.name : undefined}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all duration-150 ${
                  isActive
                    ? 'bg-[#111417] text-white font-medium shadow-xs'
                    : 'text-[#5E656D] hover:text-[#111417] hover:bg-[#F0F1EA]'
                } ${sidebarCollapsed && !mobileSidebarOpen ? 'justify-center px-0' : ''}`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#5E656D]'}`} />
                
                {(!sidebarCollapsed || mobileSidebarOpen) && (
                  <span className="truncate flex-1 tracking-tight font-sans">{item.name}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Status Indicator */}
        <div className="p-3 border-t border-[#E2E4DC] shrink-0">
          {!sidebarCollapsed || mobileSidebarOpen ? (
            <div className="px-3 py-2 rounded-lg bg-[#F0F1EA] border border-[#E2E4DC] text-xs flex items-center justify-between">
              <span className="flex items-center gap-2 text-[11px] font-medium text-[#111417] font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1E824C] shadow-2xs" />
                Genesis Online
              </span>
              <span className="text-[10px] font-mono text-[#8A939E]">v2.5</span>
            </div>
          ) : (
            <div className="flex justify-center p-1">
              <span className="w-2 h-2 rounded-full bg-[#1E824C]" title="Genesis Online" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
