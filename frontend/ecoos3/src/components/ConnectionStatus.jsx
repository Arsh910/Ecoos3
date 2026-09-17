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

function describe({ online, rejoinStalled, rejoinGaveUp, activeTransfer }) {
  const saved = activeTransfer ? ' Your progress is saved.' : '';

  if (rejoinGaveUp) {
    return {tone: 'err', icon: 'alert', label: 'Failed',
      detail: `Couldn’t reach the server.${saved} Connect using a new room and resume.`,
    };
  }
  if (!online) {
    return {tone: 'warn', icon: 'plug', label: 'Disconnected',
      detail: `This device is offline. Reconnecting as soon as it is back on a network.${saved}`,
    };
  }
  if (rejoinStalled) {
    return {tone: 'warn', icon: 'plug', label: 'Disconnected',
      detail: `Still trying to reach the server.${saved} Refreshing is safe.`,
    };
  }
  return {tone: 'warn', icon: 'spinner', label: 'Reconnecting', detail: `Trying to reach the server again.${saved}`,
  };
}

export function ConnectionStatus({ signaling, roomCode, rejoinStalled, rejoinGaveUp, activeTransfer }) {
  const online = useOnline();

  if (!roomCode) return null;

  const dropped = signaling === 'closed' || signaling === 'error';
  if (online && !dropped && !rejoinStalled && !rejoinGaveUp) return null;

  const { tone, icon, label, detail } = describe({ online, rejoinStalled, rejoinGaveUp, activeTransfer });

  return (
    <div className={`banner banner--${tone}`} role="status">
      <Icon name={icon} size={14} className={icon === 'spinner' ? 'icon-spin' : undefined} />
      <div>
        <strong>{label}</strong>
        <p>{detail}</p>
      </div>
    </div>
  );
}
