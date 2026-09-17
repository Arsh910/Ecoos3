import { useEffect, useState } from 'react';
import { Icon } from './Icon';

function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return online;
}

// Most specific cause first: being offline explains a stall better than a failing rejoin does.
function describe({ online, rejoinStalled, activeTransfer }) {
  if (!online) {
    return { icon: 'plug', text: 'You’re offline — the transfer continues when you reconnect.' };
  }
  if (rejoinStalled) {
    return { icon: 'spinner', text: 'Still trying to reach the server — your progress is saved, and refreshing is safe.' };
  }
  if (activeTransfer) {
    return { icon: 'spinner', text: 'Reconnecting — your progress is saved.' };
  }
  // The hook only rejoins on its own while a transfer is in flight.
  return { icon: 'plug', text: 'Disconnected from the server — rejoin the room to reconnect.' };
}

export function ConnectionStatus({ signaling, roomCode, rejoinStalled, activeTransfer }) {
  const online = useOnline();

  if (!roomCode) return null;

  const disconnected = signaling === 'closed' || signaling === 'error';
  if (online && !disconnected && !rejoinStalled) return null;

  const { icon, text } = describe({ online, rejoinStalled, activeTransfer });

  return (
    <p className="notice" role="status">
      <Icon name={icon} size={14} className={icon === 'spinner' ? 'icon-spin' : undefined} />
      {text}
    </p>
  );
}
