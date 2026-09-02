import {
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ActionBarPrimitive,
  AuiIf,
} from '@assistant-ui/react';
import { useAui } from '@assistant-ui/react';
import { MarkdownTextPrimitive } from '@assistant-ui/react-markdown';
import '@assistant-ui/react-markdown/styles/dot.css';
import remarkGfm from 'remark-gfm';
import { useUser } from '@clerk/clerk-react';
import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUp, Copy, Check, RefreshCw, Sparkles, Mic, MicOff } from 'lucide-react';
import { useUserProfile } from '@/context/UserProfileContext';
import { startRecognition, stopRecognition, requestMicPermission, speak, stopSpeaking } from '@/lib/voice';
import { Volume2 } from 'lucide-react';
import PaymentCard, { PaymentContext } from '@/components/chat/PaymentCard';
import AgentTrace from '@/components/chat/AgentTrace';

function AssistantAvatar() {
  return (
    <div className="w-8 h-8 rounded-full bg-linear-to-br from-orange-400 to-orange-600 flex items-center justify-center shrink-0 shadow-sm">
      <span className="text-white text-sm font-bold">₹</span>
    </div>
  );
}

function UserAvatar() {
  const { user } = useUser();
  if (user?.imageUrl) {
    return <img src={user.imageUrl} alt="You" className="w-8 h-8 rounded-full object-cover shrink-0 shadow-sm" />;
  }
  const initial = user?.firstName?.[0] || 'U';
  return (
    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0 shadow-sm">
      <span className="text-white text-sm font-semibold">{initial}</span>
    </div>
  );
}

function UserMessage() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="dm-message-in flex justify-end items-start gap-2.5 mb-5"
    >
      <MessagePrimitive.Root className="max-w-[75%] rounded-2xl rounded-tr-md bg-linear-to-br from-orange-500 to-orange-600 px-4 py-2.5 text-sm text-white shadow-md shadow-orange-200/60">
        <MessagePrimitive.Parts />
      </MessagePrimitive.Root>
      <UserAvatar />
    </motion.div>
  );
}

function AssistantActionBar() {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="flex gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
    >
      <ActionBarPrimitive.Copy className="flex items-center rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
        <AuiIf condition={(s) => s.message.isCopied}><Check className="h-3.5 w-3.5" /></AuiIf>
        <AuiIf condition={(s) => !s.message.isCopied}><Copy className="h-3.5 w-3.5" /></AuiIf>
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload className="flex items-center rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
        <RefreshCw className="h-3.5 w-3.5" />
      </ActionBarPrimitive.Reload>
    </ActionBarPrimitive.Root>
  );
}

function ReadAloudButton({ getText, lang }) {
  const [speaking, setSpeaking] = useState(false);

  const toggle = (e) => {
    e.preventDefault();
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    const text = getText();
    if (!text) return;
    speak(text, lang, { onEnd: () => setSpeaking(false) });
    setSpeaking(true);
  };

  return (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={toggle}
      title={speaking ? 'Stop reading aloud' : 'Read aloud'}
      aria-label={speaking ? 'Stop reading aloud' : 'Read aloud'}
      className={`flex items-center rounded-md p-1.5 text-sm transition ${
        speaking
          ? 'bg-orange-100 text-orange-600 animate-pulse'
          : 'text-slate-400 hover:bg-slate-100 hover:text-orange-600'
      }`}
    >
      <Volume2 className="h-3.5 w-3.5" />
    </button>
  );
}

function AssistantMessage() {
  const { profile } = useUserProfile();
  const lang = profile?.language || 'hindi';
  const textRef = useRef('');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="dm-message-in flex items-start gap-2.5 mb-5 group"
    >
      <AssistantAvatar />
      <div className="max-w-[75%]">
        <MessagePrimitive.Root className="rounded-2xl rounded-tl-md bg-white border border-slate-200/80 px-4 py-2.5 text-sm text-slate-800 shadow-[0_1px_4px_rgba(15,23,42,0.06)]">
          <MessagePrimitive.Parts>
            {({ part }) => {
              if (part.type === 'text') {
                textRef.current = part.text;
                return <MarkdownTextPrimitive remarkPlugins={[remarkGfm]} className="aui-md" />;
              }
              if (part.type === 'payment-card') {
                return <PaymentCard data={part.data} />;
              }
              if (part.type === 'agent-trace') {
                return <AgentTrace systems={part.data?.systems} internalLoop={part.data?.internalLoop} />;
              }
              return null;
            }}
          </MessagePrimitive.Parts>
        </MessagePrimitive.Root>
        <div className="flex items-center">
          <ReadAloudButton getText={() => textRef.current} lang={lang} />
          <AssistantActionBar />
        </div>
      </div>
    </motion.div>
  );
}

function ThinkingIndicator() {
  return (
    <AuiIf condition={(s) => s.thread.isRunning}>
      <div className="dm-message-in flex items-center gap-2.5 mb-5">
        <AssistantAvatar />
        <div className="flex items-center gap-1 rounded-2xl rounded-tl-md bg-white border border-slate-200/80 px-4 py-3 shadow-[0_1px_4px_rgba(15,23,42,0.06)]">
          <span className="dm-dot w-1.5 h-1.5 rounded-full bg-slate-400" style={{ animationDelay: '0s' }} />
          <span className="dm-dot w-1.5 h-1.5 rounded-full bg-slate-400" style={{ animationDelay: '0.2s' }} />
          <span className="dm-dot w-1.5 h-1.5 rounded-full bg-slate-400" style={{ animationDelay: '0.4s' }} />
        </div>
      </div>
    </AuiIf>
  );
}

