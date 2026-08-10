'use client';

import { useCallback, useEffect, useState } from 'react';
import { flushOfflineRevenueEvents, listOfflineRevenueEvents } from '@/lib/revenue-command-offline';

export function RevenueCommandMobileSync() {
  const [online, setOnline] = useState(true);
  const [queued, setQueued] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshQueue = useCallback(async () => {
    try { setQueued((await listOfflineRevenueEvents()).length); } catch { setQueued(0); }
  }, []);

  const sync = useCallback(async () => {
    if (!navigator.onLine || syncing) return;
    setSyncing(true);
    try { await flushOfflineRevenueEvents(); } finally { setSyncing(false); await refreshQueue(); }
  }, [refreshQueue, syncing]);

  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
      refreshQueue().catch(() => null);
      if (navigator.onLine) sync().catch(() => null);
    };
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, [refreshQueue, sync]);

  return (
    <div className="container-shell pt-3">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-borderBrand bg-white px-4 py-3 text-xs text-slate-600">
        <span className="font-semibold text-navy">Mobile field sync</span>
        <span>{online ? 'Online' : 'Offline'}</span>
        <span>Queued: {queued}</span>
        <button type="button" disabled={!online || syncing || queued === 0} onClick={() => sync().catch(() => null)} className="rounded-full border border-borderBrand px-3 py-1 font-semibold text-navy disabled:opacity-40">{syncing ? 'Syncing' : 'Sync now'}</button>
        <span className="text-slate-400">Offline submissions remain on this device until the secure Revenue Command session can sync them.</span>
      </div>
    </div>
  );
}
