import React, { useEffect, useState } from 'react';
import { sentinelApi } from '@/services/api';

export const LocalModelStatus: React.FC = () => {
  const [label, setLabel] = useState('Checking local model…');
  useEffect(() => {
    let mounted = true;
    const refresh = () => sentinelApi.chat.getModel().then(status => {
      if (mounted) setLabel(status.available ? `Local · ${status.model}` : 'Local model unavailable');
    }).catch(() => { if (mounted) setLabel('Local model unavailable'); });
    refresh();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    window.addEventListener('genesis-model-refresh', refresh);
    return () => {
      mounted = false; window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('genesis-model-refresh', refresh);
    };
  }, []);
  return <span title="Responses are generated through Ollama on the inference server">{label}</span>;
};
