import { useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';
import { formatBytes, peerLabel } from '../lib/format';
import { hasFSA, hasOpenPicker, canPersistTransfers } from '../lib/capabilities';
import { pickFiles } from '../lib/filePicker';

const PHASE = { active: 0, pending: 1, done: 2 };
const phaseOf = (t) => (t.done ? 'done' : t.accepted ? 'active' : 'pending');

const movedChunks = (t) =>
  (t.done ? t.total : (t.direction === 'receiving' ? t.received : t.sent)) ?? 0;

function summarize(entries) {
  let chunks = 0;
  let moved = 0;
  let size = 0;

  entries.forEach(([, t]) => {
    chunks += t.total ?? 0;
    moved += movedChunks(t);
    size += t.size ?? 0;
  });

  return { size, count: entries.length, pct: chunks ? Math.round((moved / chunks) * 100) : 0 };
}

function status(transfer, incoming) {
  if (transfer.done) return 'Complete';
  if (transfer.finalizing) return 'Finishing up.. waiting for the other side';
  if (transfer.resending) return `Resuming · ${transfer.resent}/${transfer.resendTotal} chunks`;
  if (transfer.paused) return 'Paused';
  if (transfer.interrupted) return 'Interrupted.. resumes once reconnected';
  if (!transfer.accepted) {
    if (!incoming) return 'Waiting for peer';
    return hasFSA ? 'Waiting for you' : 'Cannot receive in this browser';
  }
  const progressed = (incoming ? transfer.received : transfer.sent) ?? 0;
  return `${incoming ? 'Receiving' : 'Sending'} ${progressed}/${transfer.total} chunks`;
}

function Transfer({ transfer, onAccept }) {
  const incoming = transfer.direction === 'receiving';
  const progressed = (incoming ? transfer.received : transfer.sent) ?? 0;
  const pct = transfer.total ? Math.round((progressed / transfer.total) * 100) : 0;

  return (
    <article className="transfer">
      <div className="transfer__row">
        <Icon name="file" />
        <div className="transfer__name" title={transfer.name}>
          {transfer.name}
        </div>

        {incoming && !transfer.accepted ? (
          <button
            type="button"
            className="btn btn--sm btn--primary"
            onClick={() => onAccept(transfer.peerId, transfer.fileId)}
            disabled={!hasFSA}
            title={hasFSA ? undefined : 'Requires a Chromium browser'}
          >
            Accept
          </button>
        ) : (
          <span className="transfer__pct">{transfer.done ? 'Done' : `${pct}%`}</span>
        )}
      </div>

      <p className="transfer__sub">
        {status(transfer, incoming)} · {formatBytes(transfer.size)} ·{' '}
        {incoming ? 'from' : 'to'} {peerLabel(transfer.peerId, transfer.peerAlias)}
      </p>

      {transfer.resumable === false && !transfer.done && (
        <p className="transfer__warn">
          <Icon name="alert" size={12} />
          No checkpoints — this transfer can’t resume if interrupted
        </p>
      )}

      {transfer.accepted && (
        <div className="track">
          <div
            className={`track__fill ${transfer.done ? 'track__fill--done' : ''} ${transfer.finalizing ? 'track__fill--working' : ''} ${transfer.interrupted || transfer.paused ? 'track__fill--stalled' : ''}`}
            style={{ width: `${transfer.done ? 100 : pct}%` }}
          />
        </div>
      )}

      {transfer.openUrl && (
        <a
          className="transfer__open"
          href={transfer.openUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="external" size={13} />
          Open
        </a>
      )}
    </article>
  );
}

export function FilePanel({ transfers, onSend, onAccept, onAcceptAll, targetCount, persist, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const items = useMemo(
    () => Object.entries(transfers)
      .sort(([, a], [, b]) => PHASE[phaseOf(a)] - PHASE[phaseOf(b)]),
    [transfers],
  );

  // One group per peer, in the order their first transfer appears.
  const groups = useMemo(() => {
    const byPeer = new Map();
    items.forEach((entry) => {
      const { peerId } = entry[1];
      if (!byPeer.has(peerId)) byPeer.set(peerId, []);
      byPeer.get(peerId).push(entry);
    });
    return [...byPeer.entries()];
  }, [items]);

  const summary = useMemo(() => summarize(items), [items]);
  const pendingIn = items.filter(([, t]) => t.direction === 'receiving' && !t.accepted).length;

  const handleDrop = async (event) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;

    // dataTransfer empties when this handler returns, so read it all before any await.
    const entries = [...(event.dataTransfer.items ?? [])].filter((i) => i.kind === 'file');
    const files = [...(event.dataTransfer.files ?? [])];
    const requests = entries.map((i) => i.getAsFileSystemHandle?.());

    const handles = (await Promise.all(requests)).filter((h) => h?.kind === 'file');

    // No handle support: send the plain Files (they can't be resumed after a refresh).
    onSend(handles.length > 0 ? handles : files);
  };

  const choose = async () => {
    if (disabled) return;
    if (hasOpenPicker) {
      onSend(await pickFiles({ multiple: true }));
    }
    else {
      inputRef.current?.click();
    }
  };

  return (
    <section className="panel">
      <header className="panel__head">
        <div>
          <h2 className="panel__title">Files</h2>
          {canPersistTransfers ? (
            <p className="panel__meta">
              <Icon name="lock" size={12} />
              Encrypted · sent to {targetCount === 1 ? '1 peer' : `${targetCount} peers`}
            </p>
          ) : !hasFSA ? (
            <p className="panel__meta panel__meta--warn">
              <Icon name="alert" size={12} />
              Send only — this browser can’t receive files
            </p>
          ) : (
            <p className="panel__meta panel__meta--warn">
              <Icon name="alert" size={12} />
              Transfers can’t be resumed in this browser
            </p>
          )}
          {!persist && (
            <p className="panel__meta panel__meta--warn">
              <Icon name="alert" size={12} />
              Progress isn’t saved — interrupted transfers won’t resume later
            </p>
          )}
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={choose}
          disabled={disabled}
        >
          <Icon name="upload" />
          Select files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={(event) => {
            onSend([...event.target.files]);
            event.target.value = '';
          }}
        />
      </header>

      <div
        className="panel__body"
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false);
        }}
        onDrop={handleDrop}
      >
        <div
          className={`dropzone ${items.length > 0 ? 'dropzone--filled' : ''} ${dragging ? 'dropzone--active' : ''
            }`}
        >
          {items.length === 0 ? (
            <div className="empty">
              <span className="empty__icon">
                <Icon name="upload" size={18} />
              </span>
              <span className="empty__title">No transfers yet</span>
              <span className="empty__hint">
                {hasFSA
                  ? 'Drop files here or use Select files'
                  : 'Drop files here to send — incoming files can’t be saved in this browser'}
              </span>
            </div>
          ) : (
            <>
              {items.length > 1 && (
                <div className="tsummary">
                  <span className="tsummary__text">
                    {summary.count} files · {formatBytes(summary.size)} · {summary.pct}% overall
                  </span>
                  {pendingIn > 1 && (
                    <button
                      type="button"
                      className="btn btn--sm btn--primary"
                      onClick={onAcceptAll}
                      disabled={!hasFSA}
                      title={hasFSA ? 'Choose one folder for every incoming file' : 'Requires a Chromium browser'}
                    >
                      Accept all ({pendingIn})
                    </button>
                  )}
                </div>
              )}

              {groups.map(([peerId, entries]) => (
                <div key={peerId}>
                  {groups.length > 1 && (
                    <p className="tgroup">{peerLabel(peerId, entries[0][1].peerAlias)}</p>
                  )}
                  {entries.map(([key, transfer]) => (
                    <Transfer key={key} transfer={transfer} onAccept={onAccept} />
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
