import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Leaf, LogIn, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];

  const parseInline = (str: string, key: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
    let last = 0;
    let match;
    let idx = 0;
    while ((match = regex.exec(str)) !== null) {
      if (match.index > last) parts.push(str.slice(last, match.index));
      if (match[2] !== undefined) parts.push(<strong key={`${key}-b${idx}`} className="font-semibold text-white">{match[2]}</strong>);
      else if (match[3] !== undefined) parts.push(<em key={`${key}-i${idx}`} className="italic">{match[3]}</em>);
      else if (match[4] !== undefined) parts.push(<code key={`${key}-c${idx}`} className="bg-zinc-700 px-1 py-0.5 rounded text-emerald-300 text-xs font-mono">{match[4]}</code>);
      last = match.index + match[0].length;
      idx++;
    }
    if (last < str.length) parts.push(str.slice(last));
    return parts.length === 1 ? parts[0] : <span key={key}>{parts}</span>;
  };

  lines.forEach((line, i) => {
    const key = `line-${i}`;
    if (/^#{1,3}\s/.test(line)) {
      const content = line.replace(/^#{1,3}\s/, '');
      nodes.push(<p key={key} className="font-bold text-white mt-1">{parseInline(content, key)}</p>);
    } else if (/^[-*•]\s/.test(line)) {
      const content = line.replace(/^[-*•]\s/, '');
      nodes.push(
        <div key={key} className="flex gap-1.5 items-start">
          <span className="text-emerald-400 mt-0.5 flex-shrink-0">•</span>
          <span>{parseInline(content, key)}</span>
        </div>
      );
    } else if (line.trim() === '') {
      nodes.push(<div key={key} className="h-1.5" />);
    } else {
      nodes.push(<p key={key}>{parseInline(line, key)}</p>);
    }
  });

  return nodes;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  reasoning_details?: unknown;
}

interface Props {
  onSignInClick: () => void;
}

const SUGGESTIONS = [
  'How do I schedule a pickup?',
  'How do eco-points work?',
  'What are carbon credits?',
  'How do I earn badges?',
];

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: "👋 Hi! I'm GreenLoop's AI assistant. I can help you with pickups, eco-points, carbon credits, badges, and more. Ask me anything!",
};

export function GreenLoopChatbot({ onSignInClick }: Props) {
  const { isAuthenticated, token } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "👋 Hi! I'm GreenLoop's AI assistant. I can help you with pickups, eco-points, carbon credits, badges, and more. Ask me anything!",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [pulse, setPulse] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up interval on unmount
  useEffect(() => () => { if (streamIntervalRef.current) clearInterval(streamIntervalRef.current); }, []);

  const streamReply = (fullText: string, reasoning_details?: unknown) => {
    const words = fullText.split(' ');
    let wordIdx = 0;
    setStreaming(true);
    // Add empty message placeholder
    setMessages(prev => [...prev, { role: 'assistant', content: '', reasoning_details }]);
    streamIntervalRef.current = setInterval(() => {
      wordIdx++;
      const partial = words.slice(0, wordIdx).join(' ');
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { ...updated[updated.length - 1], content: partial };
        return updated;
      });
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      if (wordIdx >= words.length) {
        clearInterval(streamIntervalRef.current!);
        streamIntervalRef.current = null;
        setStreaming(false);
      }
    }, 35);
  };

  useEffect(() => {
    setMessages([INITIAL_MESSAGE]);
    setInput('');
    setOpen(false);
  }, [isAuthenticated]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages]);

  useEffect(() => {
    if (!open) {
      const interval = setInterval(() => setPulse(p => !p), 3000);
      return () => clearInterval(interval);
    }
  }, [open]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading || streaming) return;

    const userMsg: Message = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    if (!isAuthenticated) {
      setTimeout(() => {
        setLoading(false);
        streamReply("🔐 To get personalized answers and make the most of GreenLoop, please **sign in** first!\n\nJoining GreenLoop means you can schedule pickups, earn eco-points, trade carbon credits, and help build a greener Bangladesh. It only takes a minute — sign up and start your green journey today! 🌿");
      }, 600);
      return;
    }

    try {
      // Include reasoning_details for assistant messages to support multi-turn reasoning
      const apiMessages = updatedMessages.map(m => {
        const msg: any = { role: m.role, content: m.content };
        if (m.reasoning_details) msg.reasoning_details = m.reasoning_details;
        return msg;
      });
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: apiMessages }),
      });
      const data = await res.json();
      setLoading(false);
      if (res.ok) {
        streamReply(data.reply || 'I could not generate a response. Please try again.', data.reasoning_details);
      } else {
        streamReply(data.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setLoading(false);
      streamReply('Connection error. Please check your internet and try again.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-[340px] sm:w-[380px] bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            style={{ height: 520 }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 bg-gradient-to-r from-emerald-900/30 to-zinc-900/50">
              <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Leaf className="w-4 h-4 text-black" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-white truncate">GreenLoop Assistant</p>
                <p className="text-xs text-emerald-400">AI-powered help</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Leaf className="w-3 h-3 text-emerald-400" />
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-emerald-500 text-black font-medium rounded-tr-sm whitespace-pre-wrap'
                        : 'bg-zinc-800/80 text-zinc-100 rounded-tl-sm space-y-0.5'
                    }`}
                  >
                    {msg.role === 'user' ? msg.content : renderMarkdown(msg.content)}
                    {msg.role === 'assistant' && streaming && i === messages.length - 1 && (
                      <span className="inline-block w-0.5 h-4 bg-emerald-400 ml-0.5 align-middle animate-pulse" />
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Leaf className="w-3 h-3 text-emerald-400" />
                  </div>
                  <div className="bg-zinc-800/80 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Suggestions (show only when just the greeting is present) */}
            {messages.length === 1 && !loading && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    className="text-xs px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-full hover:bg-emerald-500/20 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Sign-in CTA if not authenticated */}
            {!isAuthenticated && (
              <div className="px-4 pb-2">
                <button
                  onClick={() => { setOpen(false); onSignInClick(); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-xl hover:bg-emerald-500/20 transition-all"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign in for full answers
                </button>
              </div>
            )}

            {/* Input */}
            <div className="px-4 pb-4 pt-1">
              <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 rounded-2xl px-4 py-2.5 focus-within:border-emerald-500/50 transition-all">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about GreenLoop..."
                  disabled={loading || streaming}
                  className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none min-w-0 disabled:opacity-50"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading || streaming}
                  className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center hover:bg-emerald-400 transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 text-black animate-spin" /> : <Send className="w-3.5 h-3.5 text-black" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileTap={{ scale: 0.92 }}
        className="relative w-14 h-14 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/30 flex items-center justify-center hover:bg-emerald-400 transition-colors"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-6 h-6 text-black" />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageCircle className="w-6 h-6 text-black" />
            </motion.div>
          )}
        </AnimatePresence>
        {/* Pulse ring */}
        {!open && (
          <span className="absolute inset-0 rounded-full animate-ping bg-emerald-400 opacity-20 pointer-events-none" />
        )}
        {/* Unread indicator */}
        {!open && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-zinc-950" />
        )}
      </motion.button>
    </div>
  );
}
