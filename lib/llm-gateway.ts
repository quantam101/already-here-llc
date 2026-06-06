import { createLevel4Event, executeWithLevel4Resiliency } from './level4-resiliency';

/**
 * LiteLLM Hypervisor Gateway — shared utility for all Next.js API routes.
 * Routes LLM calls through the configured hypervisor first, then direct providers.
 * Level-4 runtime records outage/degraded events and returns deterministic output when all providers fail.
 */

const GATEWAY_URL = (process.env.GATEWAY_URL ?? '').replace(/\/$/, '');
const GATEWAY_KEY = process.env.LITELLM_MASTER_KEY ?? '';
const GROQ_KEY = process.env.GROQ_API_KEY ?? '';
const GEMINI_KEY = process.env.GEMINI_API_KEY ?? '';

export interface LLMMessage { role: 'system' | 'user' | 'assistant'; content: string; }

async function callGateway(messages: LLMMessage[], maxTokens: number): Promise<string | null> {
  if (!GATEWAY_URL) return null;

  const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(GATEWAY_KEY ? { Authorization: `Bearer ${GATEWAY_KEY}` } : {})
    },
    body: JSON.stringify({ model: 'autonomous-intelligence-mesh', messages, max_tokens: maxTokens }),
    signal: AbortSignal.timeout(20_000)
  });

  if (!res.ok) return null;
  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? null;
}

async function callGroq(messages: LLMMessage[], maxTokens: number): Promise<string | null> {
  if (!GROQ_KEY) return null;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: maxTokens }),
    signal: AbortSignal.timeout(20_000)
  });

  if (!res.ok) return null;
  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? null;
}

async function callGemini(messages: LLMMessage[], maxTokens: number): Promise<string | null> {
  if (!GEMINI_KEY) return null;

  const contents = messages.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }]
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: maxTokens } }),
      signal: AbortSignal.timeout(20_000)
    }
  );

  if (!res.ok) return null;
  const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

function deterministicLLMFallback(messages: LLMMessage[]): string {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content ?? '';

  return [
    'AI providers are currently unavailable. Level-4 deterministic fallback is active.',
    '',
    'Request captured for replay/retry through the resilient runtime.',
    lastUserMessage ? `Last user request: ${lastUserMessage.slice(0, 500)}` : 'No user request content was available.'
  ].join('\n');
}

export async function llmComplete(
  messages: LLMMessage[],
  maxTokens = 1500
): Promise<string | null> {
  const event = createLevel4Event({
    type: 'llm.completion',
    source: 'lib/llm-gateway',
    payload: {
      messageCount: messages.length,
      maxTokens,
      providers: {
        gateway: Boolean(GATEWAY_URL),
        groq: Boolean(GROQ_KEY),
        gemini: Boolean(GEMINI_KEY)
      }
    }
  });

  return executeWithLevel4Resiliency({
    event,
    timeoutMs: 25_000,
    primary: async () => {
      const gateway = await callGateway(messages, maxTokens).catch(() => null);
      if (gateway) return gateway;

      const groq = await callGroq(messages, maxTokens).catch(() => null);
      if (groq) return groq;

      const gemini = await callGemini(messages, maxTokens).catch(() => null);
      if (gemini) return gemini;

      throw new Error('All LLM providers unavailable or unconfigured.');
    },
    fallback: () => deterministicLLMFallback(messages)
  });
}
