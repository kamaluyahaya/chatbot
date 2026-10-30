'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Bot, User, Brain, Zap,
  BarChart2, MessageSquare, Settings,
  TrendingUp, Clock, ThumbsUp, Mic,
  PaperclipIcon, RefreshCw, Menu,
  Activity, Search, Download,
  Bell, Shield, Palette, Database, Cpu,
  Star, Hash, Layers, Eye,
  Trash2, Save, Check,
  ArrowUpRight, ArrowDownRight,
  MessageCircle, SlidersHorizontal,
  Volume2, VolumeX, RotateCcw,
  Bookmark, Flag
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────
interface NLPAnalysis {
  intent: string;
  confidence: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  entities: { text: string; type: string }[];
  language: string;
  processingMs: number;
}

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
  nlp?: NLPAnalysis;
}

interface ConversationSession {
  id: string;
  title: string;
  preview: string;
  timestamp: Date;
  messages: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  resolved: boolean;
  intent: string;
}

// ─── Mock NLP Engine ──────────────────────────────────────
const RESPONSE_BANK: Record<string, { response: string; intent: string; entities?: { text: string; type: string }[] }> = {
  account: {
    intent: 'account_inquiry',
    response: "I can help with your account! Your account is currently **active** and in good standing. Your last transaction was processed on October 29, 2026. Would you like to check your balance, recent transactions, or update any account details?",
    entities: [{ text: 'account', type: 'PRODUCT' }]
  },
  balance: {
    intent: 'balance_check',
    response: "Your current account balance is **$12,450.32** (Available: $11,950.32). Your last deposit of $3,200.00 was credited on Oct 28. Is there anything else I can help you with?",
    entities: [{ text: '$12,450.32', type: 'CURRENCY' }, { text: 'Oct 28', type: 'DATE' }]
  },
  loan: {
    intent: 'loan_application',
    response: "Great choice! Our loan products include:\n\n• **Personal Loans** — up to $50,000 at 7.9% APR\n• **Home Loans** — competitive rates from 5.4% APR\n• **Auto Loans** — starting at 6.2% APR\n\nWould you like to start an application or get a pre-approval estimate?",
    entities: [{ text: 'loan', type: 'PRODUCT' }, { text: '$50,000', type: 'CURRENCY' }]
  },
  transfer: {
    intent: 'fund_transfer',
    response: "To transfer funds, I'll need a few details:\n1. **Recipient** account number or name\n2. **Amount** to transfer\n3. **Transfer date** (immediate or scheduled)\n\nAlternatively, you can initiate a transfer through our secure mobile app. Shall I walk you through the process?",
    entities: [{ text: 'transfer', type: 'ACTION' }]
  },
  card: {
    intent: 'card_services',
    response: "For card services, I can help you:\n• **Block/Unblock** your card instantly\n• Check your **credit limit** and available credit\n• View recent **transactions**\n• **Report** a lost or stolen card\n\nWhich option do you need?",
    entities: [{ text: 'card', type: 'PRODUCT' }]
  },
  password: {
    intent: 'security_reset',
    response: "For security reasons, password resets require identity verification. I'll send a **one-time code** to your registered email and phone number. Once verified, you can set a new password. Shall I proceed with sending the verification code?",
    entities: [{ text: 'password', type: 'CREDENTIAL' }]
  },
  complaint: {
    intent: 'complaint_filing',
    response: "I'm sorry to hear you're experiencing issues. Your complaint has been logged with reference **#CMP-2026-8842**. Our team will respond within **24 hours**. You'll receive updates via email. Would you like to add any additional details to your complaint?",
    entities: [{ text: '#CMP-2026-8842', type: 'REFERENCE' }, { text: '24 hours', type: 'DURATION' }]
  },
  payment: {
    intent: 'payment_inquiry',
    response: "I can assist with your payment. Your next **scheduled payment** of $450.00 is due on **November 5, 2026**. You can pay via:\n• Online banking portal\n• Mobile app\n• Auto-pay (recommended)\n\nWould you like to set up automatic payments?",
    entities: [{ text: '$450.00', type: 'CURRENCY' }, { text: 'November 5, 2026', type: 'DATE' }]
  },
  investment: {
    intent: 'investment_inquiry',
    response: "Excellent! Our investment options include:\n\n• **Fixed Deposits** — up to 6.8% annual yield\n• **Mutual Funds** — curated portfolios from 8-14% potential returns\n• **Bonds** — government-backed, low-risk options\n\nWould you like to speak with our investment advisor?",
    entities: [{ text: 'investment', type: 'PRODUCT' }]
  },
  default: {
    intent: 'general_inquiry',
    response: "I understand you need assistance. I'm your intelligent customer support assistant, powered by NLP. I can help with:\n\n• **Account** management\n• **Loan** applications\n• **Fund transfers**\n• **Card** services\n• **Security** concerns\n• Filing **complaints**\n\nWhat would you like help with today?",
    entities: []
  }
};

function analyzeNLP(text: string): { matched: typeof RESPONSE_BANK[string]; analysis: NLPAnalysis } {
  const lower = text.toLowerCase();
  let matched = RESPONSE_BANK.default;

  for (const [key, val] of Object.entries(RESPONSE_BANK)) {
    if (lower.includes(key)) { matched = val; break; }
  }

  const positiveWords = ['thanks', 'great', 'good', 'excellent', 'happy', 'love', 'perfect'];
  const negativeWords = ['bad', 'terrible', 'awful', 'angry', 'frustrated', 'problem', 'issue', 'complaint', 'wrong'];
  const posCount = positiveWords.filter(w => lower.includes(w)).length;
  const negCount = negativeWords.filter(w => lower.includes(w)).length;
  const sentiment = posCount > negCount ? 'positive' : negCount > posCount ? 'negative' : 'neutral';

  return {
    matched,
    analysis: {
      intent: matched.intent,
      confidence: 0.72 + Math.random() * 0.26,
      sentiment,
      entities: matched.entities || [],
      language: 'English',
      processingMs: Math.floor(60 + Math.random() * 80),
    }
  };
}

// ─── Shared Components ────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={`toggle-track ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
      <div className="toggle-thumb" />
    </div>
  );
}

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        {subtitle && <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Typing Indicator ─────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 animate-slide-up">
      <div className="w-8 h-8 rounded-full flex items-center justify-center pulse-ring flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)' }}>
        <Bot size={14} color="white" />
      </div>
      <div className="bubble-bot px-4 py-3 flex items-center gap-2">
        <div className="typing-dot" />
        <div className="typing-dot" />
        <div className="typing-dot" />
      </div>
    </div>
  );
}

