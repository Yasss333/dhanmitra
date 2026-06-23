import { Zap } from 'lucide-react'

export default function AgentTrace({ systems = [], internalLoop = [] }) {
  if (!systems?.length && !internalLoop?.length) return null

  return (
    <div className="max-w-[80%] rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900 space-y-1">
      {systems?.length > 0 && (
        <div className="flex items-start gap-1.5 font-medium">
          <Zap className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>Activated Systems: {systems.join(', ')}</span>
        </div>
      )}
      {internalLoop?.map((loop, i) => (
        <div key={i} className="pl-5 text-amber-800">
          DhanMitra [Internal Loop Turn {loop.turn}]: {loop.label}
        </div>
      ))}
    </div>
  )
}