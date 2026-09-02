import { AssistantRuntimeProvider, useLocalRuntime } from '@assistant-ui/react';
import { ExportedMessageRepository } from '@assistant-ui/react';
import { Thread } from '@/components/assistant-ui/thread';
import { useUser } from '@clerk/clerk-react';
import { useUserProfile } from '@/context/UserProfileContext';
import { useToast } from '@/context/ToastContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { sendChatMessage, getChatHistory, getUserSessions } from '@/lib/api';

function ChatAdapter({ userId, profile, sessionId, initialMessages, onReset }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const initialMessageFromNav = location.state?.initialMessage;

  const adapter = {
    async run({ messages }) {
      const last = messages[messages.length - 1];
      const text = last.content.filter(p => p.type === 'text').map(p => p.text).join('');

      const payload = {
        message: text,
        mode: 'sahayak',
        sessionId,
        userId: userId || 'anonymous',
        profile,
      };

      try {
        const data = await sendChatMessage(payload);
        const content = [{ type: 'text', text: data.reply || 'Sorry, I could not process that.' }];

        if (data.payment) {
          content.push({ type: 'payment-card', data: data.payment });
        }

        if (data.agent_trace) {
          content.push({ type: 'agent-trace', data: data.agent_trace });
        }

        return { content };
      } catch (error) {
        console.error('Chat error:', error);
        addToast('Service unavailable. Please try again.', 'error');
        throw error;
      }
    },
  };

  // official history adapter so the thread resumes persisted messages like ChatGPT
  const runtime = useLocalRuntime(adapter, {
    adapters: {
      history: {
        load: async () => ExportedMessageRepository.fromArray(initialMessages),
        append: async () => {},
      },
    },
  });

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-orange-50/30">
      <div className="flex items-center gap-3 px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-slate-200/60 shadow-sm shrink-0">
        <button
          onClick={() => navigate('/home')}
          className="p-2 rounded-lg hover:bg-slate-100 hover:shadow-sm transition-all duration-200"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-md shadow-orange-200/50">
          <span className="text-white text-sm font-bold">₹</span>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-800 text-sm">DhanMitra</p>
          <p className="text-xs text-green-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            Online
          </p>
        </div>
        {onReset && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-200/50 transition-all duration-200"
          >
            <Plus className="h-3.5 w-3.5" /> New chat
          </button>
        )}
      </div>

      <AssistantRuntimeProvider runtime={runtime}>
        <div className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
          <Thread
            initialMessage={initialMessageFromNav}
            userId={userId || 'anonymous'}
            sessionId={sessionId}
          />
        </div>
      </AssistantRuntimeProvider>
    </div>
  );
}

function makeSessionId(uid) {
  return `session-${uid}-${Date.now()}`;
}

