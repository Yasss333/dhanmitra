// import { useState, useRef, useEffect } from 'react'
// import { Volume2, VolumeX, Send } from 'lucide-react'
// import { Button } from '@/components/ui/button'
// import { Textarea } from '@/components/ui/textarea'
// import { Badge } from '@/components/ui/badge'
// import ChatMessage from '@/components/chat/ChatMessage'
// import AgentTrace from '@/components/chat/AgentTrace'
// import VoiceInputButton from '@/components/chat/VoiceInputButton'
// import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
// import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis'
// import { sendChatMessage } from '@/lib/api'
// import { useUserProfile } from '@/context/UserProfileContext'
// import { useUser } from '@clerk/clerk-react'

// const GREETING = "Guardian Mode is active. Every response will be read aloud automatically. You can type or speak your question. I'm here to help you understand insurance, government schemes, and any financial decisions — fully independently."

// export default function GuardianMode() {
//   const { profile } = useUserProfile()
//   const { user } = useUser()
//   const language = profile.language || 'english'

//   const [messages, setMessages] = useState([
//     { id: 'greeting', role: 'assistant', content: GREETING },
//   ])
//   const [input, setInput] = useState('')
//   const [isThinking, setIsThinking] = useState(false)
//   const [autoSpeak, setAutoSpeak] = useState(true)
//   const scrollRef = useRef(null)

//   const { isListening, transcript, isSupported, start, stop } = useSpeechRecognition(language)
//   const { speak, stop: stopSpeaking, isSpeaking } = useSpeechSynthesis(language)

//   useEffect(() => {
//     if (transcript) setInput(transcript)
//   }, [transcript])

//   useEffect(() => {
//     scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
//   }, [messages, isThinking])

//   // Auto-speak greeting on mount
//   useEffect(() => {
//     if (autoSpeak) speak(GREETING)
//   }, [])

//   const handleSend = async () => {
//     const text = input.trim()
//     if (!text || isThinking) return

//     stopSpeaking()
//     const userMessage = { id: crypto.randomUUID(), role: 'user', content: text }
//     setMessages((prev) => [...prev, userMessage])
//     setInput('')
//     setIsThinking(true)

//     try {
//       const data = await sendChatMessage({
//         message: text,
//         mode: 'guardian',
//         sessionId: 'session-guardian',
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
//       if (autoSpeak) speak(data.reply)
//     } catch {
//       const errMsg = "I couldn't reach DhanMitra right now. Please try again in a moment."
//       setMessages((prev) => [
//         ...prev,
//         { id: crypto.randomUUID(), role: 'assistant', content: errMsg },
//       ])
//       if (autoSpeak) speak(errMsg)
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
//       {/* Accessibility bar */}
//       <div
//         className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between text-sm"
//         role="banner"
//         aria-label="Guardian Mode accessibility controls"
//       >
//         <div className="flex items-center gap-2">
//           <Badge variant="secondary" className="bg-green-600 text-white text-xs">
//             Guardian Mode
//           </Badge>
//           <span className="text-slate-300 text-xs">Screen-reader optimised • Voice-first</span>
//         </div>
//         <Button
//           size="sm"
//           variant="ghost"
//           className="text-white hover:bg-slate-700 gap-1.5 text-xs"
//           onClick={() => {
//             setAutoSpeak((v) => !v)
//             if (isSpeaking) stopSpeaking()
//           }}
//           aria-pressed={autoSpeak}
//           aria-label={autoSpeak ? 'Disable auto-read aloud' : 'Enable auto-read aloud'}
//         >
//           {autoSpeak ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
//           {autoSpeak ? 'Auto-read ON' : 'Auto-read OFF'}
//         </Button>
//       </div>

//       {/* Messages */}
//       <div
//         ref={scrollRef}
//         className="flex-1 overflow-y-auto px-4 py-4"
//         role="log"
//         aria-live="polite"
//         aria-label="Conversation"
//       >
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
//             <div className="flex justify-start" role="status" aria-label="DhanMitra is thinking">
//               <div className="bg-white border rounded-2xl px-4 py-2.5 text-sm text-slate-400 shadow-sm">
//                 DhanMitra is thinking...
//               </div>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* Input */}
//       <div className="border-t bg-white p-3 flex items-end gap-2">
//         {isSupported && (
//           <VoiceInputButton
//             isListening={isListening}
//             onStart={start}
//             onStop={stop}
//             disabled={isThinking}
//             aria-label={isListening ? 'Stop recording' : 'Start recording'}
//           />
//         )}
//         <Textarea
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//           onKeyDown={handleKeyDown}
//           placeholder="Type or speak your question..."
//           className="min-h-[44px] max-h-32 resize-none text-base"
//           rows={1}
//           aria-label="Message input"
//         />
//         <Button
//           size="icon"
//           onClick={handleSend}
//           disabled={!input.trim() || isThinking}
//           className="rounded-full shrink-0"
//           aria-label="Send message"
//         >
//           <Send className="h-4 w-4" />
//         </Button>
//       </div>
//     </div>
//   )
// }