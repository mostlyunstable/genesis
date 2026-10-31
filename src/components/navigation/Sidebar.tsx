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
  ChevronRight 
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
      className={`bg-white border-r border-[#E9E6E0] flex flex-col transition-all duration-200 z-30 select-none ${
        sidebarCollapsed ? 'w-[68px]' : 'w-[220px]'
      }`}
    >
      {/* Brand & Wordmark */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#F0ECE6]">
        <NavLink to="/" className="flex items-center gap-2 group overflow-hidden">
          <SentinelLogo size="sm" showWordmark={!sidebarCollapsed} />
        </NavLink>

        <button
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="p-1 rounded-md text-[#77736D] hover:text-[#171717] hover:bg-[#F3F2EE] transition-colors cursor-pointer"
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navigationSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-2.5 pb-1 text-[10px] font-semibold text-[#A5A19A] tracking-wider uppercase font-mono">
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
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#FFF0E8] text-[#F15A24] font-semibold'
                        : 'text-[#77736D] hover:text-[#171717] hover:bg-[#F3F2EE]'
                    } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#F15A24]' : 'text-[#77736D]'}`} />
                    
                    {!sidebarCollapsed && (
                      <span className="truncate flex-1">{item.name}</span>
                    )}

                    {!sidebarCollapsed && item.badge !== undefined && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-semibold bg-[#F15A24] text-white">
                        {item.badge}
                      </span>
                    )}

                    {sidebarCollapsed && item.badge !== undefined && (
                      <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-[#F15A24]" />
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sentinel Status Pulse */}
      <div className="p-3 border-t border-[#F0ECE6]">
        {!sidebarCollapsed ? (
          <div className="p-2.5 rounded-lg bg-[#FAFAF8] border border-[#E9E6E0] text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#171717]">
                <span className="w-2 h-2 rounded-full bg-[#258A62] animate-pulse" />
                Sentinel Engine
              </span>
              <span className="text-[10px] font-mono text-[#77736D]">v2.0</span>
            </div>
            <p className="text-[10px] text-[#77736D] mt-1 leading-tight font-sans">
              Ingestion active across 5 forwarders
            </p>
          </div>
        ) : (
          <div className="flex justify-center p-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#258A62] animate-pulse" title="Sentinel Engine Active" />
          </div>
        )}
      </div>
    </aside>
  );
};