export default function ChatPage() {
  const { user } = useUser();
  const { profile } = useUserProfile();
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [initialMessages, setInitialMessages] = useState([]);
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const uid = user?.id || 'anonymous';
  const cacheKey = `dhanmitra_session_${uid}`;

  const refreshSessions = useCallback(async () => {
    if (uid === 'anonymous') {
      setSessions([]);
      return;
    }
    try {
      const { sessions: list } = await getUserSessions(uid);
      setSessions(list || []);
    } catch {
      /* ignore */
    }
  }, [uid]);

  // Resolve initial (active) session: most recent from backend, else cache, else new.
  // Also loads the sidebar session list once on mount.
  useEffect(() => {
    if (uid === 'anonymous') return;

    let cancelled = false;
    const resolve = async () => {
      let id = null;

      try {
        const { sessions: list } = await getUserSessions(uid);
        if (list && list.length > 0) id = list[0].session_id;
        if (cancelled) return;
        setSessions(list || []);
      } catch {
        /* ignore */
      }

      if (!id) {
        try {
          id = localStorage.getItem(cacheKey);
        } catch {
          id = null;
        }
      }
      if (!id) id = makeSessionId(uid);

      try {
        localStorage.setItem(cacheKey, id);
      } catch {
        /* ignore */
      }

      if (cancelled) return;

      // load history for the resolved session
      let history = [];
      try {
        const { messages } = await getChatHistory(id);
        history = (messages || []).map((msg, i) => {
          const isAssistant = msg.role === 'assistant';
          return {
            id: `history-${i}`,
            role: isAssistant ? 'assistant' : 'user',
            content: [{ type: 'text', text: msg.content }],
            ...(isAssistant ? { status: { type: 'complete', reason: 'stop' } } : {}),
          };
        });
      } catch {
        /* ignore */
      }

      if (cancelled) return;
      setActiveSessionId(id);
      setInitialMessages(history);
      setReady(true);
    };

    resolve();
    return () => {
      cancelled = true;
    };
  }, [uid, cacheKey]);

  const openNewChat = async () => {
    const id = makeSessionId(uid);
    try {
      localStorage.setItem(cacheKey, id);
    } catch {
      /* ignore */
    }
    setActiveSessionId(id);
    setInitialMessages([]);
    await refreshSessions();
  };

  const openSession = async (sessionId) => {
    let history = [];
    try {
      const { messages } = await getChatHistory(sessionId);
      history = (messages || []).map((msg, i) => {
        const isAssistant = msg.role === 'assistant';
        return {
          id: `history-${i}`,
          role: isAssistant ? 'assistant' : 'user',
          content: [{ type: 'text', text: msg.content }],
          ...(isAssistant ? { status: { type: 'complete', reason: 'stop' } } : {}),
        };
      });
    } catch {
      /* ignore */
    }
    try {
      localStorage.setItem(cacheKey, sessionId);
    } catch {
      /* ignore */
    }
    setActiveSessionId(sessionId);
    setInitialMessages(history);
  };

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-orange-50/30">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    );
  }

  const activePreview = sessions.find(s => s.session_id === activeSessionId)?.last_message || '';

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-orange-50/30">
      {/* Sidebar */}
      <aside
        className={`shrink-0 flex flex-col bg-slate-900 text-slate-200 transition-all duration-300 overflow-hidden ${
          sidebarOpen ? 'w-72' : 'w-0'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 h-16 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-md">
              <span className="text-white text-sm font-bold">₹</span>
            </span>
            <span className="font-semibold text-white">DhanMitra</span>
          </div>
          <button
            onClick={openNewChat}
            title="New chat"
            className="p-2 rounded-lg hover:bg-slate-800 text-white transition-colors"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <button
          onClick={openNewChat}
          className="mx-3 mb-3 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-md shadow-orange-900/40 transition-all duration-200"
        >
          <Plus className="h-4 w-4" /> New chat
        </button>

        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
          {sessions.length === 0 && (
            <p className="text-xs text-slate-500 px-2 py-2">No conversations yet. Start a new chat!</p>
          )}
          {sessions.map((s) => {
            const active = s.session_id === activeSessionId;
            const preview = s.last_message || 'New chat';
            return (
              <button
                key={s.session_id}
                onClick={() => openSession(s.session_id)}
                className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  active ? 'bg-slate-700/70 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <MessageSquare className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="truncate">{preview.length > 28 ? preview.slice(0, 28) + '…' : preview}</span>
              </button>
            );
          })}
        </div>

        <div className="p-3 border-t border-slate-800">
          <p className="text-[11px] text-slate-500 truncate">{activePreview || 'Welcome to DhanMitra'}</p>
        </div>
      </aside>

      {/* Sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(v => !v)}
        title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        className="absolute top-1/2 left-0 z-20 hidden sm:flex items-center justify-center w-7 h-12 bg-slate-800/80 text-slate-200 hover:bg-slate-700 rounded-r-xl shadow-md transition-transform ml-0"
        style={{ transform: sidebarOpen ? 'translateX(16rem)' : 'translateX(0)', transition: 'transform 0.3s' }}
      >
        {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatAdapter
          key={activeSessionId}
          userId={user?.id}
          profile={profile}
          sessionId={activeSessionId}
          initialMessages={initialMessages}
          onReset={openNewChat}
        />
      </div>
    </div>
  );
}
