import React, { useEffect } from 'react';
import { Trophy, RotateCcw, Edit3, CheckCircle, XCircle, Clock, Award } from 'lucide-react';
import { AnswerRecord } from '../types/quiz';
import confetti from 'canvas-confetti';
import { sounds } from '../services/soundEffects';

interface ResultModalProps {
  isOpen: boolean;
  score: number;
  totalQuestions: number;
  records: AnswerRecord[];
  onRestart: () => void;
  onOpenQuestionManager: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  isOpen,
  score,
  totalQuestions,
  records,
  onRestart,
  onOpenQuestionManager,
}) => {
  useEffect(() => {
    if (isOpen) {
      const percentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;
      if (percentage >= 60) {
        sounds.playVictory();
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.5 },
        });
      } else {
        sounds.playIncorrect();
      }
    }
  }, [isOpen, score, totalQuestions]);

  if (!isOpen) return null;

  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  const timeoutCount = records.filter((r) => r.userAnswer === 'TIMEOUT').length;
  const wrongCount = records.filter((r) => !r.isCorrect && r.userAnswer !== 'TIMEOUT').length;

  let title = 'Tuyệt vời!';
  let subtitle = 'Bạn có phản xạ cử chỉ cực nhanh và chính xác!';
  if (percentage < 50) {
    title = 'Cố gắng lên nhé!';
    subtitle = 'Luyện tập thêm cử chỉ và đọc nhanh câu hỏi để đạt điểm tối đa.';
  } else if (percentage < 80) {
    title = 'Làm rất tốt!';
    subtitle = 'Kết quả xuất sắc, phản xạ rất tốt!';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header Hero */}
        <div className="p-6 text-center bg-gradient-to-b from-indigo-950/60 to-slate-900 border-b border-slate-800">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/20 text-amber-400 mb-3 border border-amber-500/30">
            <Trophy className="w-10 h-10" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">{title}</h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-md mx-auto">{subtitle}</p>

          {/* Big Score Card */}
          <div className="mt-5 grid grid-cols-3 gap-2.5 max-w-md mx-auto">
            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
              <span className="block text-2xl sm:text-3xl font-black text-emerald-400 tabular-nums">
                {score} / {totalQuestions}
              </span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Câu trả lời đúng
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
              <span className="block text-2xl sm:text-3xl font-black text-indigo-400 tabular-nums">
                {percentage}%
              </span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Độ chính xác
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
              <span className="block text-2xl sm:text-3xl font-black text-amber-400 tabular-nums">
                {score * 100}
              </span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Tổng điểm
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown list */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Chi tiết từng câu hỏi (Thời gian giới hạn: 10s)
          </h3>

          <div className="space-y-2">
            {records.map((rec, idx) => (
              <div
                key={rec.questionId || idx}
                className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs sm:text-sm ${
                  rec.isCorrect
                    ? 'bg-emerald-950/30 border-emerald-500/40'
                    : rec.userAnswer === 'TIMEOUT'
                    ? 'bg-amber-950/30 border-amber-500/40'
                    : 'bg-rose-950/30 border-rose-500/40'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="truncate">
                    <p className="text-white font-medium truncate">{rec.question}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                      <span>
                        Bạn chọn:{' '}
                        <strong className="text-white">
                          {rec.userAnswer === 'TIMEOUT' ? 'Hết giờ (10s)' : rec.userAnswer}
                        </strong>
                      </span>
                      {!rec.isCorrect && (
                        <span>
                          • Đáp án đúng:{' '}
                          <strong className="text-emerald-400">{rec.correctAnswer}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400">
                    {rec.timeSpentSeconds.toFixed(1)}s
                  </span>
                  {rec.isCorrect ? (
                    <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-xs flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> +100
                    </span>
                  ) : rec.userAnswer === 'TIMEOUT' ? (
                    <span className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> 0đ
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 font-bold text-xs flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> 0đ
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            onClick={onOpenQuestionManager}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-bold flex items-center gap-2 border border-slate-700 transition"
          >
            <Edit3 className="w-4 h-4 text-indigo-400" />
            Nhập / Sửa câu hỏi
          </button>

          <button
            onClick={onRestart}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition"
          >
            <RotateCcw className="w-4 h-4" />
            Chơi lại ngay
          </button>
        </div>
      </div>
    </div>
  );
};
