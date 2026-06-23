import { cn } from '@/lib/utils'

export default function ChatMessage({ role, content }) {
  const isUser = role === 'user'
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'bg-blue-100 text-slate-900 rounded-br-sm'
            : 'bg-white border text-slate-800 rounded-bl-sm shadow-sm'
        )}
      >
        {content}
      </div>
    </div>
  )
}