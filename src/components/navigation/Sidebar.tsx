import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Search, 
  Activity, 
  ShieldAlert, 
  Flame, 
  ShieldCheck, 
  Layers, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Radio,
  FileText
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
      title: 'OPERATIONS',
      items: [
        { name: 'Workspace', path: '/', icon: Activity },
        { 
          name: 'Investigations', 
          path: '/investigations', 
          icon: Search,
          badge: activeIncidentsCount > 0 ? activeIncidentsCount : undefined
        },
        { name: 'Activity Stream', path: '/activity', icon: Radio }
      ]
    },
    {
      title: 'INTELLIGENCE & DEFENSE',
      items: [
        { 
          name: 'Threats & Intel', 
          path: '/threats', 
          icon: ShieldAlert,
          badge: criticalThreatsCount > 0 ? criticalThreatsCount : undefined
        },
        { name: 'Incidents', path: '/incidents', icon: Flame },
        { name: 'Response Center', path: '/response', icon: ShieldCheck }
      ]
    },
    {
      title: 'PLATFORM',
      items: [
        { name: 'Forwarders', path: '/integrations', icon: Layers },
        { name: 'Audit Trail', path: '/audit', icon: FileText },
        { name: 'Configuration', path: '/settings', icon: Settings }
      ]
    }
  ];

  return (
    <aside
      className={`bg-[#0D111A] border-r border-[#1A2232] flex flex-col transition-all duration-200 z-30 select-none ${
        sidebarCollapsed ? 'w-[68px]' : 'w-[230px]'
      }`}
    >
      {/* Brand & Wordmark */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#1A2232]">
        <NavLink to="/" className="flex items-center gap-2 group overflow-hidden">
          <SentinelLogo size="sm" showWordmark={!sidebarCollapsed} />
        </NavLink>

        <button
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="p-1 rounded-md text-[#94A3B8] hover:text-white hover:bg-[#182030] transition-colors cursor-pointer"
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
                        ? 'bg-[#3B82F6]/15 text-[#38BDF8] border border-[#3B82F6]/30 font-semibold shadow-sm'
                        : 'text-[#94A3B8] hover:text-white hover:bg-[#141C2B] border border-transparent'
                    } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#38BDF8]' : 'text-[#64748B]'}`} />
                    
                    {!sidebarCollapsed && (
                      <span className="truncate flex-1 tracking-tight">{item.name}</span>
                    )}

                    {!sidebarCollapsed && item.badge !== undefined && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-[#EF4444] text-white shadow-sm">
                        {item.badge}
                      </span>
                    )}

                    {sidebarCollapsed && item.badge !== undefined && (
                      <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-[#EF4444]" />
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Genysis Engine Pulse */}
      <div className="p-3 border-t border-[#1A2232]">
        {!sidebarCollapsed ? (
          <div className="p-2.5 rounded-lg bg-[#121722] border border-[#1A2232] text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-white">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                Genysis Bot Engine
              </span>
              <span className="text-[10px] font-mono text-[#F97316]">ONLINE</span>
            </div>
            <p className="text-[10px] text-[#94A3B8] mt-1 leading-tight font-sans">
              Autonomous telemetry synced across 5 forwarders
            </p>
          </div>
        ) : (
          <div className="flex justify-center p-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" title="Genysis Bot Engine Active" />
          </div>
        )}
      </div>
    </aside>
  );
};
