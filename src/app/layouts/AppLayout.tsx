import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '@/components/navigation/Sidebar';
import { TopNav } from '@/components/navigation/TopNav';
import { CopilotSideDrawer } from '@/features/copilot/CopilotSideDrawer';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { useChatStore } from '@/stores/useChatStore';
import { X, CheckCircle, AlertCircle, Info, Sparkles } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { notifications, dismissNotification } = useSecurityStore();
  const { isSideDrawerOpen, setSideDrawerOpen } = useChatStore();
  const location = useLocation();
  const isCopilot = location.pathname === '/copilot';

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#F8F8F5] text-[#111417] flex flex-col font-sans transition-colors duration-200">
      {/* Main Layout Shell */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Clean Light-First Navigation Sidebar */}
        <Sidebar />

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          <TopNav />

          {isCopilot ? (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <Outlet />
            </div>
          ) : (
            <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
              <Outlet />
            </main>
          )}
        </div>
      </div>

      {/* Global Copilot Side Drawer (Accessible from Landing Page & across Platform) */}
      <CopilotSideDrawer />

      {/* Floating Side Chatbot Pill Trigger (visible on sm+ viewports when not on full /copilot route) */}
      {!isCopilot && !isSideDrawerOpen && (
        <button
          onClick={() => setSideDrawerOpen(true)}
          className="fixed bottom-6 right-6 z-40 hidden sm:flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-[#111417] hover:bg-[#1E4BD8] text-white text-xs font-bold shadow-xl hover:shadow-2xl transition-all active:scale-95 cursor-pointer group border-2 border-[#2A3138] hover:border-[#4D76F8]"
          title="Open Genesis Copilot (Side Panel)"
          aria-label="Open Genesis Copilot"
        >
          <Sparkles className="w-4 h-4 text-[#A7C1FF] group-hover:text-white transition-colors" />
          <span>Copilot</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </button>
      )}

      {/* Floating Notification Toast Stack */}
      <div className="fixed bottom-5 left-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {notifications.slice(0, 3).map((item) => (
          <div
            key={item.id}
            className="pointer-events-auto bg-white border border-[#E2E4DC] text-xs p-3.5 rounded-xl shadow-lg flex items-start gap-3 animate-in slide-in-from-bottom-2 duration-150"
          >
            <div className="shrink-0 mt-0.5">
              {item.type === 'error' && <AlertCircle className="w-4 h-4 text-[#B94C43]" />}
              {item.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-600" />}
              {item.type === 'warning' && <AlertCircle className="w-4 h-4 text-[#C47A45]" />}
              {item.type === 'info' && <Info className="w-4 h-4 text-[#1E4BD8]" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[#111417]">{item.title}</div>
              <div className="text-[11px] text-[#5C645B] mt-0.5 font-sans leading-tight">{item.message}</div>
            </div>
            <button
              onClick={() => dismissNotification(item.id)}
              className="text-[#889085] hover:text-[#111417] shrink-0 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
