// Transport-independent: browser TTS, native speech or clips can implement play(item, signal).
export function createDialogueQueue({ play }) {
  let pending = [], active = null, draining = false;
  function discard() { for (const item of pending) item.resolve('cancelled'); pending = []; }
  async function drain() {
    if (draining) return;
    draining = true;
    try {
      while (pending.length) {
        const entry = pending.shift(); const controller = new AbortController();
        active = controller;
        let unlisten;
        const cancelled = new Promise(resolve => { const fn = () => resolve('cancelled'); controller.signal.addEventListener('abort', fn, {once:true}); unlisten = () => controller.signal.removeEventListener('abort',fn); });
        const playback = Promise.resolve().then(() => controller.signal.aborted ? 'cancelled' : play(entry.item, controller.signal)).then(() => controller.signal.aborted ? 'cancelled' : 'played', () => 'failed');
        const result = await Promise.race([playback, cancelled]);
        unlisten(); active = null; entry.resolve(result);
      }
    } finally { draining = false; }
  }
  return {
    enqueue(item) {
      if (!item || typeof item.text !== 'string' || !item.text.trim()) return Promise.resolve('skipped');
      if (item.priority === 'safety') { discard(); active?.abort(); }
      const result = new Promise(resolve => pending.push({item:{...item},resolve}));
      void drain(); return result;
    },
    clear() { discard(); active?.abort(); },
  };
}

