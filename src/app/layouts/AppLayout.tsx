import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/navigation/Sidebar';
import { TopNav } from '@/components/navigation/TopNav';
import { DemoModeBanner } from '@/components/ui/DemoModeBanner';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { notifications, dismissNotification } = useSecurityStore();

  return (
    <div className="min-h-screen bg-[#090B0F] text-[#E8EDF4] flex flex-col font-sans">
      {/* Top Demo Disclosure Banner */}
      <DemoModeBanner />

      {/* Main Shell */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <TopNav />

          <main className="flex-1 p-4 md:p-6 bg-[#090B0F]">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Toast Notification Stack */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {notifications.slice(0, 3).map((item) => (
          <div
            key={item.id}
            className="pointer-events-auto bg-[#121720] border border-[#252D38] text-xs p-3 rounded shadow-2xl flex items-start gap-3 animate-in slide-in-from-bottom-2 duration-150"
          >
            <div className="shrink-0 mt-0.5">
              {item.type === 'error' && <AlertTriangle className="w-4 h-4 text-[#EF5350]" />}
              {item.type === 'success' && <CheckCircle className="w-4 h-4 text-[#42B883]" />}
              {item.type === 'warning' && <AlertTriangle className="w-4 h-4 text-[#E5AD52]" />}
              {item.type === 'info' && <Info className="w-4 h-4 text-[#6DA9E8]" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[#E8EDF4]">{item.title}</div>
              <div className="text-[11px] text-[#8994A4] mt-0.5 font-mono">{item.message}</div>
            </div>
            <button
              onClick={() => dismissNotification(item.id)}
              className="text-[#586574] hover:text-[#E8EDF4] shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
