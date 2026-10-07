'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Send, Bot, User, Sparkles } from 'lucide-react';
import type { AnalysisReport } from '@/lib/types/analysis';
import { cn } from '@/lib/utils';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatSidebarProps {
  open: boolean;
  onClose: () => void;
  report: AnalysisReport | null;
}

const QUICK_PROMPTS = [
  { label: 'Why does X win?', prompt: 'Why does the winning solution win? Summarize the key reasons.' },
  { label: 'Optimize A', prompt: 'How can I optimize Solution A? Give me concrete code-level changes.' },
  { label: 'Summarize', prompt: 'Summarize the entire analysis in 3 clear bullet points.' },
  { label: 'Edge cases', prompt: 'What edge cases should I worry about for each solution?' },
];

export default function ChatSidebar({ open, onClose, report }: ChatSidebarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg: ChatMessage = { role: 'user', content };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, report: report ?? null }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = await res.json();
      const reply =
        data?.message?.content ??
        data?.content ??
        data?.reply ??
        data?.text ??
        'Sorry, I could not generate a response right now.';
      setMessages((m) => [...m, { role: 'assistant', content: String(reply) }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content:
            'Sorry, something went wrong contacting the chat service. ' +
            (err instanceof Error ? err.message : String(err)),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full sm:w-[420px] border-l border-ink-700/60 bg-ink-950 shadow-2xl',
          'flex flex-col transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-ink-700/60 px-4 py-3.5">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500/15 ring-1 ring-accent-500/30">
              <Sparkles className="h-4 w-4 text-accent-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-ink-100">Ask Whitecode</div>
              <div className="text-[11px] text-ink-500">
                {report ? 'Report attached' : 'No report loaded'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost !p-2"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        >
          {messages.length === 0 && (
            <div className="mt-8 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-900 ring-1 ring-ink-700/60 mb-3">
                <Bot className="h-6 w-6 text-accent-400" />
              </div>
              <div className="text-sm font-semibold text-ink-200 mb-1">
                Chat with your analysis
              </div>
              <div className="text-xs text-ink-500 max-w-xs mx-auto mb-5">
                Ask follow-ups, request optimizations, or dig deeper into any section of the report.
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={cn('flex gap-2.5', m.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {m.role === 'assistant' && (
                <div className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-500/15 ring-1 ring-accent-500/30">
                  <Bot className="h-3.5 w-3.5 text-accent-400" />
                </div>
              )}
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
                  m.role === 'user'
                    ? 'bg-accent-500 text-white rounded-br-md'
                    : 'bg-ink-900 border border-ink-700/60 text-ink-200 rounded-bl-md'
                )}
              >
                {m.content}
              </div>
              {m.role === 'user' && (
                <div className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/30">
                  <User className="h-3.5 w-3.5 text-emerald-400" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5 justify-start">
              <div className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-500/15 ring-1 ring-accent-500/30">
                <Bot className="h-3.5 w-3.5 text-accent-400" />
              </div>
              <div className="bg-ink-900 border border-ink-700/60 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-ink-400 anim-typing"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-ink-400 anim-typing"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-ink-400 anim-typing"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {messages.length === 0 && (
          <div className="px-4 pb-2 grid grid-cols-2 gap-1.5">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p.label}
                onClick={() => send(p.prompt)}
                disabled={loading}
                className="chip justify-center py-1.5 text-left"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        <div className="border-t border-ink-700/60 p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={2}
              placeholder="Ask anything about the analysis…"
              className="input-base resize-none !py-2 !text-[13px] leading-5"
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className={cn(
                'btn-primary !h-10 !w-10 !p-0 shrink-0',
                !input.trim() && 'opacity-60'
              )}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-1.5 text-[10px] text-ink-500 text-center">
            Enter to send · Shift+Enter for new line · Esc to close
          </div>
        </div>
      </aside>
    </>
  );
}
