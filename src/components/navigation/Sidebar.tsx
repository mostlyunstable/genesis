import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard,
  ShieldAlert, 
  Radio, 
  Cpu, 
  Flame, 
  Search, 
  ShieldCheck, 
  FileText, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Activity
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { GenysisLogo } from '@/components/ui/GenysisLogo';

interface NavItem {
  id: string;
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  badgeType?: 'critical' | 'warning' | 'info';
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar, incidents, detections, actions } = useSecurityStore();
  const location = useLocation();

  const activeIncidentsCount = incidents.filter(i => i.status === 'active').length;
  const criticalThreatsCount = detections.filter(d => d.severity === 'critical' && d.status === 'open').length;

  // The 9 Canonical Cybersecurity Operations Modules
  const navigationSections: NavSection[] = [
    {
      title: 'OPERATIONAL COMMAND',
      items: [
        { name: 'Command Center', path: '/', id: 'command-center', icon: LayoutDashboard },
        { 
          name: 'Threat Intelligence', 
          path: '/threats', 
          id: 'threat-intelligence', 
          icon: ShieldAlert,
          badge: criticalThreatsCount > 0 ? criticalThreatsCount : undefined,
          badgeType: 'critical'
        },
        { name: 'Security Events', path: '/events', id: 'security-events', icon: Radio },
        { name: 'Detection Engine', path: '/detections', id: 'detection-engine', icon: Cpu }
      ]
    },
    {
      title: 'INTELLIGENCE & INVESTIGATION',
      items: [
        { 
          name: 'Incidents', 
          path: '/incidents', 
          id: 'incidents', 
          icon: Flame,
          badge: activeIncidentsCount > 0 ? activeIncidentsCount : undefined,
          badgeType: 'warning'
        },
        { name: 'AI Investigator', path: '/investigator', id: 'ai-investigator', icon: Search }
      ]
    },
    {
      title: 'DEFENSE & GOVERNANCE',
      items: [
        { name: 'Response Operations', path: '/response', id: 'response-operations', icon: ShieldCheck },
        { name: 'Audit Trail', path: '/audit', id: 'audit-trail', icon: FileText },
        { name: 'System Configuration', path: '/settings', id: 'system-configuration', icon: Settings }
      ]
    }
  ];

  return (
    <aside
      className={`bg-[#0A0D14] border-r border-[#1C2230] flex flex-col transition-all duration-200 z-30 select-none ${
        sidebarCollapsed ? 'w-[68px]' : 'w-[240px]'
      }`}
    >
      {/* Brand & Wordmark Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#1C2230]">
        <NavLink to="/" className="flex items-center gap-2 group overflow-hidden">
          <GenysisLogo size="sm" showWordmark={!sidebarCollapsed} />
        </NavLink>

        <button
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="p-1.5 rounded-md text-[#64748B] hover:text-white hover:bg-[#161B26] transition-colors cursor-pointer"
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navigationSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!sidebarCollapsed && (
              <div className="px-3 pb-1 text-[10px] font-bold text-[#475569] tracking-[0.16em] uppercase font-mono">
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
                        ? 'bg-[#3B82F6]/15 text-[#38BDF8] border border-[#3B82F6]/30 font-semibold shadow-sm'
                        : 'text-[#94A3B8] hover:text-white hover:bg-[#121622] border border-transparent'
                    } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#38BDF8]' : 'text-[#64748B]'}`} />
                    
                    {!sidebarCollapsed && (
                      <span className="truncate flex-1 tracking-tight font-sans">{item.name}</span>
                    )}

                    {!sidebarCollapsed && item.badge !== undefined && (
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                        item.badgeType === 'critical' ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30' :
                        'bg-[#F97316]/20 text-[#F97316] border border-[#F97316]/30'
                      }`}>
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

      {/* Autonomous Operational Health Status */}
      <div className="p-3 border-t border-[#1C2230]">
        {!sidebarCollapsed ? (
          <div className="p-2.5 rounded-lg bg-[#0E121A] border border-[#1C2230] text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-white font-sans">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                Autonomous Engine
              </span>
              <span className="text-[10px] font-mono font-bold text-[#F97316]">ARMED</span>
            </div>
            <p className="text-[10px] text-[#64748B] mt-1 leading-tight font-mono">
              5 forwarders • 8.4M signals/24h
            </p>
          </div>
        ) : (
          <div className="flex justify-center p-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" title="Autonomous Engine Active" />
          </div>
        )}
      </div>
    </aside>
  );
};
