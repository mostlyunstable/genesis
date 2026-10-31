import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Shield, 
  LayoutDashboard, 
  FileText, 
  Crosshair, 
  Radar, 
  AlertOctagon, 
  Bot, 
  GitCommit, 
  Zap, 
  BookOpen, 
  History, 
  Server, 
  Globe, 
  ScrollText, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  Flame
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  badgeVariant?: 'critical' | 'warning' | 'info';
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar, incidents, detections, actions } = useSecurityStore();
  const location = useLocation();

  const activeIncidentsCount = incidents.filter(i => i.status === 'active').length;
  const criticalDetectionsCount = detections.filter(d => d.severity === 'critical' && d.status === 'open').length;

  const navigationGroups: NavGroup[] = [
    {
      group: 'OVERVIEW',
      items: [
        { name: 'Command Center', path: '/', icon: LayoutDashboard }
      ]
    },
    {
      group: 'MONITORING',
      items: [
        { name: 'Live Logs', path: '/logs', icon: FileText },
        { 
          name: 'Threat Detection', 
          path: '/detections', 
          icon: Crosshair,
          badge: criticalDetectionsCount > 0 ? criticalDetectionsCount : undefined,
          badgeVariant: 'critical'
        },
        { name: 'Attack Intelligence', path: '/attack-intelligence', icon: Radar }
      ]
    },
    {
      group: 'INVESTIGATION',
      items: [
        { 
          name: 'Incidents', 
          path: '/incidents', 
          icon: AlertOctagon,
          badge: activeIncidentsCount > 0 ? activeIncidentsCount : undefined,
          badgeVariant: 'critical'
        },
        { name: 'AI Analyst', path: '/analyst', icon: Bot },
        { name: 'Attack Timeline', path: '/timeline', icon: GitCommit }
      ]
    },
    {
      group: 'RESPONSE',
      items: [
        { name: 'Autonomous Response', path: '/response', icon: Zap },
        { name: 'Playbooks', path: '/playbooks', icon: BookOpen },
        { name: 'Action History', path: '/action-history', icon: History }
      ]
    },
    {
      group: 'ADMINISTRATION',
      items: [
        { name: 'Log Sources', path: '/sources', icon: Server },
        { name: 'Threat Intelligence', path: '/threat-intel', icon: Globe },
        { name: 'Audit Trail', path: '/audit', icon: ScrollText },
        { name: 'Settings', path: '/settings', icon: Settings }
      ]
    }
  ];

  return (
    <aside
      className={`bg-[#0D1016] border-r border-[#252D38] flex flex-col transition-all duration-200 z-30 select-none ${
        sidebarCollapsed ? 'w-[64px]' : 'w-[240px]'
      }`}
    >
      {/* Brand & Workspace Header */}
      <div className="h-14 border-b border-[#252D38] flex items-center justify-between px-3.5">
        <NavLink to="/" className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded bg-[#171E28] border border-[#252D38] flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-[#E0A34A]" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm tracking-wider text-[#E8EDF4] font-mono leading-none">
                SENTINEL<span className="text-[#E0A34A]">.AI</span>
              </span>
              <span className="text-[10px] text-[#586574] font-mono mt-0.5 tracking-tight flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#42B883]" />
                DEFENSE ONLINE
              </span>
            </div>
          )}
        </NavLink>

        <button
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="p-1 rounded text-[#8994A4] hover:text-[#E8EDF4] hover:bg-[#171E28] transition-colors"
          title={sidebarCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-4">
        {navigationGroups.map((group) => (
          <div key={group.group}>
            {!sidebarCollapsed && (
              <div className="px-2.5 mb-1.5 text-[10px] font-semibold font-mono tracking-wider text-[#586574] uppercase">
                {group.group}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || 
                  (item.path !== '/' && location.pathname.startsWith(item.path));

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={sidebarCollapsed ? item.name : undefined}
                    className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded text-xs transition-colors group relative ${
                      isActive
                        ? 'bg-[#171E28] text-[#E8EDF4] font-medium border-l-2 border-[#E0A34A]'
                        : 'text-[#8994A4] hover:text-[#E8EDF4] hover:bg-[#121720]'
                    } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#E0A34A]' : 'text-[#8994A4] group-hover:text-[#E8EDF4]'}`} />
                    
                    {!sidebarCollapsed && (
                      <span className="truncate flex-1">{item.name}</span>
                    )}

                    {!sidebarCollapsed && item.badge !== undefined && (
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold ${
                        item.badgeVariant === 'critical' ? 'bg-[#EF5350]/20 text-[#EF5350]' : 'bg-[#E5AD52]/20 text-[#E5AD52]'
                      }`}>
                        {item.badge}
                      </span>
                    )}

                    {sidebarCollapsed && item.badge !== undefined && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#EF5350]" />
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Health Box */}
      {!sidebarCollapsed ? (
        <div className="p-3 border-t border-[#252D38] bg-[#0A0D12] m-2 rounded border text-xs">
          <div className="flex items-center justify-between text-[#8994A4] mb-1.5 font-mono text-[11px]">
            <span>SYSTEM HEALTH</span>
            <span className="text-[#42B883] font-semibold">NORMAL</span>
          </div>
          <div className="w-full bg-[#171E28] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#42B883] h-full w-[98%]" />
          </div>
          <div className="flex justify-between items-center mt-2 text-[10px] text-[#586574] font-mono">
            <span>UPTIME: 99.98%</span>
            <span>SIMULATED</span>
          </div>
        </div>
      ) : (
        <div className="p-2 border-t border-[#252D38] flex justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-[#42B883]" title="Telemetry Engine Healthy" />
        </div>
      )}
    </aside>
  );
};
