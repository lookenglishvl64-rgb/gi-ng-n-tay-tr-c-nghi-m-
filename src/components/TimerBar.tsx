import React from 'react';
import { Timer, AlertTriangle } from 'lucide-react';

interface TimerBarProps {
  timeLeft: number; // in seconds, e.g. 10.0 -> 0.0
  totalTime: number; // 10 seconds
  isActive: boolean;
}

export const TimerBar: React.FC<TimerBarProps> = ({ timeLeft, totalTime, isActive }) => {
  const percentage = Math.max(0, Math.min(100, (timeLeft / totalTime) * 100));
  const isUrgent = timeLeft <= 3.0 && isActive;
  const isWarning = timeLeft <= 5.0 && timeLeft > 3.0;

  let barColor = 'bg-emerald-500';
  let badgeColor = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';
  let textColor = 'text-emerald-400';

  if (isUrgent) {
    barColor = 'bg-rose-500 animate-pulse';
    badgeColor = 'bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-rose-500/30';
    textColor = 'text-rose-400';
  } else if (isWarning) {
    barColor = 'bg-amber-500';
    badgeColor = 'bg-amber-950/80 text-amber-300 border-amber-500/40';
    textColor = 'text-amber-400';
  }

  const formattedTime = timeLeft > 0 ? timeLeft.toFixed(1) : '0.0';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded-lg border transition-colors ${badgeColor} ${
              isUrgent ? 'animate-bounce' : ''
            }`}
          >
            {isUrgent ? (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            ) : (
              <Timer className="w-4 h-4" />
            )}
          </div>
          <span className="text-xs sm:text-sm font-semibold text-slate-300">Thời gian trả lời</span>
        </div>

        <div className="flex items-baseline gap-1">
          <span
            className={`font-black font-mono text-2xl sm:text-3xl tabular-nums ${textColor} transition-transform ${
              isUrgent ? 'scale-110' : ''
            }`}
          >
            {formattedTime}
          </span>
          <span className="text-xs text-slate-400 font-bold">/ {totalTime}s</span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="relative w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60 p-0.5 shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-100 ease-linear ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
