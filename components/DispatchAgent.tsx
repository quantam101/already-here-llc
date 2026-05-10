'use client';

import { useEffect, useRef, useState } from 'react';

type Message = { role: 'user' | 'assistant'; content: string };

const INITIAL: Message = {
  role: 'assistant',
  content: "What type of field work do you need covered, and what city is the site in?"
};

export function DispatchAgent() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/ai-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json() as { reply?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error || 'Agent error');
      setMessages([...next, { role: 'assistant', content: data.reply! }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open dispatch assistant"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-navy shadow-lg transition hover:bg-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M2 2l14 14M16 2L2 16" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M18 10c0 4.418-3.582 8-8 8a7.96 7.96 0 01-4.472-1.368L2 18l1.368-3.528A7.96 7.96 0 012 10c0-4.418 3.582-8 8-8s8 3.582 8 8z" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
            <circle cx="7" cy="10" r="1" fill="white"/>
            <circle cx="10" cy="10" r="1" fill="white"/>
            <circle cx="13" cy="10" r="1" fill="white"/>
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex w-[340px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-3xl border border-borderBrand bg-white shadow-[0_24px_64px_rgba(15,39,71,0.16)]">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-borderBrand bg-navy px-5 py-4">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/15">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M13 7c0 3.314-2.686 6-6 6a5.97 5.97 0 01-3.354-1.026L1 13l1.026-2.646A5.97 5.97 0 011 7c0-3.314 2.686-6 6-6s6 2.686 6 6z" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Dispatch Assistant</p>
              <p className="text-[10px] text-white/60 uppercase tracking-wider">Already Here LLC</p>
            </div>
            <div className="ml-auto flex h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
          </div>

          {/* Messages */}
          <div className="flex max-h-72 flex-col gap-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                    m.role === 'user'
                      ? 'bg-navy text-white'
                      : 'border border-borderBrand bg-soft text-slate-700'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl border border-borderBrand bg-soft px-4 py-3">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            {error && (
              <p className="text-center text-xs text-red-500">{error}</p>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-borderBrand p-3">
            <div className="flex items-center gap-2 rounded-2xl border border-borderBrand bg-soft px-3 py-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Describe the work needed…"
                className="flex-1 bg-transparent text-sm text-ink placeholder:text-slate-400 focus:outline-none"
                disabled={loading}
                maxLength={500}
                aria-label="Message to dispatch assistant"
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl bg-navy text-white transition hover:bg-action disabled:opacity-40"
                aria-label="Send message"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M1 6h10M6 1l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-400">
              AI assistant · <a href="/dispatch" className="underline hover:text-action">Open full dispatch form</a>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
