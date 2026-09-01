import { AssistantRuntimeProvider, useLocalRuntime } from '@assistant-ui/react';
import { Thread } from '@/components/assistant-ui/thread';
import { useUser } from '@clerk/clerk-react';
import { useUserProfile } from '@/context/UserProfileContext';
import { useToast } from '@/context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useRef, useEffect } from 'react';
import { sendChatMessage, getChatHistory } from '@/lib/api';

function ChatAdapter({ userId, profile, sessionIdRef }) {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const adapter = {
    async run({ messages, abortSignal }) {
      const last = messages[messages.length - 1];
      const text = last.content.filter(p => p.type === 'text').map(p => p.text).join('');

      const payload = {
        message: text,
        mode: 'sahayak',
        sessionId: sessionIdRef.current,
        userId: userId || 'anonymous',
        profile,
      };

      try {
        const data = await sendChatMessage(payload);
        const content = [{ type: 'text', text: data.reply || 'Sorry, I could not process that.' }];

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

  const runtime = useLocalRuntime(adapter);

  // Load conversation history on mount
  useEffect(() => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;

    getChatHistory(sessionId)
      .then(({ messages }) => {
        if (!messages || messages.length === 0) return;
        const threadMessages = messages.map((msg, i) => ({
          id: `history-${i}`,
          role: msg.role,
          content: [{ type: 'text', text: msg.content }],
        }));
        runtime.thread.messages = threadMessages;
        runtime.thread.notify();
      })
      .catch(() => {});
  }, [runtime, sessionIdRef]);

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
      </div>

      <AssistantRuntimeProvider runtime={runtime}>
        <div className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
          <Thread />
        </div>
      </AssistantRuntimeProvider>
    </div>
  );
}

export default function ChatPage() {
  const { user } = useUser();
  const { profile } = useUserProfile();

  // Persist session ID across re-renders, keyed to user
  const sessionIdRef = useRef(
    () => {
      const stored = localStorage.getItem(`dhanmitra_session_${user?.id}`);
      if (stored) return stored;
      const newId = `session-${user?.id}-${Date.now()}`;
      localStorage.setItem(`dhanmitra_session_${user?.id}`, newId);
      return newId;
    }
  );

  // Initialize ref value
  if (!sessionIdRef.current) {
    const stored = localStorage.getItem(`dhanmitra_session_${user?.id}`);
    sessionIdRef.current = stored || `session-${user?.id}-${Date.now()}`;
    if (!stored) localStorage.setItem(`dhanmitra_session_${user?.id}`, sessionIdRef.current);
  }

  return (
    <ChatAdapter
      userId={user?.id}
      profile={profile}
      sessionIdRef={sessionIdRef}
    />
  );
}
