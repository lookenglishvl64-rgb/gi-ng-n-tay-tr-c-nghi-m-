import React from 'react';
import { Check, X, Hand } from 'lucide-react';
import { ChoiceKey } from '../types/quiz';

interface OptionCardProps {
  choiceKey: ChoiceKey;
  text: string;
  fingerCount: number;
  gestureEmoji: string;
  isHoveredOrDetected: boolean;
  holdProgress: number; // 0 to 1
  isSelected: boolean;
  isRevealed: boolean;
  isCorrect: boolean;
  onClick: () => void;
  disabled: boolean;
}

const CHOICE_THEMES: Record<
  ChoiceKey,
  {
    badgeBg: string;
    badgeText: string;
    borderActive: string;
    bgHover: string;
    progressColor: string;
  }
> = {
  A: {
    badgeBg: 'bg-rose-500',
    badgeText: 'text-rose-100',
    borderActive: 'border-rose-400 ring-4 ring-rose-500/20 shadow-rose-500/30',
    bgHover: 'bg-rose-950/30',
    progressColor: '#f43f5e',
  },
  B: {
    badgeBg: 'bg-blue-500',
    badgeText: 'text-blue-100',
    borderActive: 'border-blue-400 ring-4 ring-blue-500/20 shadow-blue-500/30',
    bgHover: 'bg-blue-950/30',
    progressColor: '#3b82f6',
  },
  C: {
    badgeBg: 'bg-amber-500',
    badgeText: 'text-amber-100',
    borderActive: 'border-amber-400 ring-4 ring-amber-500/20 shadow-amber-500/30',
    bgHover: 'bg-amber-950/30',
    progressColor: '#f59e0b',
  },
  D: {
    badgeBg: 'bg-emerald-500',
    badgeText: 'text-emerald-100',
    borderActive: 'border-emerald-400 ring-4 ring-emerald-500/20 shadow-emerald-500/30',
    bgHover: 'bg-emerald-950/30',
    progressColor: '#10b981',
  },
};

export const OptionCard: React.FC<OptionCardProps> = ({
  choiceKey,
  text,
  fingerCount,
  gestureEmoji,
  isHoveredOrDetected,
  holdProgress,
  isSelected,
  isRevealed,
  isCorrect,
  onClick,
  disabled,
}) => {
  const theme = CHOICE_THEMES[choiceKey];

  // Visual state styling
  let containerStyle = 'bg-slate-800/90 border-slate-700 hover:border-slate-500 hover:bg-slate-800';
  let statusIcon = null;

  if (isRevealed) {
    if (isCorrect) {
      containerStyle = 'bg-emerald-950/70 border-emerald-400 ring-4 ring-emerald-500/30 shadow-emerald-500/30 scale-[1.02]';
      statusIcon = (
        <span className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
          <Check className="w-5 h-5 stroke-[3]" />
        </span>
      );
    } else if (isSelected && !isCorrect) {
      containerStyle = 'bg-rose-950/70 border-rose-400 ring-4 ring-rose-500/30 shadow-rose-500/30 opacity-90';
      statusIcon = (
        <span className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg">
          <X className="w-5 h-5 stroke-[3]" />
        </span>
      );
    } else {
      containerStyle = 'bg-slate-900/60 border-slate-800 opacity-50';
    }
  } else if (isSelected) {
    containerStyle = `bg-indigo-950/80 border-indigo-400 ring-4 ring-indigo-500/30 shadow-indigo-500/30 scale-[1.01]`;
  } else if (isHoveredOrDetected) {
    containerStyle = `${theme.bgHover} ${theme.borderActive} scale-[1.015] shadow-xl`;
  }

  const radius = 16;
  const circumference = 2 * Math.PI * radius;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative w-full text-left p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 cursor-pointer overflow-hidden flex items-center gap-4 group ${containerStyle} ${
        disabled ? 'cursor-default' : ''
      }`}
    >
      {/* Background progress fill when charging gesture */}
      {isHoveredOrDetected && !isRevealed && !isSelected && (
        <div
          className="absolute inset-y-0 left-0 bg-white/5 transition-all duration-75 pointer-events-none"
          style={{ width: `${Math.min(100, holdProgress * 100)}%` }}
        />
      )}

      {/* Choice Badge & Gesture Icon */}
      <div className="relative shrink-0 flex items-center justify-center">
        {/* Progress SVG Ring around the letter */}
        {isHoveredOrDetected && !isRevealed && !isSelected && (
          <svg className="absolute -inset-1.5 w-14 h-14 -rotate-90 pointer-events-none">
            <circle
              cx="28"
              cy="28"
              r={radius}
              className="stroke-white/10 fill-none"
              strokeWidth="4"
            />
            <circle
              cx="28"
              cy="28"
              r={radius}
              className="fill-none transition-all duration-75"
              stroke={theme.progressColor}
              strokeWidth="4"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - holdProgress)}
              strokeLinecap="round"
            />
          </svg>
        )}

        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg shadow-md transition-transform group-hover:scale-105 ${theme.badgeBg} text-white`}
        >
          {choiceKey}
        </div>
      </div>

      {/* Content text */}
      <div className="flex-1 min-w-0 pr-2">
        <p className="text-white font-medium text-base sm:text-lg leading-snug break-words">
          {text}
        </p>
      </div>

      {/* Right side: Gesture Requirement tag & status */}
      <div className="shrink-0 flex items-center gap-2">
        {statusIcon ? (
          statusIcon
        ) : (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-bold transition-all ${
              isHoveredOrDetected
                ? 'bg-white/20 border-white/40 text-white shadow-sm'
                : 'bg-slate-900/60 border-slate-700/80 text-slate-300'
            }`}
          >
            <span className="text-base">{gestureEmoji}</span>
            <span>{fingerCount} ngón</span>
          </div>
        )}
      </div>
    </button>
  );
};
