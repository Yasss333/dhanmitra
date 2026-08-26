import { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function TextToSpeechButton({ text, disabled }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const utteranceRef = useRef(null);
  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);

  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const handleSpeak = () => {
    if (!synthRef.current || !text) return;

    if (isSpeaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      return;
    }

    setIsLoading(true);
    
    // Create a new utterance
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;

    // Try to get a good voice
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.lang.includes('en') && voice.name.includes('Google')
    ) || voices.find(voice => voice.lang.includes('en')) || voices[0];

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsLoading(false);
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsLoading(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsLoading(false);
    };

    synthRef.current.speak(utterance);
  };

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      onClick={handleSpeak}
      disabled={disabled || isLoading || !text}
      className={cn(
        'rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition',
        isSpeaking && 'text-orange-600 bg-orange-50 hover:bg-orange-100'
      )}
      title={isSpeaking ? 'Stop reading' : 'Read aloud'}
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isSpeaking ? (
        <VolumeX className="h-3.5 w-3.5" />
      ) : (
        <Volume2 className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}