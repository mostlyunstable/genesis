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
  Activity,
  Server,
  Sparkles
} from 'lucide-react';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { SentinelLogo } from '@/components/ui/SentinelLogo';

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
  const { 
    sidebarCollapsed, 
    toggleSidebar, 
    incidents, 
    detections,
    logSources,
    totalEventsCount,
    autonomousResponseGlobalEnabled
  } = useSecurityStore();
  const location = useLocation();

  const activeIncidentsCount = incidents.filter(i => i.status === 'active').length;
  const criticalThreatsCount = detections.filter(d => d.severity === 'critical' && d.status === 'open').length;

  // The 3 Core Navigation Modules
  const navigationSections: NavSection[] = [
    {
      title: 'INTELLIGENCE',
      items: [
        { name: 'Intelligence Briefing', path: '/', id: 'overview', icon: LayoutDashboard },
        { 
          name: 'Security Copilot', 
          path: '/copilot', 
          id: 'security-copilot', 
          icon: Sparkles,
          badge: 'AI',
          badgeType: 'info'
        },
        { 
          name: 'Threat Landscape', 
          path: '/threats', 
          id: 'threat-intelligence', 
          icon: ShieldAlert,
          badge: criticalThreatsCount > 0 ? criticalThreatsCount : undefined,
          badgeType: 'critical'
        },
        { name: 'Security Events', path: '/events', id: 'security-events', icon: Radio },
        { 
          name: 'Incidents Queue', 
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
      title: 'KNOWLEDGE & ASSETS',
      items: [
        { name: 'Assets & Topology', path: '/assets', id: 'assets', icon: Server },
        { name: 'MITRE ATT&CK', path: '/mitre', id: 'mitre', icon: Activity },
        { name: 'Detection Engine', path: '/detections', id: 'detection-engine', icon: Cpu }
      ]
    },
    {
      title: 'DEFENSE & GOVERNANCE',
      items: [
        { name: 'Response Center', path: '/response', id: 'response-operations', icon: ShieldCheck },
        { name: 'Audit Trail', path: '/audit', id: 'audit-trail', icon: FileText },
        { name: 'System Settings', path: '/settings', id: 'system-configuration', icon: Settings }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop when open on small screens */}
      {!sidebarCollapsed && (
        <div 
          onClick={toggleSidebar}
          className="fixed inset-0 bg-black/20 z-20 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      <aside
        className={`bg-white border-r border-[#E3E5DC] flex flex-col transition-all duration-200 z-30 select-none ${
          sidebarCollapsed ? 'hidden md:flex w-[72px]' : 'fixed md:relative inset-y-0 left-0 w-[250px] shadow-sm md:shadow-none'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-[#E3E5DC]">
          <NavLink to="/" className="flex items-center gap-2 group overflow-hidden">
            <SentinelLogo size="md" showWordmark={!sidebarCollapsed} brandName="SENTINEL" />
          </NavLink>

          <button
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-1.5 rounded-full text-[#73796F] hover:text-[#20251F] hover:bg-[#F0F1EB] transition-colors cursor-pointer"
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
                <div className="px-3 pb-1 text-[10px] font-bold text-[#969B91] tracking-[0.16em] uppercase font-mono">
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
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-full text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-[#EAF0E6] text-[#54765C] font-semibold border border-[#CFDCC9]'
                          : 'text-[#73796F] hover:text-[#20251F] hover:bg-[#F0F1EB] border border-transparent'
                      } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#54765C]' : 'text-[#73796F]'}`} />
                      
                      {!sidebarCollapsed && (
                        <span className="truncate flex-1 tracking-tight font-sans">{item.name}</span>
                      )}

                      {!sidebarCollapsed && item.badge !== undefined && (
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                          item.badgeType === 'critical' ? 'bg-[#F9ECEB] text-[#B94C43] border border-[#F2D5D3]' :
                          'bg-[#FAF2EC] text-[#C47A45] border border-[#F4E2D5]'
                        }`}>
                          {item.badge}
                        </span>
                      )}

                      {sidebarCollapsed && item.badge !== undefined && (
                        <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-[#B94C43]" />
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Autonomous Operational Health Status */}
        <div className="p-3 border-t border-[#E3E5DC]">
          {!sidebarCollapsed ? (
            <div className="p-3 rounded-2xl bg-[#FAFAF7] border border-[#E3E5DC] text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#20251F] font-sans">
                  <span className="w-2 h-2 rounded-full bg-[#54765C] animate-pulse" />
                  Sentinel Engine
                </span>
                <span className="text-[10px] font-mono font-bold text-[#54765C]">
                  {autonomousResponseGlobalEnabled ? 'ARMED' : 'HALTED'}
                </span>
              </div>
              <p className="text-[10px] text-[#73796F] mt-1 leading-tight font-mono">
                {logSources.length} sensors • {totalEventsCount.toLocaleString()} evts
              </p>
            </div>
          ) : (
            <div className="flex justify-center p-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#54765C] animate-pulse" title="Sentinel Engine Active" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
