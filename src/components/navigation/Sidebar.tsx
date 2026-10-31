import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Sparkles, 
  Search, 
  Activity, 
  ShieldAlert, 
  Flame, 
  ShieldCheck, 
  Layers, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Radio
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { SentinelLogo } from '@/components/ui/SentinelLogo';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar, incidents, detections } = useSecurityStore();
  const location = useLocation();

  const activeIncidentsCount = incidents.filter(i => i.status === 'active').length;
  const criticalThreatsCount = detections.filter(d => d.severity === 'critical' && d.status === 'open').length;

  const navigationSections: NavSection[] = [
    {
      title: 'PRIMARY',
      items: [
        { name: 'Assistant', path: '/', icon: Sparkles },
        { 
          name: 'Investigations', 
          path: '/investigations', 
          icon: Search,
          badge: activeIncidentsCount > 0 ? activeIncidentsCount : undefined
        },
        { name: 'Activity', path: '/activity', icon: Activity }
      ]
    },
    {
      title: 'SECURITY',
      items: [
        { 
          name: 'Threats', 
          path: '/threats', 
          icon: ShieldAlert,
          badge: criticalThreatsCount > 0 ? criticalThreatsCount : undefined
        },
        { name: 'Incidents', path: '/incidents', icon: Flame },
        { name: 'Response', path: '/response', icon: ShieldCheck }
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { name: 'Integrations', path: '/integrations', icon: Layers },
        { name: 'Settings', path: '/settings', icon: Settings }
      ]
    }
  ];

  return (
    <aside
      className={`bg-[#0B0F17] border-r border-[#1E293B] flex flex-col transition-all duration-200 z-30 select-none ${
        sidebarCollapsed ? 'w-[68px]' : 'w-[230px]'
      }`}
    >
      {/* Brand & Wordmark */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#1E293B]">
        <NavLink to="/" className="flex items-center gap-2 group overflow-hidden">
          <SentinelLogo size="sm" showWordmark={!sidebarCollapsed} />
        </NavLink>

        <button
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="p-1 rounded-md text-[#94A3B8] hover:text-white hover:bg-[#141C2E] transition-colors cursor-pointer"
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navigationSections.map((section) => (
          <div key={section.title} className="space-y-1.5">
            {!sidebarCollapsed && (
              <div className="px-3 pb-1 text-[10px] font-bold text-[#64748B] tracking-[0.15em] uppercase font-mono">
                {section.title}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.path === '/' 
                  ? location.pathname === '/' 
                  : location.pathname.startsWith(item.path);

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={sidebarCollapsed ? item.name : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#0066FF]/15 text-[#38BDF8] border border-[#0066FF]/30 font-semibold shadow-sm'
                        : 'text-[#94A3B8] hover:text-white hover:bg-[#141C2E] border border-transparent'
                    } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#38BDF8]' : 'text-[#64748B]'}`} />
                    
                    {!sidebarCollapsed && (
                      <span className="truncate flex-1 tracking-tight">{item.name}</span>
                    )}

                    {!sidebarCollapsed && item.badge !== undefined && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-[#FF5722] text-white shadow-sm">
                        {item.badge}
                      </span>
                    )}

                    {sidebarCollapsed && item.badge !== undefined && (
                      <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-[#FF5722]" />
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sentinel Status Pulse */}
      <div className="p-3 border-t border-[#1E293B]">
        {!sidebarCollapsed ? (
          <div className="p-2.5 rounded-lg bg-[#0F1523] border border-[#1E293B] text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-white">
                <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse" />
                Sentinel Engine
              </span>
              <span className="text-[10px] font-mono text-[#38BDF8]">v2.0</span>
            </div>
            <p className="text-[10px] text-[#94A3B8] mt-1 leading-tight font-sans">
              Ingestion active across 5 forwarders
            </p>
          </div>
        ) : (
          <div className="flex justify-center p-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8] animate-pulse" title="Sentinel Engine Active" />
          </div>
        )}
      </div>
    </aside>
  );
};
