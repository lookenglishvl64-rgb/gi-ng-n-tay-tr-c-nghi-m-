import React, { useState } from 'react';
import { X, CheckCircle2, Circle, Sparkles, Award } from 'lucide-react';
import { CameraView } from './CameraView';
import { FingerCountResult } from '../services/handDetector';
import { ChoiceKey } from '../types/quiz';
import confetti from 'canvas-confetti';
import { sounds } from '../services/soundEffects';

interface PracticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PracticeModal: React.FC<PracticeModalProps> = ({ isOpen, onClose }) => {
  const [testedGestures, setTestedGestures] = useState<Record<ChoiceKey, boolean>>({
    A: false,
    B: false,
    C: false,
    D: false,
  });
  const [activeChoice, setActiveChoice] = useState<ChoiceKey | null>(null);
  const [currentResult, setCurrentResult] = useState<FingerCountResult | null>(null);

  if (!isOpen) return null;

  const handleFingerDetected = (result: FingerCountResult | null) => {
    setCurrentResult(result);
    if (result && result.mappedChoice) {
      setActiveChoice(result.mappedChoice);
      if (!testedGestures[result.mappedChoice]) {
        sounds.playLockIn();
        const updated = { ...testedGestures, [result.mappedChoice]: true };
        setTestedGestures(updated);

        // Check if all 4 completed
        if (Object.values(updated).filter(Boolean).length === 4) {
          sounds.playVictory();
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        }
      }
    } else {
      setActiveChoice(null);
    }
  };

  const steps: { key: ChoiceKey; title: string; count: string; desc: string; emoji: string }[] = [
    {
      key: 'A',
      title: 'Đáp án A',
      count: '1 ngón tay',
      desc: 'Giơ 1 ngón trỏ hoặc bất kỳ ngón nào thẳng lên',
      emoji: '☝️',
    },
    {
      key: 'B',
      title: 'Đáp án B',
      count: '2 ngón tay',
      desc: 'Giơ 2 ngón hình chữ V (ngón trỏ và ngón giữa)',
      emoji: '✌️',
    },
    {
      key: 'C',
      title: 'Đáp án C',
      count: '3 ngón tay',
      desc: 'Giơ 3 ngón tay hướng lên phía camera',
      emoji: '🤟',
    },
    {
      key: 'D',
      title: 'Đáp án D',
      count: '5 ngón tay',
      desc: 'Xòe trọn vẹn cả 5 ngón bàn tay',
      emoji: '🖐️',
    },
  ];

  const completedCount = Object.values(testedGestures).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-400" />
              Luyện Tập & Kiểm Tra Cử Chỉ Bàn Tay
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Thử giơ lần lượt 1, 2, 3 và 5 ngón tay để kiểm tra độ nhận diện camera
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* Left: Camera Preview */}
          <div className="space-y-3">
            <CameraView
              onFingerDetected={handleFingerDetected}
              activeChoice={activeChoice}
              holdProgress={0}
              isLocked={false}
              className="w-full"
            />
            {currentResult && currentResult.hintText && (
              <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs text-center font-medium">
                💡 {currentResult.hintText}
              </div>
            )}
          </div>

          {/* Right: Step checklist */}
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60">
              <span className="text-sm font-bold text-slate-300">Tiến độ làm quen:</span>
              <span className="text-sm font-black text-indigo-400">
                {completedCount} / 4 cử chỉ
              </span>
            </div>

            <div className="space-y-2.5">
              {steps.map((st) => {
                const isDone = testedGestures[st.key];
                const isCurrent = activeChoice === st.key;

                return (
                  <div
                    key={st.key}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                      isDone
                        ? 'bg-emerald-950/40 border-emerald-500/60 text-white'
                        : isCurrent
                        ? 'bg-indigo-950/40 border-indigo-500 text-white ring-2 ring-indigo-500/30'
                        : 'bg-slate-800/40 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{st.emoji}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-sm">{st.title}</span>
                          <span className="text-xs px-2 py-0.5 rounded-md bg-white/10 text-slate-200 font-semibold">
                            {st.count}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{st.desc}</p>
                      </div>
                    </div>

                    <div>
                      {isDone ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="w-6 h-6 text-slate-600 shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {completedCount === 4 && (
              <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/60 text-center animate-bounce">
                <div className="flex items-center justify-center gap-2 text-emerald-300 font-black text-base">
                  <Award className="w-5 h-5" />
                  Bạn đã sẵn sàng tham gia thử thách!
                </div>
                <p className="text-xs text-emerald-200 mt-1">
                  Camera nhận diện hoàn hảo. Bấm nút bên dưới để bắt đầu chơi.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition shadow-lg shadow-indigo-600/30"
          >
            Sẵn sàng vào thi đấu
          </button>
        </div>
      </div>
    </div>
  );
};
