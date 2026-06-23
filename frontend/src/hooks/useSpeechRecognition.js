import { useState, useRef, useCallback, useEffect } from 'react'

const LANGUAGE_MAP = {
  hindi: 'hi-IN',
  marathi: 'mr-IN',
  kannada: 'kn-IN',
  english: 'en-IN',
}

export function useSpeechRecognition(language = 'english') {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')  
  const [isSupported, setIsSupported] = useState(true)
  const recognitionRef = useRef(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setIsSupported(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = LANGUAGE_MAP[language] || 'en-IN'

    recognition.onresult = (event) => {
      let text = ''
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript
      }
      setTranscript(text)
    }

    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)

    recognitionRef.current = recognition
    return () => recognition.abort()
  }, [language])

  const start = useCallback(() => {
    if (!recognitionRef.current) return
    setTranscript('')
    setIsListening(true)
    recognitionRef.current.start()
  }, [])

  const stop = useCallback(() => {
    if (!recognitionRef.current) return
    recognitionRef.current.stop()
    setIsListening(false)
  }, [])

  return { isListening, transcript, isSupported, start, stop }
}