function InitialMessagePusher({ text }) {
  const aui = useAui();
  const sentRef = useRef(false);

  useEffect(() => {
    if (!text || sentRef.current) return;
    sentRef.current = true;
    aui.thread().append(text);
  }, [text, aui]);

  return null;
}

export function Thread({ placeholder = 'Ask anything...', initialMessage, onVoiceMessage, userId, sessionId }) {
  const aui = useAui();
  const { profile } = useUserProfile();
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState('');
  const recSessionRef = useRef(null);

  const startDictation = async () => {
    if (recSessionRef.current) return;
    setMicError('');
    try {
      await requestMicPermission();
    } catch {
      setMicError('Microphone access denied. Enable it in browser settings.');
      return;
    }
    const session = startRecognition({
      lang: profile?.language || 'hindi',
      interimResults: true,
      onInterim: (text) => aui.composer().setText(text),
      onFinal: (text) => {
        if (text.trim() && !(profile?.accessibilityMode === 'voice_only')) {
          aui.composer().send();
        }
      },
      onError: () => {
        recSessionRef.current = null;
        setListening(false);
      },
    });
    recSessionRef.current = session;
    setListening(true);
    // In pure voice mode, speak the final transcript as confirmation and send it.
    if (session) {
      session.ended.then((finalText) => {
        recSessionRef.current = null;
        setListening(false);
        if (profile?.accessibilityMode === 'voice_only' && finalText.trim()) {
          speak(finalText, profile.language || 'hindi');
          aui.thread().append(finalText);
        }
        if (finalText.trim() && onVoiceMessage) onVoiceMessage();
      });
    }
  };

  const stopDictation = () => {
    stopRecognition(recSessionRef.current);
    recSessionRef.current = null;
  };

  return (
    <PaymentContext.Provider value={{ userId, sessionId }}>
      <ThreadPrimitive.Root className="relative flex h-full flex-col bg-transparent">
      <InitialMessagePusher text={initialMessage} />
      <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-auto px-4 py-6 max-w-3xl w-full mx-auto">
        <AuiIf condition={(s) => s.thread.isEmpty}>
          <div className="flex flex-col items-center justify-center flex-1 text-center px-6 py-12">
            <div className="w-20 h-20 rounded-2xl bg-linear-to-br from-orange-400 to-orange-600 flex items-center justify-center mb-6 shadow-xl shadow-orange-200/60">
              <span className="text-white text-3xl font-bold">₹</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Hi, I'm DhanMitra</h2>
            <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
              Your personal financial assistant. Ask me about savings, government schemes, or anything related to your finances.
            </p>
            <div className="flex gap-2 mt-6 flex-wrap justify-center">
              {['Savings tips', 'Government schemes', 'Emergency fund', 'Budget planning'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => aui.thread().append(suggestion)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs text-slate-600 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 transition-all duration-200 shadow-sm"
                >
                  <Sparkles className="inline h-3 w-3 mr-1" />
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </AuiIf>
        <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage }} />
        <ThinkingIndicator />
      </ThreadPrimitive.Viewport>

      <ThreadPrimitive.ScrollToBottom className="absolute bottom-28 right-6 rounded-full bg-white border border-slate-200 shadow-lg p-2.5 text-slate-500 hover:bg-slate-50 hover:scale-105 hover:shadow-xl transition-all duration-200">
        ↓
      </ThreadPrimitive.ScrollToBottom>

      <ThreadPrimitive.ViewportFooter className="bg-white/60 backdrop-blur-sm px-4 py-4 sticky bottom-0 border-t border-slate-200/60">
        <div className="max-w-3xl w-full mx-auto">
          <ComposerPrimitive.Root className="flex items-end gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg shadow-slate-200/50 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100 focus-within:shadow-xl transition-all duration-200">
            <ComposerPrimitive.Input
              placeholder={placeholder}
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm outline-none py-1.5 max-h-32 placeholder:text-slate-400"
            />
            <button
              type="button"
              onPointerDown={startDictation}
              onPointerUp={stopDictation}
              onPointerLeave={stopDictation}
              title={listening ? 'Listening… release to send' : 'Hold to talk'}
              aria-label="Voice input"
              className={`shrink-0 rounded-xl p-2.5 transition-all duration-200 ${listening
                ? 'bg-red-500 text-white shadow-md shadow-red-200 animate-pulse'
                : 'bg-slate-100 text-slate-500 hover:bg-orange-100 hover:text-orange-600'}`}
            >
              {listening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </button>
            <ComposerPrimitive.Send className="shrink-0 rounded-xl bg-linear-to-br from-orange-500 to-orange-600 p-2.5 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all duration-200 shadow-md shadow-orange-200/50">
              <ArrowUp className="h-4 w-4" />
            </ComposerPrimitive.Send>
          </ComposerPrimitive.Root>
          {listening && (
            <p className="pt-2 text-center text-[11px] font-medium text-red-500 animate-pulse">
              {profile?.language === 'english' ? 'Listening… release to send' : 'सुन रहा हूँ… छोड़ने पर भेजें'}
            </p>
          )}
          {micError && <p className="pt-2 text-center text-[11px] text-red-500">{micError}</p>}
          <p className="text-center text-[11px] text-slate-400 mt-3">
            DhanMitra can make mistakes. Verify important financial information.
          </p>
        </div>
      </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Root>
    </PaymentContext.Provider>
  );
}