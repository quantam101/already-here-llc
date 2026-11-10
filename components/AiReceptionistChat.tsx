'use client';

import { useRef, useState } from 'react';

type ChatMessage = { role: 'agent' | 'user'; text: string };

type ConversationResponse = {
  ok: boolean;
  status: 'in_progress' | 'complete';
  question?: string;
  outcome?: {
    outcome: string;
    confirmation: string;
    quoteRangeUsd?: { low: number; high: number };
    responseWindow?: string;
    execution?: { executed: string; workOrderId?: string };
  } | null;
};

export default function AiReceptionistChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [operatorKey, setOperatorKey] = useState('');
  const dataRef = useRef<Record<string, string>>({});
  const stepRef = useRef(0);

  async function send(answer: string) {
    const res = await fetch('/api/ai-receptionist/conversation', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ step: stepRef.current, answer, data: dataRef.current, operatorKey: operatorKey || undefined })
    });
    const body: ConversationResponse = await res.json();
    if (body.status === 'in_progress' && body.question) {
      dataRef.current = { ...(body as unknown as { data?: Record<string, string> }).data };
      stepRef.current = (body as { nextStep?: number }).nextStep ?? stepRef.current + 1;
      setMessages((prev) => [...prev, { role: 'agent', text: body.question! }]);
    } else if (body.status === 'complete') {
      const confirmation = body.outcome?.confirmation;
      const quote = body.outcome?.quoteRangeUsd;
      const workOrder = body.outcome?.execution?.workOrderId;
      const lines = [
        confirmation || 'Request captured and routed to dispatch.',
        quote ? `Estimated range: $${quote.low}–$${quote.high}.` : '',
        body.outcome?.responseWindow ? `Window: ${body.outcome.responseWindow}.` : '',
        workOrder ? `Work order: ${workOrder}.` : ''
      ].filter(Boolean);
      setMessages((prev) => [...prev, { role: 'agent', text: lines.join(' ') }]);
      setDone(true);
    } else {
      setMessages((prev) => [...prev, { role: 'agent', text: 'Something went wrong. Try again or use the intake form below.' }]);
      setDone(true);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const answer = input.trim();
    if (!answer || busy || done) return;
    setMessages((prev) => [...prev, { role: 'user', text: answer }]);
    setInput('');
    setBusy(true);
    try {
      await send(answer);
    } catch {
      setMessages((prev) => [...prev, { role: 'agent', text: 'That answer did not go through — please send it again.' }]);
      setInput(answer);
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    setBusy(true);
    try {
      await send('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6 sm:p-8">
      <h2 className="text-2xl font-semibold text-navy">Talk to the AI receptionist</h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Say what you need. The agent checks it against policy and completes the outcome — quote, dispatch, or escalation — before the conversation ends.
      </p>

      <div className="mt-6 grid max-h-96 gap-3 overflow-y-auto rounded-2xl border border-borderBrand bg-soft p-4">
        {messages.length === 0 && !busy ? (
          <button type="button" onClick={start} className="rounded-full bg-action px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy">
            Start conversation
          </button>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={
                msg.role === 'agent'
                  ? 'max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm leading-6 text-slate-700 shadow-sm'
                  : 'max-w-[85%] justify-self-end rounded-2xl rounded-tr-sm bg-action px-4 py-3 text-sm leading-6 text-white'
              }
            >
              {msg.text}
            </div>
          ))
        )}
        {busy && <div className="text-sm text-slate-500">…</div>}
      </div>

      {!done && messages.length > 0 && (
        <form onSubmit={handleSubmit} className="mt-4 flex gap-3">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type your answer…"
            className="flex-1 rounded-full border border-borderBrand px-5 py-3 text-sm font-medium outline-none focus:border-action"
            disabled={busy}
          />
          <button type="submit" disabled={busy || !input.trim()} className="rounded-full bg-action px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy disabled:opacity-50">
            Send
          </button>
        </form>
      )}

      <details className="mt-4 text-xs text-slate-500">
        <summary className="cursor-pointer font-semibold">Operator access</summary>
        <input
          value={operatorKey}
          onChange={(event) => setOperatorKey(event.target.value)}
          placeholder="Operator key"
          type="password"
          className="mt-2 w-full rounded-full border border-borderBrand px-4 py-2 text-xs outline-none focus:border-action"
        />
      </details>

    </div>
  );
}
