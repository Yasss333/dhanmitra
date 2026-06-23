// import { useState, useRef, useEffect } from 'react'
// import { Send } from 'lucide-react'
// import { Button } from '@/components/ui/button'
// import { Textarea } from '@/components/ui/textarea'
// import ChatMessage from '@/components/chat/ChatMessage'
// import AgentTrace from '@/components/chat/AgentTrace'
// import VoiceInputButton from '@/components/chat/VoiceInputButton'
// import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
// import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis'
// import { sendChatMessage } from '@/lib/api'
// import { useUserProfile } from '@/context/UserProfileContext'
// import { useUser } from '@clerk/clerk-react'

// const GREETINGS = {
//   hindi: 'नमस्ते! मैं आपकी पैसों से जुड़ी किसी भी बात में मदद कर सकता हूँ। आज क्या जानना है?',
//   marathi: 'नमस्कार! मी तुमच्या पैशांशी संबंधित कोणत्याही गोष्टीत मदत करू शकतो. आज काय जाणून घ्यायचं आहे?',
//   kannada: 'ನಮಸ್ಕಾರ! ನಿಮ್ಮ ಹಣಕಾಸಿನ ಯಾವುದೇ ವಿಷಯದಲ್ಲಿ ನಾನು ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ಇಂದು ಏನು ತಿಳಿಯಬೇಕು?',
//   english: "Hi! I'm DhanMitra, your financial companion. Ask me anything about money — schemes, savings, or just figuring out a decision.",
// }

// export default function SahayakMode() {
//   const { profile } = useUserProfile()
//   const { user } = useUser()
//   const language = profile.language || 'english'

//   const [messages, setMessages] = useState([
//     { id: 'greeting', role: 'assistant', content: GREETINGS[language] || GREETINGS.english },
//   ])
//   const [input, setInput] = useState('')
//   const [isThinking, setIsThinking] = useState(false)
//   const scrollRef = useRef(null)

//   const { isListening, transcript, isSupported: sttSupported, start, stop } = useSpeechRecognition(language)
//   const { speak } = useSpeechSynthesis(language)

//   useEffect(() => {
//     if (transcript) setInput(transcript)
//   }, [transcript])

//   useEffect(() => {
//     scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
//   }, [messages, isThinking])

//   const handleSend = async () => {
//     const text = input.trim()
//     if (!text || isThinking) return

//     const userMessage = { id: crypto.randomUUID(), role: 'user', content: text }
//     setMessages((prev) => [...prev, userMessage])
//     setInput('')
//     setIsThinking(true)

//     try {
//       const data = await sendChatMessage({
//         message: text,
//         mode: 'sahayak',
//         sessionId: 'session-1',
//         userId: user?.id,
//         profile,
//       })

//       const assistantMessage = {
//         id: crypto.randomUUID(),
//         role: 'assistant',
//         content: data.reply,
//         agentTrace: data.agent_trace,
//       }
//       setMessages((prev) => [...prev, assistantMessage])
//       speak(data.reply)
//     } catch (err) {
//       setMessages((prev) => [
//         ...prev,
//         {
//           id: crypto.randomUUID(),
//           role: 'assistant',
//           content:
//             "I can't reach the DhanMitra engine right now — the backend may not be running yet. (Placeholder reply for now.)",
//         },
//       ])
//     } finally {
//       setIsThinking(false)
//     }
//   }

//   const handleKeyDown = (e) => {
//     if (e.key === 'Enter' && !e.shiftKey) {
//       e.preventDefault()
//       handleSend()
//     }
//   }

//   return (
//     <div className="h-full flex flex-col max-w-3xl mx-auto">
//       <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
//         <div className="space-y-3">
//           {messages.map((msg) => (
//             <div key={msg.id} className="space-y-1">
//               <ChatMessage role={msg.role} content={msg.content} />
//               {msg.agentTrace && (
//                 <AgentTrace systems={msg.agentTrace.systems} internalLoop={msg.agentTrace.internalLoop} />
//               )}
//             </div>
//           ))}
//           {isThinking && (
//             <div className="flex justify-start">
//               <div className="bg-white border rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-slate-400 shadow-sm">
//                 DhanMitra is thinking...
//               </div>
//             </div>
//           )}
//         </div>
//       </div>

//       <div className="border-t bg-white p-3 flex items-end gap-2">
//         {sttSupported && (
//           <VoiceInputButton isListening={isListening} onStart={start} onStop={stop} disabled={isThinking} />
//         )}
//         <Textarea
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//           onKeyDown={handleKeyDown}
//           placeholder="Type or speak your question..."
//           className="min-h-[44px] max-h-32 resize-none"
//           rows={1}
//         />
//         <Button size="icon" onClick={handleSend} disabled={!input.trim() || isThinking} className="rounded-full shrink-0">
//           <Send className="h-4 w-4" />
//         </Button>
//       </div>
//     </div>
//   )
// }