// ─── NLP Panel ────────────────────────────────────────────
function NLPPanel({ analysis }: { analysis: NLPAnalysis }) {
  const sentimentMap = {
    positive: { label: 'Positive', cls: 'chip-sentiment-pos' },
    negative: { label: 'Negative', cls: 'chip-sentiment-neg' },
    neutral:  { label: 'Neutral',  cls: 'chip-sentiment-neu' },
  };
  const s = sentimentMap[analysis.sentiment];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass-card p-4 space-y-3"
    >
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#A78BFA' }}>NLP Analysis</p>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Intent</span>
          <span className="nlp-chip chip-intent">{analysis.intent.replace(/_/g, ' ')}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Sentiment</span>
          <span className={`nlp-chip ${s.cls}`}>{s.label}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Language</span>
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{analysis.language}</span>
        </div>
      </div>
      <div>
        <div className="flex justify-between mb-1">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Confidence</span>
          <span className="text-xs font-bold" style={{ color: '#A78BFA' }}>{(analysis.confidence * 100).toFixed(1)}%</span>
        </div>
        <div className="confidence-bar">
          <div className="confidence-fill" style={{ width: `${analysis.confidence * 100}%` }} />
        </div>
      </div>
      {analysis.entities.length > 0 && (
        <div>
          <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Entities</p>
          <div className="flex flex-wrap gap-1">
            {analysis.entities.map((e, i) => (
              <span key={i} className="nlp-chip chip-entity">{e.text} <span style={{ opacity: 0.6 }}>·{e.type}</span></span>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 pt-1" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
        <Zap size={10} style={{ color: '#A78BFA' }} />
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Processed in {analysis.processingMs}ms</span>
      </div>
    </motion.div>
  );
}

// ─── Stat Card ────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, delta, positive = true }: {
  icon: React.ElementType; label: string; value: string; color: string; delta?: string; positive?: boolean;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18`, borderRadius: '10px' }}>
          <Icon size={16} style={{ color }} />
        </div>
        {delta && (
          <span className="text-xs font-semibold flex items-center gap-0.5"
            style={{ color: positive ? '#10B981' : '#F43F5E' }}>
            {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{delta}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}

// ─── Quick Replies ────────────────────────────────────────
const QUICK_REPLIES = [
  "Check my account balance",
  "Apply for a loan",
  "Transfer funds",
  "Block my card",
  "Reset my password",
  "File a complaint",
  "Investment options",
  "Payment schedule",
];

// ─── Sidebar ──────────────────────────────────────────────
function Sidebar({ active, setActive, collapsed, setCollapsed }: {
  active: string; setActive: (s: string) => void;
  collapsed: boolean; setCollapsed: (b: boolean) => void;
}) {
  const navItems = [
    { id: 'chat',      icon: MessageSquare, label: 'Chat',         badge: null },
    { id: 'dashboard', icon: BarChart2,     label: 'Dashboard',    badge: null },
    { id: 'history',   icon: Clock,         label: 'History',      badge: '12' },
    { id: 'insights',  icon: Brain,         label: 'NLP Insights', badge: null },
    { id: 'settings',  icon: Settings,      label: 'Settings',     badge: null },
  ];

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 224 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="glass-card flex flex-col overflow-hidden flex-shrink-0"
      style={{ height: '100%', borderRadius: '20px' }}
    >
      <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 glow-violet"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)' }}>
          <Bot size={18} color="white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
              <p className="text-sm font-bold gradient-text leading-tight whitespace-nowrap">NLP Support</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>AI Assistant</p>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto btn-ghost p-1.5 flex-shrink-0"
          style={{ padding: '6px', borderRadius: '8px' }}
        >
          <Menu size={14} />
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActive(item.id)}
            className={`nav-item w-full relative ${active === item.id ? 'active' : ''}`}
            style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
          >
            <item.icon size={16} />
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 text-left">
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
            {item.badge && !collapsed && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: 'rgba(124,58,237,0.25)', color: '#A78BFA', fontSize: '10px' }}>
                {item.badge}
              </span>
            )}
            {item.badge && collapsed && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: '#7C3AED' }} />
            )}
          </button>
        ))}
      </nav>

      <div className="p-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <div className="status-online flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                System Online
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}

// ─── Chat View ────────────────────────────────────────────
function ChatView() {
  const [messages, setMessages] = useState<Message[]>([{
    id: '0', role: 'bot',
    content: "Hello! 👋 I'm **Aria**, your NLP-powered customer support assistant.\n\nI understand natural language to help you with account inquiries, loans, transfers, card services, investments, and more.\n\nHow can I assist you today?",
    timestamp: new Date(),
    nlp: { intent: 'greeting', confidence: 0.98, sentiment: 'positive', entities: [], language: 'English', processingMs: 42 }
  }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showNLP, setShowNLP] = useState(true);
  const [selectedMsgNLP, setSelectedMsgNLP] = useState<NLPAnalysis | undefined>(messages[0].nlp);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() }]);
    setInput('');
    setIsTyping(true);
    await new Promise(r => setTimeout(r, 900 + Math.random() * 700));
    const { matched, analysis } = analyzeNLP(text);
    const botMsg: Message = { id: (Date.now() + 1).toString(), role: 'bot', content: matched.response, timestamp: new Date(), nlp: analysis };
    setMessages(prev => [...prev, botMsg]);
    setIsTyping(false);
    setSelectedMsgNLP(analysis);
  }, [isTyping]);

  const formatContent = (text: string) =>
    text.split('\n').map((line, i) => (
      <p key={i} style={{ marginBottom: '4px' }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
    ));

  const avgConf = messages.filter(m => m.nlp).reduce((a, m) => a + (m.nlp?.confidence || 0), 0) / Math.max(messages.filter(m => m.nlp).length, 1);

  return (
    <div className="flex gap-4 h-full">
      <div className="flex flex-col flex-1 glass-card overflow-hidden" style={{ borderRadius: '20px' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full flex items-center justify-center pulse-ring"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)' }}>
                <Bot size={18} color="white" />
              </div>
              <div className="status-online absolute -bottom-0.5 -right-0.5"
                style={{ width: '10px', height: '10px', border: '2px solid var(--bg-card)' }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Aria — NLP Assistant</p>
              <p className="text-xs" style={{ color: '#10B981' }}>Online · NLP Engine Active</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNLP(!showNLP)} className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5">
              <Brain size={12} />{showNLP ? 'Hide' : 'Show'} NLP
            </button>
            <button onClick={() => { setMessages([messages[0]]); setSelectedMsgNLP(messages[0].nlp); }} className="btn-ghost p-2">
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`flex items-end gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'bot' ? 'pulse-ring' : ''}`}
                  style={{ background: msg.role === 'bot' ? 'linear-gradient(135deg,#7C3AED,#4F46E5)' : 'linear-gradient(135deg,#06B6D4,#0891B2)' }}>
                  {msg.role === 'bot' ? <Bot size={14} color="white" /> : <User size={14} color="white" />}
                </div>
                <div className={`max-w-[75%] px-4 py-3 text-sm cursor-pointer ${msg.role === 'user' ? 'bubble-user' : 'bubble-bot'}`}
                  style={{ color: 'var(--text-primary)', lineHeight: 1.6 }}
                  onClick={() => msg.nlp && setSelectedMsgNLP(msg.nlp)}>
                  {formatContent(msg.content)}
                  <p className="text-xs mt-2 opacity-50">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.nlp && <span className="ml-2">· {msg.nlp.processingMs}ms</span>}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        <div className="px-5 flex gap-2 overflow-x-auto" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', paddingBottom: '10px' }}>
          {QUICK_REPLIES.map((q, i) => (
            <button key={i} onClick={() => sendMessage(q)} className="btn-ghost text-xs whitespace-nowrap px-3 py-1.5"
              style={{ fontSize: '12px', borderRadius: '8px' }}>{q}</button>
          ))}
        </div>

        <div className="p-4 flex gap-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button className="btn-ghost p-3 flex-shrink-0" style={{ borderRadius: '12px' }}><PaperclipIcon size={16} /></button>
          <input className="chat-input flex-1" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder="Type your message… (Enter to send)" />
          <button className="btn-ghost p-3 flex-shrink-0" style={{ borderRadius: '12px' }}><Mic size={16} /></button>
          <button className="btn-primary p-3 flex-shrink-0" onClick={() => sendMessage(input)}
            style={{ borderRadius: '12px', padding: '12px', opacity: isTyping ? 0.6 : 1 }}>
            <Send size={16} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showNLP && (
          <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 264 }} exit={{ opacity: 0, width: 0 }}
            className="flex-shrink-0 space-y-4 overflow-hidden" style={{ width: 264 }}>
            {selectedMsgNLP && <NLPPanel analysis={selectedMsgNLP} />}
            <div className="glass-card p-4">
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#06B6D4' }}>Model Info</p>
              {[{ label: 'Model', value: 'BERT-base' }, { label: 'Version', value: 'v2.4.1' },
                { label: 'Vocab', value: '30,522 tokens' }, { label: 'Latency', value: '~72ms avg' }].map((item, i) => (
                <div key={i} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{item.value}</span>
                </div>
              ))}
            </div>
            <div className="glass-card p-4">
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#F59E0B' }}>Session Stats</p>
              {[{ label: 'Messages', value: messages.length },
                { label: 'Avg Confidence', value: `${(avgConf * 100).toFixed(1)}%` },
                { label: 'Bot Responses', value: messages.filter(m => m.role === 'bot').length }].map((item, i) => (
                <div key={i} className="flex justify-between py-1.5">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                  <span className="text-xs font-bold" style={{ color: '#A78BFA' }}>{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Dashboard View ───────────────────────────────────────
function DashboardView() {
  const stats = [
    { icon: MessageSquare, label: 'Total Conversations', value: '24,831', color: '#7C3AED', delta: '12.4%', positive: true },
    { icon: ThumbsUp,      label: 'Resolution Rate',     value: '94.2%',  color: '#10B981', delta: '3.1%',  positive: true },
    { icon: Clock,         label: 'Avg Response Time',   value: '1.4s',   color: '#06B6D4', delta: '0.3s',  positive: true },
    { icon: TrendingUp,    label: 'CSAT Score',          value: '4.8/5',  color: '#F59E0B', delta: '0.2',   positive: true },
  ];
  const intents = [
    { name: 'Account Inquiry',  count: 8420, pct: 72, color: '#7C3AED' },
    { name: 'Loan Application', count: 3210, pct: 55, color: '#4F46E5' },
    { name: 'Fund Transfer',    count: 2890, pct: 49, color: '#06B6D4' },
    { name: 'Card Services',    count: 2140, pct: 36, color: '#10B981' },
    { name: 'Complaints',       count:  890, pct: 15, color: '#F43F5E' },
  ];
  const recentActivity = [
    { time: '2m ago',  intent: 'balance_check',    confidence: 97.2, sentiment: 'neutral',  resolved: true  },
    { time: '5m ago',  intent: 'loan_application', confidence: 91.4, sentiment: 'positive', resolved: true  },
    { time: '11m ago', intent: 'complaint_filing', confidence: 88.7, sentiment: 'negative', resolved: false },
    { time: '18m ago', intent: 'fund_transfer',    confidence: 95.1, sentiment: 'neutral',  resolved: true  },
    { time: '24m ago', intent: 'card_services',    confidence: 93.6, sentiment: 'positive', resolved: true  },
  ];

  return (
    <div className="space-y-6 animate-slide-up">
      <SectionHeader title="Dashboard" subtitle="Real-time NLP performance metrics"
        action={
          <div className="flex items-center gap-2">
            <span className="nlp-chip chip-intent">Last 30 days</span>
            <button className="btn-ghost p-2" style={{ borderRadius: '10px' }}><Download size={14} /></button>
          </div>
        } />

      <div className="grid grid-cols-2 gap-4">
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Top Intents</h3>
            <span className="nlp-chip chip-intent">30 days</span>
          </div>
          <div className="space-y-4">
            {intents.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                  <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{item.count.toLocaleString()}</span>
                </div>
                <div className="confidence-bar">
                  <motion.div style={{ height: '100%', background: `linear-gradient(90deg,${item.color},${item.color}99)`, borderRadius: '2px' }}
                    initial={{ width: 0 }} animate={{ width: `${item.pct}%` }} transition={{ delay: i * 0.1, duration: 0.9 }} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Sentiment Distribution</h3>
          <div className="flex gap-3 mb-5">
            {[{ label: 'Positive', pct: 68, cls: 'chip-sentiment-pos', color: '#10B981' },
              { label: 'Neutral',  pct: 22, cls: 'chip-sentiment-neu', color: '#F59E0B' },
              { label: 'Negative', pct: 10, cls: 'chip-sentiment-neg', color: '#F43F5E' }].map((item, i) => (
              <div key={i} className="flex-1 text-center">
                <motion.p className="text-2xl font-bold mb-1" style={{ color: item.color }}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>{item.pct}%</motion.p>
                <span className={`nlp-chip ${item.cls}`}>{item.label}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {[{ label: 'Positive', pct: 68, color: '#10B981' },
              { label: 'Neutral',  pct: 22, color: '#F59E0B' },
              { label: 'Negative', pct: 10, color: '#F43F5E' }].map((item, i) => (
              <div key={i}>
                <div className="confidence-bar">
                  <motion.div className="confidence-fill" initial={{ width: 0 }}
                    animate={{ width: `${item.pct}%` }} transition={{ delay: 0.3 + i * 0.1, duration: 0.9 }}
                    style={{ background: `linear-gradient(90deg,${item.color},${item.color}88)` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Recent Conversations</h3>
          <button className="btn-ghost text-xs px-3 py-1.5">View All</button>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Time</th><th>Intent</th><th>Confidence</th><th>Sentiment</th><th>Status</th></tr>
          </thead>
          <tbody>
            {recentActivity.map((row, i) => (
              <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.07 }}>
                <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{row.time}</td>
                <td><span className="nlp-chip chip-intent">{row.intent.replace(/_/g, ' ')}</span></td>
                <td><span className="text-xs font-bold" style={{ color: row.confidence > 90 ? '#10B981' : '#F59E0B' }}>{row.confidence}%</span></td>
                <td><span className={`nlp-chip ${row.sentiment === 'positive' ? 'chip-sentiment-pos' : row.sentiment === 'negative' ? 'chip-sentiment-neg' : 'chip-sentiment-neu'}`}>{row.sentiment}</span></td>
                <td><span className={`nlp-chip ${row.resolved ? 'chip-emerald' : 'chip-rose'}`}>{row.resolved ? '✓ Resolved' : '⚠ Pending'}</span></td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── History View ─────────────────────────────────────────
const MOCK_SESSIONS: ConversationSession[] = [
  { id: '1', title: 'Account Balance Inquiry',       preview: 'Checked current balance of $12,450.32 and recent transactions.',        timestamp: new Date(Date.now()-1000*60*5),    messages: 6,  sentiment: 'neutral',  resolved: true,  intent: 'balance_check'     },
  { id: '2', title: 'Personal Loan Application',     preview: 'Discussed loan options — interested in $25,000 personal loan at 7.9%.', timestamp: new Date(Date.now()-1000*60*42),   messages: 14, sentiment: 'positive', resolved: true,  intent: 'loan_application'  },
  { id: '3', title: 'Card Blocking Request',         preview: 'User reported lost card. Card blocked instantly. New card ordered.',     timestamp: new Date(Date.now()-1000*60*128),  messages: 9,  sentiment: 'negative', resolved: true,  intent: 'card_services'     },
  { id: '4', title: 'Fund Transfer Assistance',      preview: 'Guided user through transferring $3,000 to external account.',          timestamp: new Date(Date.now()-1000*3600*3),  messages: 11, sentiment: 'positive', resolved: true,  intent: 'fund_transfer'     },
  { id: '5', title: 'Complaint — Transaction Error', preview: 'User reported duplicate charge of $89.99. Case escalated to team.',     timestamp: new Date(Date.now()-1000*3600*8),  messages: 18, sentiment: 'negative', resolved: false, intent: 'complaint_filing'  },
  { id: '6', title: 'Investment Consultation',       preview: 'Explored mutual fund and fixed deposit options for $10,000 surplus.',   timestamp: new Date(Date.now()-1000*3600*24), messages: 22, sentiment: 'positive', resolved: true,  intent: 'investment_inquiry' },
  { id: '7', title: 'Password Reset Support',        preview: 'Verified identity via OTP. Password reset successfully completed.',     timestamp: new Date(Date.now()-1000*3600*36), messages: 7,  sentiment: 'neutral',  resolved: true,  intent: 'security_reset'    },
  { id: '8', title: 'Payment Schedule Query',        preview: 'Explained upcoming EMI schedule and set up auto-pay for November.',     timestamp: new Date(Date.now()-1000*3600*48), messages: 8,  sentiment: 'positive', resolved: true,  intent: 'payment_inquiry'   },
];

function HistoryView() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all'|'resolved'|'pending'>('all');
  const [selected, setSelected] = useState<ConversationSession | null>(MOCK_SESSIONS[0]);

  const filtered = MOCK_SESSIONS.filter(s => {
    const matchSearch = s.title.toLowerCase().includes(search.toLowerCase()) || s.preview.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' ? true : filter === 'resolved' ? s.resolved : !s.resolved;
    return matchSearch && matchFilter;
  });

  const formatTime = (d: Date) => {
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
    return d.toLocaleDateString();
  };

  const sentimentIcon = (s: string) => s === 'positive' ? '😊' : s === 'negative' ? '😟' : '😐';

  const fakeMessages = selected ? [
    { role: 'user', content: selected.title, time: '10:01 AM' },
    { role: 'bot',  content: selected.preview, time: '10:01 AM' },
    { role: 'user', content: 'Can you provide more details?', time: '10:03 AM' },
    { role: 'bot',  content: `Thank you for reaching out. The ${selected.intent.replace(/_/g,' ')} request has been processed successfully. Is there anything else I can help you with?`, time: '10:03 AM' },
  ] : [];

  return (
    <div className="flex gap-4 h-full animate-slide-up">
      <div className="glass-card flex flex-col" style={{ width: '340px', flexShrink: 0, borderRadius: '20px', overflow: 'hidden' }}>
        <div className="p-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="text-base font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Conversation History</h2>
          <div className="relative mb-3">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input className="form-input" style={{ paddingLeft: '32px', fontSize: '13px' }}
              placeholder="Search conversations…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {(['all','resolved','pending'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="text-xs px-3 py-1.5 rounded-full font-semibold transition-all capitalize"
                style={{ background: filter===f ? 'rgba(124,58,237,0.2)' : 'transparent', color: filter===f ? '#A78BFA' : 'var(--text-muted)', border: `1px solid ${filter===f ? 'rgba(124,58,237,0.4)' : 'transparent'}` }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {filtered.map(session => (
            <div key={session.id} className={`history-item ${selected?.id===session.id ? 'selected' : ''}`} onClick={() => setSelected(session)}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{session.title}</p>
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{formatTime(session.timestamp)}</span>
              </div>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {session.preview}
              </p>
              <div className="flex items-center gap-2">
                <span className="nlp-chip chip-intent" style={{ fontSize: '10px', padding: '2px 7px' }}>{session.intent.replace(/_/g,' ')}</span>
                <span className={`nlp-chip ${session.resolved ? 'chip-emerald' : 'chip-rose'}`} style={{ fontSize: '10px', padding: '2px 7px' }}>{session.resolved ? '✓ Resolved' : '⚠ Pending'}</span>
                <span className="ml-auto text-base">{sentimentIcon(session.sentiment)}</span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <MessageCircle size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No conversations found</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 glass-card flex flex-col overflow-hidden" style={{ borderRadius: '20px' }}>
        {selected ? (
          <>
            <div className="px-5 py-4 flex items-start justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{selected.title}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{selected.timestamp.toLocaleString([],{dateStyle:'medium',timeStyle:'short'})}</span>
                  <span className="nlp-chip chip-intent" style={{ fontSize: '10px', padding: '2px 7px' }}>{selected.intent.replace(/_/g,' ')}</span>
                  <span className={`nlp-chip ${selected.sentiment==='positive'?'chip-sentiment-pos':selected.sentiment==='negative'?'chip-sentiment-neg':'chip-sentiment-neu'}`} style={{ fontSize: '10px', padding: '2px 7px' }}>{selected.sentiment}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn-ghost p-2"><Bookmark size={14} /></button>
                <button className="btn-danger p-2"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="flex" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {[{ label: 'Messages', value: selected.messages }, { label: 'Duration', value: `~${Math.floor(selected.messages*0.7)}m` }, { label: 'Status', value: selected.resolved?'Resolved':'Pending' }].map((item,i) => (
                <div key={i} className="flex-1 px-5 py-3" style={{ borderRight: i<2?'1px solid var(--border-subtle)':'none' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                  <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
                </div>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <p className="section-label">Transcript</p>
              {fakeMessages.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.06 }}
                  className={`flex items-end gap-3 ${msg.role==='user'?'flex-row-reverse':''}`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: msg.role==='bot'?'linear-gradient(135deg,#7C3AED,#4F46E5)':'linear-gradient(135deg,#06B6D4,#0891B2)' }}>
                    {msg.role==='bot' ? <Bot size={13} color="white" /> : <User size={13} color="white" />}
                  </div>
                  <div className={`max-w-[70%] px-4 py-3 text-sm ${msg.role==='user'?'bubble-user':'bubble-bot'}`}
                    style={{ color: 'var(--text-primary)', lineHeight: 1.6 }}>
                    <p>{msg.content}</p>
                    <p className="text-xs mt-1 opacity-40">{msg.time}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Clock size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
              <p style={{ color: 'var(--text-muted)' }}>Select a conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── NLP Insights View ────────────────────────────────────
function InsightsView() {
  const [activeTab, setActiveTab] = useState<'overview'|'entities'|'models'>('overview');

  const intentData = [
    { name: 'Account Inquiry',   count: 8420, trend: '+8%',  color: '#7C3AED' },
    { name: 'Loan Application',  count: 3210, trend: '+22%', color: '#4F46E5' },
    { name: 'Fund Transfer',     count: 2890, trend: '+5%',  color: '#06B6D4' },
    { name: 'Card Services',     count: 2140, trend: '-3%',  color: '#10B981' },
    { name: 'Complaint Filing',  count:  890, trend: '+12%', color: '#F43F5E' },
    { name: 'Security Reset',    count:  640, trend: '-1%',  color: '#F59E0B' },
    { name: 'Payment Inquiry',   count:  520, trend: '+7%',  color: '#8B5CF6' },
    { name: 'Investment Query',  count:  310, trend: '+31%', color: '#EC4899' },
  ];

  const entityTypes = [
    { type: 'CURRENCY',  count: 5820, pct: 80, color: '#10B981' },
    { type: 'DATE',      count: 4200, pct: 58, color: '#06B6D4' },
    { type: 'PRODUCT',   count: 3900, pct: 54, color: '#7C3AED' },
    { type: 'REFERENCE', count: 2100, pct: 29, color: '#F59E0B' },
    { type: 'ACTION',    count: 1800, pct: 25, color: '#F43F5E' },
    { type: 'CREDENTIAL',count:  640, pct: 9,  color: '#8B5CF6' },
  ];

  const wordCloud = [
    { text: 'balance',    size: 24, color: '#A78BFA' }, { text: 'account',   size: 22, color: '#67E8F9' },
    { text: 'loan',       size: 20, color: '#6EE7B7' }, { text: 'transfer',  size: 18, color: '#FCD34D' },
    { text: 'card',       size: 18, color: '#FDA4AF' }, { text: 'payment',   size: 16, color: '#A5B4FC' },
    { text: 'investment', size: 15, color: '#86EFAC' }, { text: 'password',  size: 14, color: '#FDE68A' },
    { text: 'complaint',  size: 13, color: '#F9A8D4' }, { text: 'interest',  size: 13, color: '#93C5FD' },
    { text: 'limit',      size: 12, color: '#A78BFA' }, { text: 'deposit',   size: 12, color: '#67E8F9' },
    { text: 'credit',     size: 11, color: '#6EE7B7' }, { text: 'statement', size: 11, color: '#FCD34D' },
    { text: 'debit',      size: 10, color: '#FDA4AF' }, { text: 'block',     size: 10, color: '#A5B4FC' },
    { text: 'verify',     size: 10, color: '#86EFAC' }, { text: 'reset',     size: 9,  color: '#FDE68A' },
  ];

  const modelMetrics = [
    { label: 'Precision', value: 94.8, color: '#7C3AED' },
    { label: 'Recall',    value: 91.2, color: '#06B6D4' },
    { label: 'F1 Score',  value: 92.9, color: '#10B981' },
    { label: 'Accuracy',  value: 96.1, color: '#F59E0B' },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview',      icon: BarChart2 },
    { id: 'entities', label: 'Entities',      icon: Hash      },
    { id: 'models',   label: 'Model Metrics', icon: Cpu       },
  ] as const;

  return (
    <div className="space-y-6 animate-slide-up">
      <SectionHeader title="NLP Insights" subtitle="Deep analytics on language model performance"
        action={
          <div className="flex gap-2">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold transition-all"
                style={{ background: activeTab===tab.id?'rgba(124,58,237,0.2)':'transparent', color: activeTab===tab.id?'#A78BFA':'var(--text-muted)', border: `1px solid ${activeTab===tab.id?'rgba(124,58,237,0.4)':'var(--border-subtle)'}` }}>
                <tab.icon size={11} />{tab.label}
              </button>
            ))}
          </div>
        } />

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="glass-card p-5">
              <h3 className="text-sm font-bold mb-5" style={{ color: 'var(--text-primary)' }}>Intent Classification Breakdown</h3>
              <div className="space-y-3">
                {intentData.map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i*0.06 }}>
                    <div className="flex justify-between mb-1.5 items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{item.count.toLocaleString()}</span>
                        <span className="text-xs font-bold" style={{ color: item.trend.startsWith('+') ? '#10B981' : '#F43F5E' }}>{item.trend}</span>
                      </div>
                    </div>
                    <div className="confidence-bar">
                      <motion.div style={{ height: '100%', background: `linear-gradient(90deg,${item.color},${item.color}66)`, borderRadius: '2px' }}
                        initial={{ width: 0 }} animate={{ width: `${(item.count/8420)*100}%` }} transition={{ delay: i*0.07, duration: 0.9 }} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="glass-card p-5">
              <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Keyword Frequency Cloud</h3>
              <div className="flex flex-wrap gap-2 items-center justify-center py-4" style={{ minHeight: '120px' }}>
                {wordCloud.map((w, i) => (
                  <motion.span key={i} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i*0.04 }}
                    className="word-cloud-tag"
                    style={{ fontSize: `${w.size*0.6+8}px`, color: w.color, background: `${w.color}15`, border: `1px solid ${w.color}30` }}>
                    {w.text}
                  </motion.span>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'entities' && (
          <motion.div key="entities" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="glass-card p-5">
              <h3 className="text-sm font-bold mb-5" style={{ color: 'var(--text-primary)' }}>Named Entity Recognition — Type Distribution</h3>
              <div className="space-y-4">
                {entityTypes.map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i*0.08 }}>
                    <div className="flex justify-between mb-1.5">
                      <span className="nlp-chip" style={{ fontSize: '10px', padding: '1px 8px', borderColor: item.color, color: item.color, background: `${item.color}15`, border: `1px solid ${item.color}40` }}>{item.type}</span>
                      <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{item.count.toLocaleString()} mentions</span>
                    </div>
                    <div className="confidence-bar" style={{ height: '6px' }}>
                      <motion.div style={{ height: '100%', background: `linear-gradient(90deg,${item.color},${item.color}66)`, borderRadius: '3px' }}
                        initial={{ width: 0 }} animate={{ width: `${item.pct}%` }} transition={{ delay: i*0.09, duration: 1 }} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[{ label: 'Total Entities Extracted', value: '18,510', icon: Hash,     color: '#7C3AED' },
                { label: 'Unique Entity Types',      value: '6',      icon: Layers,   color: '#06B6D4' },
                { label: 'Avg per Conversation',     value: '2.4',    icon: Activity, color: '#10B981' }].map((item, i) => (
                <StatCard key={i} {...item} />
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'models' && (
          <motion.div key="models" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="glass-card p-6">
              <h3 className="text-sm font-bold mb-6" style={{ color: 'var(--text-primary)' }}>Model Performance Metrics</h3>
              <div className="grid grid-cols-4 gap-4">
                {modelMetrics.map((metric, i) => {
                  const r = 36, circ = 2*Math.PI*r, offset = circ - (metric.value/100)*circ;
                  return (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i*0.1 }} className="text-center">
                      <svg width="96" height="96" className="mx-auto mb-3">
                        <circle cx="48" cy="48" r={r} fill="none" stroke={`${metric.color}20`} strokeWidth="7" />
                        <motion.circle cx="48" cy="48" r={r} fill="none" stroke={metric.color} strokeWidth="7"
                          strokeDasharray={circ} strokeLinecap="round" transform="rotate(-90 48 48)"
                          initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: offset }}
                          transition={{ delay: 0.3+i*0.1, duration: 1.2, ease: 'easeOut' }}
                          style={{ strokeDashoffset: offset }} />
                        <text x="48" y="53" textAnchor="middle" fill={metric.color} fontSize="15" fontWeight="700">{metric.value}%</text>
                      </svg>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{metric.label}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
            <div className="glass-card p-5">
              <h3 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Model Configuration</h3>
              <table className="data-table">
                <thead><tr><th>Parameter</th><th>Value</th><th>Status</th></tr></thead>
                <tbody>
                  {[{ param: 'Base Architecture', value: 'BERT-base-uncased',   status: 'Active'   },
                    { param: 'Hidden Size',        value: '768',                 status: 'Active'   },
                    { param: 'Attention Heads',    value: '12',                  status: 'Active'   },
                    { param: 'Encoder Layers',     value: '12',                  status: 'Active'   },
                    { param: 'Vocabulary Size',    value: '30,522 tokens',       status: 'Active'   },
                    { param: 'Max Sequence Len',   value: '512 tokens',          status: 'Active'   },
                    { param: 'Training Dataset',   value: 'Banking77 + Custom',  status: 'Updated'  },
                    { param: 'Fine-tuning Epochs', value: '8',                   status: 'Active'   }].map((row, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{row.param}</td>
                      <td><code style={{ color: '#A78BFA', fontSize: '12px' }}>{row.value}</code></td>
                      <td><span className={`nlp-chip ${row.status==='Updated'?'chip-amber':'chip-emerald'}`} style={{ fontSize: '10px', padding: '2px 7px' }}>{row.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Settings View ────────────────────────────────────────
function SettingsView() {
  const [activeSection, setActiveSection] = useState('general');
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    botName: 'Aria', language: 'en', timezone: 'UTC+1',
    confidenceThreshold: 75, autoSuggest: true, multiLanguage: false, entityHighlight: true,
    emailAlerts: true, slackAlerts: false, escalationAlert: true, dailyReport: true,
    showNLPPanel: true, animationsEnabled: true, compactMode: false, soundEnabled: false,
    sessionTimeout: '30', twoFactor: true, auditLog: true,
  });

  const update = (key: string, val: unknown) => setSettings(p => ({ ...p, [key]: val }));
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const sections = [
    { id: 'general',       label: 'General',       icon: Settings  },
    { id: 'nlp',           label: 'NLP Engine',    icon: Brain     },
    { id: 'notifications', label: 'Notifications', icon: Bell      },
    { id: 'appearance',    label: 'Appearance',    icon: Palette   },
    { id: 'security',      label: 'Security',      icon: Shield    },
    { id: 'advanced',      label: 'Advanced',      icon: Cpu       },
  ];

  return (
    <div className="flex gap-4 h-full animate-slide-up">
      <div className="glass-card flex flex-col p-3 gap-1" style={{ width: '200px', flexShrink: 0, borderRadius: '20px' }}>
        <p className="section-label px-2 pt-1">Settings</p>
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`nav-item w-full ${activeSection===s.id?'active':''}`}>
            <s.icon size={15} /><span>{s.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 glass-card flex flex-col overflow-hidden" style={{ borderRadius: '20px' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{sections.find(s=>s.id===activeSection)?.label}</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Manage your {activeSection} preferences</p>
          </div>
          <button onClick={handleSave} className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all ${saved?'btn-success':'btn-primary'}`}>
            {saved ? <><Check size={14} /> Saved!</> : <><Save size={14} /> Save Changes</>}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {activeSection === 'general' && (
              <motion.div key="general" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="glass-card-sm p-5">
                  <p className="section-label">Bot Identity</p>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Bot Name</label>
                      <input className="form-input" value={settings.botName} onChange={e => update('botName', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Default Language</label>
                      <select className="form-select" value={settings.language} onChange={e => update('language', e.target.value)}>
                        <option value="en">English</option>
                        <option value="ar">Arabic</option>
                        <option value="fr">French</option>
                        <option value="es">Spanish</option>
                        <option value="de">German</option>
                        <option value="zh">Chinese (Simplified)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Timezone</label>
                      <select className="form-select" value={settings.timezone} onChange={e => update('timezone', e.target.value)}>
                        <option value="UTC+0">UTC+0 — London</option>
                        <option value="UTC+1">UTC+1 — Berlin / Lagos</option>
                        <option value="UTC+3">UTC+3 — Riyadh / Moscow</option>
                        <option value="UTC+5:30">UTC+5:30 — New Delhi</option>
                        <option value="UTC-5">UTC-5 — New York</option>
                        <option value="UTC-8">UTC-8 — Los Angeles</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="glass-card-sm p-5">
                  <p className="section-label">Operations</p>
                  <div className="settings-row">
                    <div><p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>24/7 AI Support</p><p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Bot responds at all times</p></div>
                    <Toggle on={true} onChange={() => {}} />
                  </div>
                  <div className="settings-row">
                    <div><p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Human Handoff</p><p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Route complex cases to live agents</p></div>
                    <Toggle on={true} onChange={() => {}} />
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'nlp' && (
              <motion.div key="nlp" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="glass-card-sm p-5">
                  <p className="section-label">Inference Settings</p>
                  <div className="settings-row">
                    <div><p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Auto-suggest Replies</p><p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Show quick-reply suggestions</p></div>
                    <Toggle on={settings.autoSuggest} onChange={v => update('autoSuggest', v)} />
                  </div>
                  <div className="settings-row">
                    <div><p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Multi-Language Detection</p><p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Automatically detect user language</p></div>
                    <Toggle on={settings.multiLanguage} onChange={v => update('multiLanguage', v)} />
                  </div>
                  <div className="settings-row">
                    <div><p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Entity Highlighting</p><p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Highlight detected entities in NLP panel</p></div>
                    <Toggle on={settings.entityHighlight} onChange={v => update('entityHighlight', v)} />
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between mb-2">
                      <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Confidence Threshold</label>
                      <span className="text-sm font-bold" style={{ color: '#A78BFA' }}>{settings.confidenceThreshold}%</span>
                    </div>
                    <input type="range" min={50} max={99} value={settings.confidenceThreshold}
                      onChange={e => update('confidenceThreshold', Number(e.target.value))}
                      style={{ width: '100%', accentColor: 'var(--brand-violet)' }} />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>50% — Permissive</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>99% — Strict</span>
                    </div>
                  </div>
                </div>
                <div className="glass-card-sm p-5">
                  <p className="section-label">Active NLP Model</p>
                  <div className="space-y-2">
                    {[{ id: 'bert', name: 'BERT-base-uncased', desc: 'Balanced accuracy & speed', active: true },
                      { id: 'roberta', name: 'RoBERTa-large', desc: 'Higher accuracy, slower', active: false },
                      { id: 'distil', name: 'DistilBERT', desc: 'Faster, lighter model', active: false }].map(model => (
                      <div key={model.id} className="flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer"
                        style={{ background: model.active?'rgba(124,58,237,0.12)':'transparent', border: `1px solid ${model.active?'rgba(124,58,237,0.3)':'var(--border-subtle)'}` }}>
                        <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ border: `2px solid ${model.active?'#7C3AED':'var(--text-muted)'}` }}>
                          {model.active && <div className="w-2 h-2 rounded-full" style={{ background: '#7C3AED' }} />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{model.name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{model.desc}</p>
                        </div>
                        {model.active && <span className="nlp-chip chip-emerald" style={{ fontSize: '10px', padding: '2px 7px' }}>Active</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'notifications' && (
              <motion.div key="notifications" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="glass-card-sm p-5">
                  <p className="section-label">Alert Channels</p>
                  <div className="settings-row">
                    <div><p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Email Alerts</p><p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Receive alerts at admin@example.com</p></div>
                    <Toggle on={settings.emailAlerts} onChange={v => update('emailAlerts', v)} />
                  </div>
                  <div className="settings-row">
                    <div><p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Slack Notifications</p><p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Post to #support-channel</p></div>
                    <Toggle on={settings.slackAlerts} onChange={v => update('slackAlerts', v)} />
                  </div>
                  <div className="settings-row">
                    <div><p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Escalation Alerts</p><p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Alert when bot can't resolve issue</p></div>
                    <Toggle on={settings.escalationAlert} onChange={v => update('escalationAlert', v)} />
                  </div>
                  <div className="settings-row">
                    <div><p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Daily Performance Report</p><p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Summary email every morning at 8 AM</p></div>
                    <Toggle on={settings.dailyReport} onChange={v => update('dailyReport', v)} />
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'appearance' && (
              <motion.div key="appearance" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="glass-card-sm p-5">
                  <p className="section-label">UI Preferences</p>
                  <div className="settings-row">
                    <div><p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Show NLP Side Panel</p><p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Display real-time NLP analysis</p></div>
                    <Toggle on={settings.showNLPPanel} onChange={v => update('showNLPPanel', v)} />
                  </div>
                  <div className="settings-row">
                    <div><p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Animations</p><p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Enable motion and transitions</p></div>
                    <Toggle on={settings.animationsEnabled} onChange={v => update('animationsEnabled', v)} />
                  </div>
                  <div className="settings-row">
                    <div><p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Compact Mode</p><p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Reduce spacing for denser view</p></div>
                    <Toggle on={settings.compactMode} onChange={v => update('compactMode', v)} />
                  </div>
                  <div className="settings-row">
                    <div><p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Sound Effects</p><p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Play sound on new message</p></div>
                    <div className="flex items-center gap-2">
                      {settings.soundEnabled ? <Volume2 size={14} style={{ color: '#A78BFA' }} /> : <VolumeX size={14} style={{ color: 'var(--text-muted)' }} />}
                      <Toggle on={settings.soundEnabled} onChange={v => update('soundEnabled', v)} />
                    </div>
                  </div>
                </div>
                <div className="glass-card-sm p-5">
                  <p className="section-label">Color Theme</p>
                  <div className="flex gap-3 mt-2">
                    {[{ name: 'Violet', from: '#7C3AED', to: '#4F46E5', active: true },
                      { name: 'Cyan',   from: '#06B6D4', to: '#0891B2', active: false },
                      { name: 'Emerald',from: '#10B981', to: '#059669', active: false },
                      { name: 'Rose',   from: '#F43F5E', to: '#E11D48', active: false },
                      { name: 'Amber',  from: '#F59E0B', to: '#D97706', active: false }].map(theme => (
                      <div key={theme.name} className="flex flex-col items-center gap-2 cursor-pointer group">
                        <div className="w-10 h-10 rounded-xl transition-transform group-hover:scale-110"
                          style={{ background: `linear-gradient(135deg,${theme.from},${theme.to})`, boxShadow: theme.active?`0 0 16px ${theme.from}60`:'none', border: theme.active?`2px solid ${theme.from}`:'2px solid transparent' }} />
                        <span className="text-xs" style={{ color: theme.active?'#A78BFA':'var(--text-muted)' }}>{theme.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'security' && (
              <motion.div key="security" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="glass-card-sm p-5">
                  <p className="section-label">Access Control</p>
                  <div className="settings-row">
                    <div><p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Two-Factor Authentication</p><p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Require 2FA for admin access</p></div>
                    <Toggle on={settings.twoFactor} onChange={v => update('twoFactor', v)} />
                  </div>
                  <div className="settings-row">
                    <div><p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Audit Log</p><p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Record all admin actions</p></div>
                    <Toggle on={settings.auditLog} onChange={v => update('auditLog', v)} />
                  </div>
                  <div className="settings-row">
                    <div><p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Session Timeout</p><p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Auto-logout after inactivity</p></div>
                    <select className="form-select" style={{ width: 'auto' }} value={settings.sessionTimeout} onChange={e => update('sessionTimeout', e.target.value)}>
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="60">1 hour</option>
                      <option value="120">2 hours</option>
                      <option value="0">Never</option>
                    </select>
                  </div>
                </div>
                <div className="glass-card-sm p-5">
                  <p className="section-label">Data & Privacy</p>
                  <div className="settings-row">
                    <div><p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Conversation Retention</p><p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>How long to keep chat history</p></div>
                    <select className="form-select" style={{ width: 'auto' }}><option>30 days</option><option>90 days</option><option>1 year</option><option>Forever</option></select>
                  </div>
                  <div className="settings-row">
                    <div><p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>PII Masking</p><p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Redact sensitive data in logs</p></div>
                    <Toggle on={true} onChange={() => {}} />
                  </div>
                  <div className="mt-4 pt-2">
                    <button className="btn-danger flex items-center gap-2 text-sm"><Trash2 size={13} /> Delete All Conversation Data</button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'advanced' && (
              <motion.div key="advanced" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="glass-card-sm p-5">
                  <p className="section-label">API Configuration</p>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>API Endpoint</label>
                      <input className="form-input font-mono text-xs" defaultValue="https://api.nlp-support.local/v2" readOnly />
                    </div>
                    <div>
                      <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>API Key</label>
                      <div className="relative">
                        <input className="form-input font-mono text-xs pr-12" defaultValue="sk-••••••••••••••••••••••••" readOnly />
                        <button className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}><Eye size={14} /></button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Webhook URL</label>
                      <input className="form-input font-mono text-xs" placeholder="https://your-webhook-endpoint.com/nlp" />
                    </div>
                  </div>
                </div>
                <div className="glass-card-sm p-5">
                  <p className="section-label">System Actions</p>
                  <div className="flex flex-wrap gap-3">
                    <button className="btn-ghost flex items-center gap-2 text-sm"><RotateCcw size={13} /> Restart NLP Engine</button>
                    <button className="btn-ghost flex items-center gap-2 text-sm"><Download size={13} /> Export Logs</button>
                    <button className="btn-ghost flex items-center gap-2 text-sm"><Database size={13} /> Backup Data</button>
                    <button className="btn-danger flex items-center gap-2 text-sm"><RotateCcw size={13} /> Reset to Defaults</button>
                  </div>
                </div>
                <div className="glass-card-sm p-5">
                  <p className="section-label">System Info</p>
                  {[{ label: 'App Version',  value: 'v1.5.2'           },
                    { label: 'NLP Engine',   value: 'BERT-base v2.4.1' },
                    { label: 'Node.js',      value: '20.x LTS'         },
                    { label: 'Next.js',      value: '15.x'             },
                    { label: 'Last Updated', value: 'Oct 30, 2026'     }].map((item, i) => (
                    <div key={i} className="settings-row">
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                      <code className="text-xs" style={{ color: '#A78BFA' }}>{item.value}</code>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────
export default function Home() {
  const [activeView, setActiveView] = useState('chat');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen p-4 gap-4" style={{ maxHeight: '100vh', overflow: 'hidden' }}>
      <Sidebar active={activeView} setActive={setActiveView} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeView === 'chat' && (
            <motion.div key="chat" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ChatView />
            </motion.div>
          )}
          {activeView === 'dashboard' && (
            <motion.div key="dashboard" className="h-full glass-card overflow-y-auto p-6" style={{ borderRadius: '20px' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <DashboardView />
            </motion.div>
          )}
          {activeView === 'history' && (
            <motion.div key="history" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <HistoryView />
            </motion.div>
          )}
          {activeView === 'insights' && (
            <motion.div key="insights" className="h-full glass-card overflow-y-auto p-6" style={{ borderRadius: '20px' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <InsightsView />
            </motion.div>
          )}
          {activeView === 'settings' && (
            <motion.div key="settings" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SettingsView />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

