import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send } from 'lucide-react'
import { useUser } from '@clerk/clerk-react'
import { useUserProfile } from '@/context/UserProfileContext'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis'
import { sendChatMessage } from '@/lib/api'
import ChatMessage from '@/components/chat/ChatMessage'
import AgentTrace from '@/components/chat/AgentTrace'
import VoiceInputButton from '@/components/chat/VoiceInputButton'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

const GREETINGS = {
  farmer: {
    hindi:   'नमस्ते! मैं आपकी खेती, सरकारी योजनाओं और पैसों के बारे में मदद कर सकता हूँ। आज क्या जानना है?',
    marathi: 'नमस्कार! मी शेती, सरकारी योजना आणि पैशांबद्दल मदत करू शकतो. आज काय जाणून घ्यायचे आहे?',
    kannada: 'ನಮಸ್ಕಾರ! ನಾನು ಕೃಷಿ, ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು ಮತ್ತು ಹಣದ ಬಗ್ಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ.',
    english: 'Hello! I can help you with farming, government schemes, and money matters. What would you like to know?',
  },
  gig_worker: {
    hindi:   'नमस्ते! आपकी कमाई, बचत, और सरकारी लाभ — सब कुछ में मदद करूँगा।',
    marathi: 'नमस्कार! तुमची कमाई, बचत आणि सरकारी लाभ — सर्व काही मदत करेन.',
    kannada: 'ನಮಸ್ಕಾರ! ನಿಮ್ಮ ಗಳಿಕೆ, ಉಳಿತಾಯ ಮತ್ತು ಸರ್ಕಾರಿ ಸೌಲಭ್ಯಗಳ ಬಗ್ಗೆ ಸಹಾಯ ಮಾಡುತ್ತೇನೆ.',
    english: 'Hello! I can help with your earnings, savings, and government benefits. What do you need?',
  },
  homemaker: {
    hindi:   'नमस्ते! घर के बजट, बचत और आपके लिए सरकारी योजनाओं में मदद करूँगा।',
    marathi: 'नमस्कार! घराचे बजेट, बचत आणि तुमच्यासाठी सरकारी योजनांमध्ये मदत करेन.',
    kannada: 'ನಮಸ್ಕಾರ! ಮನೆ ಬಜೆಟ್, ಉಳಿತಾಯ ಮತ್ತು ನಿಮಗಾಗಿ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳಲ್ಲಿ ಸಹಾಯ ಮಾಡುತ್ತೇನೆ.',
    english: 'Hello! I can help with household budgeting, savings, and government schemes for you.',
  },
  student: {
    hindi:   'नमस्ते! वित्तीय ज्ञान, स्कॉलरशिप और पैसे बचाने में मदद करूँगा।',
    marathi: 'नमस्कार! आर्थिक ज्ञान, शिष्यवृत्ती आणि पैसे वाचवण्यात मदत करेन.',
    kannada: 'ನಮಸ್ಕಾರ! ಹಣಕಾಸು ಜ್ಞಾನ, ವಿದ್ಯಾರ್ಥಿವೇತನ ಮತ್ತು ಹಣ ಉಳಿಸುವಲ್ಲಿ ಸಹಾಯ ಮಾಡುತ್ತೇನೆ.',
    english: 'Hello! I can help with financial literacy, scholarships, and saving money as a student.',
  },
  salaried: {
    hindi:   'नमस्ते! निवेश, टैक्स बचत और वित्तीय योजना में मदद करूँगा।',
    marathi: 'नमस्कार! गुंतवणूक, कर बचत आणि आर्थिक नियोजनात मदत करेन.',
    kannada: 'ನಮಸ್ಕಾರ! ಹೂಡಿಕೆ, ತೆರಿಗೆ ಉಳಿತಾಯ ಮತ್ತು ಹಣಕಾಸು ಯೋಜನೆಯಲ್ಲಿ ಸಹಾಯ ಮಾಡುತ್ತೇನೆ.',
    english: 'Hello! I can help with investments, tax saving, and financial planning.',
  },
  business_owner: {
    hindi:   'नमस्ते! लोन, GST, बिज़नेस स्कीम और पैसों के प्रबंधन में मदद करूँगा।',
    marathi: 'नमस्कार! कर्ज, GST, व्यवसाय योजना आणि पैशांच्या व्यवस्थापनात मदत करेन.',
    kannada: 'ನಮಸ್ಕಾರ! ಸಾಲ, GST, ವ್ಯಾಪಾರ ಯೋಜನೆ ಮತ್ತು ಹಣ ನಿರ್ವಹಣೆಯಲ್ಲಿ ಸಹಾಯ ಮಾಡುತ್ತೇನೆ.',
    english: 'Hello! I can help with loans, GST, business schemes, and money management.',
  },
}

