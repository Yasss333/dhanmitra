import { AssistantRuntimeProvider, useLocalRuntime } from '@assistant-ui/react';
import { Thread } from '@/components/assistant-ui/thread'; // scaffolded, not from the npm package
import { useUser } from '@clerk/clerk-react';              // <-- ADDED this import
import { useUserProfile } from '@/context/UserProfileContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useRef } from 'react';
import { sendChatMessage } from '@/lib/api';

export default function ChatPage() {
  const { user } = useUser();                               // <-- Now this works
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const sessionIdRef = useRef(`session-${user?.id}-${Date.now()}`);

  const dhanMitraAdapter = {
    async run({ messages, abortSignal }) {
      const last = messages[messages.length - 1];
      const text = last.content.filter(p => p.type === 'text').map(p => p.text).join('');

      const payload = {
        message: text,
        mode: 'sahayak',
        session_id: sessionIdRef.current,
        user_id: user?.id || 'anonymous',
        profile,
      };

      try {
        const data = await sendChatMessage(payload);
        const content = [{ type: 'text', text: data.reply || 'Sorry, I could not process that.' }];
        
        // Add agent trace if available
        if (data.agent_trace) {
          content.push({
            type: 'agent-trace',
            data: data.agent_trace
          });
        }
        
        return { content };
      } catch (error) {
        console.error('Chat error:', error);
        return { content: [{ type: 'text', text: 'Service unavailable right now. Please try again.' }] };
      }
    },
  };

  const runtime = useLocalRuntime(dhanMitraAdapter);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-orange-50/30">
      {/* Header */}
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