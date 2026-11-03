import React, { useEffect, useState } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import { useSecurityStore } from '@/stores/useSecurityStore';
import { authApi } from '@/services/api';

export const SessionGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<'loading' | 'ready' | 'signin' | 'offline'>('loading');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function check() {
    setStatus('loading');
    try { await authApi.me(); setStatus('ready'); }
    catch (err) { setStatus((err instanceof TypeError || (err instanceof Error && 'status' in err && Number(err.status) >= 500)) ? 'offline' : 'signin'); }
  }
  useEffect(() => {
    check();
    const expired = () => {
      useChatStore.getState().abortController?.abort();
      useChatStore.setState({ conversations: [], messages: [], uploadedFiles: [], activeConversationId: null,
        activeConversation: null, activeFileId: null, streamingContent: '', isStreaming: false, isSideDrawerOpen: false });
      useSecurityStore.setState({ events: [], detections: [], incidents: [], playbooks: [], actions: [], auditRecords: [], overviewMetrics: null });
      setStatus('signin');
    };
    window.addEventListener('genesis-session-expired', expired);
    return () => window.removeEventListener('genesis-session-expired', expired);
  }, []);
  if (status === 'ready') return <>{children}</>;
  if (status === 'loading') return <main className="p-8" role="status">Connecting to Genesis…</main>;
  return (
    <main className="min-h-screen grid place-items-center bg-[#F8F8F5] p-6">
      <form className="w-full max-w-sm rounded-xl border bg-white p-6 space-y-4" onSubmit={async e => {
        e.preventDefault(); setBusy(true); setError('');
        try { await authApi.login(username, password); setPassword(''); await check(); }
        catch (err) { setError(err instanceof Error ? err.message : 'Sign-in failed'); }
        finally { setBusy(false); }
      }}>
        <h1 className="text-2xl font-semibold">Sign in to Genesis</h1>
        {status === 'offline' ? <>
          <p role="alert">The server is unavailable. Check the connection and retry.</p>
          <button type="button" onClick={check} className="min-h-11 underline">Retry connection</button>
        </> : <>
          <label className="block">Username<input required autoComplete="username" className="block border rounded p-3 w-full" value={username} onChange={e => setUsername(e.target.value)} /></label>
          <label className="block">Password<input required type="password" autoComplete="current-password" className="block border rounded p-3 w-full" value={password} onChange={e => setPassword(e.target.value)} /></label>
          {error && <p role="alert" className="text-red-700">{error}</p>}
          <button disabled={busy} className="min-h-11 w-full rounded bg-[#111417] text-white">{busy ? 'Signing in…' : 'Sign in'}</button>
        </>}
      </form>
    </main>
  );
};
