import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/navigation/Sidebar';
import { TopNav } from '@/components/navigation/TopNav';
import { DemoModeBanner } from '@/components/ui/DemoModeBanner';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { notifications, dismissNotification } = useSecurityStore();

  return (
    <div className="min-h-screen bg-[#F7F7F2] text-[#20251F] flex flex-col font-sans transition-colors duration-200">
      {/* Top Demo Disclosure Banner */}
      <DemoModeBanner />

      {/* Main Layout Shell */}
      <div className="flex-1 flex overflow-hidden">
        {/* Clean Light-First Navigation Sidebar */}
        <Sidebar />

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <TopNav />

          <main className="flex-1 p-5 sm:p-7 lg:p-9 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Floating Notification Toast Stack */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {notifications.slice(0, 3).map((item) => (
          <div
            key={item.id}
            className="pointer-events-auto bg-white border border-[#E3E5DC] text-xs p-4 rounded-2xl shadow-origin-lg flex items-start gap-3.5 animate-in slide-in-from-bottom-2 duration-150"
          >
            <div className="shrink-0 mt-0.5">
              {item.type === 'error' && <AlertCircle className="w-4 h-4 text-[#B94C43]" />}
              {item.type === 'success' && <CheckCircle className="w-4 h-4 text-[#64856C]" />}
              {item.type === 'warning' && <AlertCircle className="w-4 h-4 text-[#C47A45]" />}
              {item.type === 'info' && <Info className="w-4 h-4 text-[#54765C]" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[#20251F]">{item.title}</div>
              <div className="text-[11px] text-[#73796F] mt-0.5 font-sans leading-tight">{item.message}</div>
            </div>
            <button
              onClick={() => dismissNotification(item.id)}
              className="text-[#969B91] hover:text-[#20251F] shrink-0 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
