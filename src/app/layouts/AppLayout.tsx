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
    <div className="min-h-screen bg-[#07090E] text-[#F8FAFC] flex flex-col font-sans">
      {/* Top Demo Disclosure Banner */}
      <DemoModeBanner />

      {/* Main Layout Shell */}
      <div className="flex-1 flex overflow-hidden">
        {/* Clean dark cyber navigation */}
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
            className="pointer-events-auto bg-[#0F1523] border border-[#1E293B] text-xs p-3.5 rounded-xl shadow-cyber-md flex items-start gap-3 animate-in slide-in-from-bottom-2 duration-150"
          >
            <div className="shrink-0 mt-0.5">
              {item.type === 'error' && <AlertCircle className="w-4 h-4 text-[#EF4444]" />}
              {item.type === 'success' && <CheckCircle className="w-4 h-4 text-[#10B981]" />}
              {item.type === 'warning' && <AlertCircle className="w-4 h-4 text-[#F59E0B]" />}
              {item.type === 'info' && <Info className="w-4 h-4 text-[#38BDF8]" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white">{item.title}</div>
              <div className="text-[11px] text-[#94A3B8] mt-0.5 font-sans leading-tight">{item.message}</div>
            </div>
            <button
              onClick={() => dismissNotification(item.id)}
              className="text-[#64748B] hover:text-white shrink-0 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