export default function ChatPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useUser()
  const { profile } = useUserProfile()

  const lang = profile.language || 'english'
  const occ  = profile.occupation || 'gig_worker'
  const autoSpeak = profile.accessibilityMode === 'low_vision'

  const greeting = GREETINGS[occ]?.[lang] || GREETINGS['gig_worker']['english']

  const [messages, setMessages] = useState([
    { id: 'greeting', role: 'assistant', content: greeting },
  ])
  
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const scrollRef = useRef(null)
  const sessionId = useRef(`session-${user?.id}-${Date.now()}`)

  const { isListening, transcript, isSupported, start, stop } = useSpeechRecognition(lang)
  const { speak } = useSpeechSynthesis(lang)

  // If came from home with an initial message, send it automatically
  useEffect(() => {
    const initial = location.state?.initialMessage
    if (initial) {
      setInput(initial)
      setTimeout(() => handleSend(initial), 300)
    }
  }, [])

  useEffect(() => {
    if (transcript) setInput(transcript)
  }, [transcript])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, isThinking])

  const handleSend = async (overrideText) => {
    const text = (overrideText || input).trim()
    if (!text || isThinking) return

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: text }])
    setInput('')
    setIsThinking(true)

    try {
      const data = await sendChatMessage({
        message: text,
        mode: occ,
        sessionId: sessionId.current,
        userId: user?.id,
        profile,
      })
      const msg = { id: crypto.randomUUID(), role: 'assistant', content: data.reply, agentTrace: data.agent_trace }
      setMessages((prev) => [...prev, msg])
      if (autoSpeak) speak(data.reply)
    } catch {
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: lang === 'hindi' ? 'अभी सेवा उपलब्ध नहीं है। कृपया बाद में प्रयास करें।'
               : lang === 'marathi' ? 'सध्या सेवा उपलब्ध नाही. कृपया नंतर प्रयत्न करा.'
               : 'Service unavailable right now. Please try again.',
      }])
    } finally {
      setIsThinking(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b shrink-0">
        <button onClick={() => navigate('/home')} className="p-1 rounded-lg hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </button>
        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
          <span className="text-white text-sm font-bold">₹</span>
        </div>
        <div>
          <p className="font-semibold text-slate-800 text-sm">DhanMitra</p>
          <p className="text-xs text-green-500">● Online</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-1">
            <ChatMessage role={msg.role} content={msg.content} />
            {msg.agentTrace && (
              <AgentTrace systems={msg.agentTrace.systems} internalLoop={msg.agentTrace.internalLoop} />
            )}
          </div>
        ))}
        {isThinking && (
          <div className="flex justify-start">
            <div className="bg-white border rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-slate-400 shadow-sm flex items-center gap-1">
              <span className="animate-bounce">●</span>
              <span className="animate-bounce delay-100">●</span>
              <span className="animate-bounce delay-200">●</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t bg-white px-3 py-3 flex items-end gap-2">
        {isSupported && (
          <VoiceInputButton isListening={isListening} onStart={start} onStop={stop} disabled={isThinking} />
        )}
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            lang === 'hindi' ? 'कुछ भी पूछें...'
            : lang === 'marathi' ? 'काहीही विचारा...'
            : lang === 'kannada' ? 'ಏನಾದರೂ ಕೇಳಿ...'
            : 'Ask anything...'
          }
          className="min-h-[44px] max-h-32 resize-none"
          rows={1}
        />
        <Button
          size="icon"
          onClick={() => handleSend()}
          disabled={!input.trim() || isThinking}
          className="rounded-full shrink-0 bg-orange-500 hover:bg-orange-600"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}