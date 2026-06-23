import { Mic, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function VoiceInputButton({ isListening, onStart, onStop, disabled }) {
  return (
    <Button
      type="button"
      size="icon"
      variant={isListening ? 'destructive' : 'outline'}
      onClick={isListening ? onStop : onStart}
      disabled={disabled}
      className={cn('rounded-full shrink-0', isListening && 'animate-pulse')}
    >
      {isListening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  )
}