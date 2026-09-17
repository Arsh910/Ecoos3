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

const saved = (activeTransfer) => (activeTransfer ? ' Your progress is saved.' : '');

// Most specific cause first: being offline explains a stall better than a failing rejoin does.
function describe({ online, rejoinStalled, rejoinGaveUp, activeTransfer }) {
  if (!online) {
    return { icon: 'plug', text: `You’re offline — reconnecting as soon as this device is back on a network.${saved(activeTransfer)}` };
  }
  if (rejoinGaveUp) {
    return { icon: 'plug', retry: true, text: `Couldn’t reach the server, so we’ve stopped trying.${saved(activeTransfer)}` };
  }
  if (rejoinStalled) {
    return { icon: 'spinner', retry: true, text: `Still trying to reach the server — refreshing is safe.${saved(activeTransfer)}` };
  }
  return { icon: 'spinner', text: `Reconnecting…${saved(activeTransfer)}` };
}

export function ConnectionStatus({ signaling, roomCode, rejoinStalled, rejoinGaveUp, activeTransfer, onRetry }) {
  const online = useOnline();

  if (!roomCode) return null;

  const disconnected = signaling === 'closed' || signaling === 'error';
  if (online && !disconnected && !rejoinStalled && !rejoinGaveUp) return null;

  const { icon, text, retry } = describe({ online, rejoinStalled, rejoinGaveUp, activeTransfer });

  return (
    <div className="notice" role="status">
      <Icon name={icon} size={14} className={icon === 'spinner' ? 'icon-spin' : undefined} />
      <span className="notice__text">{text}</span>
      {retry && online && (
        <button type="button" className="btn btn--sm" onClick={onRetry}>
          Retry now
        </button>
      )}
    </div>
  );
}
