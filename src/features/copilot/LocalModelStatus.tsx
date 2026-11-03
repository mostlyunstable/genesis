import React, { useEffect, useState } from 'react';
import { sentinelApi } from '@/services/api';

export const LocalModelStatus: React.FC = () => {
  const [label, setLabel] = useState('Checking local model…');
  useEffect(() => {
    let mounted = true;
    sentinelApi.chat.getModel().then(status => {
      if (mounted) setLabel(status.available ? `Local · ${status.model}` : 'Local model unavailable');
    }).catch(() => { if (mounted) setLabel('Local model unavailable'); });
    return () => { mounted = false; };
  }, []);
  return <span title="Responses are generated on this computer through Ollama">{label}</span>;
};
