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
    <div className="min-h-screen bg-[#FAFAF8] text-[#171717] flex flex-col font-sans">
      {/* Top Demo Disclosure Banner */}
      <DemoModeBanner />

      {/* Main Layout Shell */}
      <div className="flex-1 flex overflow-hidden">
        {/* Narrow, clean left navigation */}
        <Sidebar />

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <TopNav />

          <main className="flex-1 p-6 lg:p-8 bg-[#FAFAF8] max-w-7xl w-full mx-auto">
            <Outlet />
          </main>
        </div>
      </div>

      {/* Floating Notification Toast Stack */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {notifications.slice(0, 3).map((item) => (
          <div
            key={item.id}
            className="pointer-events-auto bg-white border border-[#E9E6E0] text-xs p-3.5 rounded-xl shadow-lg-soft flex items-start gap-3 animate-in slide-in-from-bottom-2 duration-150"
          >
            <div className="shrink-0 mt-0.5">
              {item.type === 'error' && <AlertCircle className="w-4 h-4 text-[#D94B45]" />}
              {item.type === 'success' && <CheckCircle className="w-4 h-4 text-[#258A62]" />}
              {item.type === 'warning' && <AlertCircle className="w-4 h-4 text-[#D97706]" />}
              {item.type === 'info' && <Info className="w-4 h-4 text-[#4F7FC1]" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[#171717]">{item.title}</div>
              <div className="text-[11px] text-[#77736D] mt-0.5 font-sans leading-tight">{item.message}</div>
            </div>
            <button
              onClick={() => dismissNotification(item.id)}
              className="text-[#A5A19A] hover:text-[#171717] shrink-0 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
