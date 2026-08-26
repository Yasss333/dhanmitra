import { useState } from 'react';
import { Zap, ChevronDown, ChevronRight, Cpu, Brain, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AgentTrace({ systems = [], internalLoop = [] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!systems?.length && !internalLoop?.length) return null;

  const totalSteps = systems.length + internalLoop.length;

  return (
    <div className="max-w-[80%] rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 px-3 py-2 text-xs text-amber-900 space-y-2 mt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 font-medium hover:text-amber-800 transition-colors w-full text-left"
      >
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 shrink-0" />
          <span>AI Reasoning Process</span>
        </div>
        <span className="text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full text-[10px]">
          {totalSteps} steps
        </span>
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 ml-auto shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 ml-auto shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-2 pl-1 mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {systems?.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
                <Cpu className="h-3 w-3" />
                <span>Activated Systems</span>
              </div>
              <div className="flex flex-wrap gap-1 pl-4">
                {systems.map((system, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-white border border-amber-300 rounded-full text-amber-800"
                  >
                    {system}
                  </span>
                ))}
              </div>
            </div>
          )}

          {internalLoop?.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
                <Brain className="h-3 w-3" />
                <span>Internal Reasoning</span>
              </div>
              <div className="space-y-1 pl-4">
                {internalLoop.map((loop, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-2 bg-white/50 border border-amber-200 rounded"
                  >
                    <span className="text-amber-600 font-mono text-[10px] bg-amber-100 px-1.5 py-0.5 rounded shrink-0">
                      {loop.turn}
                    </span>
                    <span className="text-amber-800 leading-tight">{loop.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}