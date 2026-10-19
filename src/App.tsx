import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Settings,
  HelpCircle,
  Clock,
  Award,
  Zap,
  CheckCircle2,
  XCircle,
  Pause,
  AlertCircle,
  Hand,
  BookOpen,
} from 'lucide-react';
import { CameraView } from './components/CameraView';
import { OptionCard } from './components/OptionCard';
import { TimerBar } from './components/TimerBar';
import { QuestionManagerModal } from './components/QuestionManagerModal';
import { PracticeModal } from './components/PracticeModal';
import { ResultModal } from './components/ResultModal';
import { FingerCountResult } from './services/handDetector';
import { ChoiceKey, QuizQuestion, AnswerRecord } from './types/quiz';
import { getStoredQuestions, saveStoredQuestions } from './data/defaultQuestions';
import { sounds } from './services/soundEffects';
import confetti from 'canvas-confetti';

type GameState = 'TITLE' | 'PLAYING' | 'REVEAL' | 'PAUSED' | 'FINISHED';

const QUESTION_TIME_LIMIT = 10.0; // 10 seconds per question as requested
const HOLD_TIME_REQUIRED = 0.85; // 0.85s steady hold to lock-in answer

export default function App() {
  // Questions list loaded from localStorage or default bank
  const [questions, setQuestions] = useState<QuizQuestion[]>(() => getStoredQuestions());

  // Game flow states
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [records, setRecords] = useState<AnswerRecord[]>([]);

  // 10-second Timer state
  const [timeLeft, setTimeLeft] = useState<number>(QUESTION_TIME_LIMIT);
  const timerIntervalRef = useRef<number | null>(null);

  // Gesture hold state
  const [candidateChoice, setCandidateChoice] = useState<ChoiceKey | null>(null);
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [selectedChoice, setSelectedChoice] = useState<ChoiceKey | 'TIMEOUT' | null>(null);
  const holdStartTimeRef = useRef<number | null>(null);
  const lastCandidateRef = useRef<ChoiceKey | null>(null);
  const lastSoundProgressRef = useRef<number>(0);

  // Sound & Modals
  const [isMuted, setIsMuted] = useState<boolean>(() => sounds.getMuted());
  const [showQuestionManager, setShowQuestionManager] = useState<boolean>(false);
  const [showPracticeModal, setShowPracticeModal] = useState<boolean>(false);

  // UI layout preference (Mini camera or standard side-by-side)
  const [isMiniCam, setIsMiniCam] = useState<boolean>(false);

  const currentQuestion = questions[currentQIndex] || null;

  // Sync questions to localStorage when updated
  const handleSaveQuestions = (newQuestions: QuizQuestion[]) => {
    setQuestions(newQuestions);
    saveStoredQuestions(newQuestions);
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const nextMute = sounds.toggleMute();
    setIsMuted(nextMute);
  };

  // Start new game
  const startGame = () => {
    if (questions.length === 0) {
      alert('Chưa có câu hỏi nào. Vui lòng bấm Quản lý câu hỏi để thêm ít nhất 1 câu.');
      setShowQuestionManager(true);
      return;
    }
    setCurrentQIndex(0);
    setScore(0);
    setRecords([]);
    setSelectedChoice(null);
    setCandidateChoice(null);
    setHoldProgress(0);
    setTimeLeft(QUESTION_TIME_LIMIT);
    setGameState('PLAYING');
    sounds.playLockIn();
  };

  // Restart current game
  const restartGame = () => {
    startGame();
  };

  // Finish current question and transition
  const finalizeQuestion = useCallback(
    (userChoice: ChoiceKey | 'TIMEOUT') => {
      if (!currentQuestion) return;

      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      setSelectedChoice(userChoice);

      const isCorrect = userChoice === currentQuestion.correctAnswer;
      const points = isCorrect ? 100 : 0;
      const timeSpent = Math.max(0, QUESTION_TIME_LIMIT - timeLeft);

      if (isCorrect) {
        sounds.playCorrect();
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
        setScore((prev) => prev + 1);
      } else {
        sounds.playIncorrect();
      }

      const newRecord: AnswerRecord = {
        questionId: currentQuestion.id,
        question: currentQuestion.question,
        userAnswer: userChoice,
        correctAnswer: currentQuestion.correctAnswer,
        isCorrect,
        timeSpentSeconds: timeSpent,
        pointsEarned: points,
      };

      setRecords((prev) => [...prev, newRecord]);
      setGameState('REVEAL');

      // Automatically advance after brief explanation review (2.2 seconds)
      setTimeout(() => {
        setGameState((currentGs) => {
          if (currentGs !== 'REVEAL') return currentGs;

          if (currentQIndex + 1 < questions.length) {
            setCurrentQIndex((idx) => idx + 1);
            setSelectedChoice(null);
            setCandidateChoice(null);
            setHoldProgress(0);
            setTimeLeft(QUESTION_TIME_LIMIT);
            return 'PLAYING';
          } else {
            return 'FINISHED';
          }
        });
      }, 2300);
    },
    [currentQuestion, currentQIndex, questions.length, timeLeft]
  );

  // Lock in candidate choice
  const lockInChoice = useCallback(
    (choice: ChoiceKey) => {
      if (gameState !== 'PLAYING') return;
      setSelectedChoice(choice);
      sounds.playLockIn();
      finalizeQuestion(choice);
    },
    [gameState, finalizeQuestion]
  );

  // 10-second countdown timer loop
  useEffect(() => {
    if (gameState !== 'PLAYING') {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    const intervalTimeMs = 100;
    const interval = window.setInterval(() => {
      setTimeLeft((prev) => {
        const nextTime = Math.max(0, prev - intervalTimeMs / 1000);

        // Sound cues for last 3 seconds
        if (nextTime <= 3.0 && nextTime > 0 && Math.floor(prev) !== Math.floor(nextTime)) {
          sounds.playTimerTick();
        }

        if (nextTime <= 0) {
          // Time's up! 0 points for this question
          clearInterval(interval);
          finalizeQuestion('TIMEOUT');
          return 0;
        }
        return nextTime;
      });
    }, intervalTimeMs);

    timerIntervalRef.current = interval;

    return () => {
      clearInterval(interval);
    };
  }, [gameState, finalizeQuestion]);

  // Handle incoming camera finger gestures
  const handleFingerDetected = useCallback(
    (result: FingerCountResult | null) => {
      if (gameState !== 'PLAYING') {
        setHoldProgress(0);
        return;
      }

      const mapped = result ? result.mappedChoice : null;

      if (!mapped) {
        // No gesture or invalid count
        lastCandidateRef.current = null;
        holdStartTimeRef.current = null;
        setCandidateChoice(null);
        setHoldProgress(0);
        return;
      }

      const now = performance.now();

      // If switched choice, reset timer
      if (lastCandidateRef.current !== mapped) {
        lastCandidateRef.current = mapped;
        holdStartTimeRef.current = now;
        lastSoundProgressRef.current = 0;
        setCandidateChoice(mapped);
        setHoldProgress(0.05);
        sounds.playDetect();
        return;
      }

      // Holding same choice
      if (holdStartTimeRef.current) {
        const elapsed = (now - holdStartTimeRef.current) / 1000;
        const progress = Math.min(1, elapsed / HOLD_TIME_REQUIRED);
        setHoldProgress(progress);

        // Tick sounds as charge progresses
        if (progress - lastSoundProgressRef.current > 0.25) {
          lastSoundProgressRef.current = progress;
          sounds.playHoldTick(progress);
        }

        if (progress >= 1.0) {
          // Successfully locked in via finger gesture!
          holdStartTimeRef.current = null;
          lastCandidateRef.current = null;
          setHoldProgress(1.0);
          lockInChoice(mapped);
        }
      } else {
        holdStartTimeRef.current = now;
      }
    },
    [gameState, lockInChoice]
  );

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === ' ' || e.key === 'Enter') {
        if (gameState === 'TITLE') {
          startGame();
          e.preventDefault();
        } else if (gameState === 'FINISHED') {
          restartGame();
          e.preventDefault();
        }
      } else if (e.key === 'Escape') {
        if (gameState === 'PLAYING') {
          setGameState('PAUSED');
        } else if (gameState === 'PAUSED') {
          setGameState('PLAYING');
        }
      } else if (gameState === 'PLAYING') {
        if (e.key === '1' || e.key === 'a' || e.key === 'A') {
          lockInChoice('A');
        } else if (e.key === '2' || e.key === 'b' || e.key === 'B') {
          lockInChoice('B');
        } else if (e.key === '3' || e.key === 'c' || e.key === 'C') {
          lockInChoice('C');
        } else if (e.key === '4' || e.key === '5' || e.key === 'd' || e.key === 'D') {
          lockInChoice('D');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, lockInChoice]);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col font-sans select-none relative overflow-x-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Persistent Navigation Header */}
      <header className="w-full border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Hand className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-black text-lg sm:text-xl tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
              FingerQuiz
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Trắc nghiệm cử chỉ tay qua Camera</p>
          </div>
        </div>

        {/* Global Action cluster */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowQuestionManager(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition"
            title="Tự nhập hoặc chỉnh sửa câu hỏi"
          >
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Quản lý câu hỏi</span>
            <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[10px]">
              {questions.length}
            </span>
          </button>

          <button
            onClick={() => setShowPracticeModal(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition"
            title="Luyện tập & kiểm tra cử chỉ camera"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Luyện cử chỉ</span>
          </button>

          <button
            onClick={handleToggleMute}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col p-3 sm:p-6 max-w-7xl mx-auto w-full relative z-10">
        {/* ========================================================================= */}
        {/* VIEW 1: TITLE SCREEN */}
        {/* ========================================================================= */}
        {gameState === 'TITLE' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center max-w-3xl mx-auto py-6">
            {/* Gesture Mapping Visual Banner */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-950/70 border border-indigo-500/40 text-indigo-300 text-xs sm:text-sm font-semibold mb-6 shadow-lg animate-pulse-ring">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Cử chỉ điều khiển thông minh không cần chạm</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Trả lời Trắc nghiệm bằng{' '}
              <span className="bg-gradient-to-r from-rose-400 via-amber-300 to-emerald-400 bg-clip-text text-transparent">
                Ngón Tay Trước Camera
              </span>
            </h2>

            <p className="mt-4 text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
              Học sinh trả lời bằng cách giơ ngón tay: Giơ 1 ngón chọn <strong>A</strong>, 2 ngón chọn{' '}
              <strong>B</strong>, 3 ngón chọn <strong>C</strong>, và 5 ngón chọn <strong>D</strong>!
            </p>

            {/* 10-Second rule banner */}
            <div className="mt-5 p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs sm:text-sm max-w-lg flex items-center gap-3 text-left">
              <Clock className="w-6 h-6 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-white block">Luật chơi tính giờ: 10 giây / câu</span>
                Trả lời đúng trong 10 giây để nhận điểm. Hết 10 giây hoặc chọn sai sẽ nhận 0 điểm!
              </div>
            </div>

            {/* Gestures Cards Demonstration */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-8 w-full max-w-2xl">
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-rose-500/40 shadow-lg shadow-rose-500/10 flex flex-col items-center">
                <span className="text-3xl mb-1">☝️</span>
                <span className="text-base font-black text-rose-400">Câu A</span>
                <span className="text-xs text-slate-400 font-medium">Giơ 1 ngón</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-blue-500/40 shadow-lg shadow-blue-500/10 flex flex-col items-center">
                <span className="text-3xl mb-1">✌️</span>
                <span className="text-base font-black text-blue-400">Câu B</span>
                <span className="text-xs text-slate-400 font-medium">Giơ 2 ngón</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-amber-500/40 shadow-lg shadow-amber-500/10 flex flex-col items-center">
                <span className="text-3xl mb-1">🤟</span>
                <span className="text-base font-black text-amber-400">Câu C</span>
                <span className="text-xs text-slate-400 font-medium">Giơ 3 ngón</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-emerald-500/40 shadow-lg shadow-emerald-500/10 flex flex-col items-center">
                <span className="text-3xl mb-1">🖐️</span>
                <span className="text-base font-black text-emerald-400">Câu D</span>
                <span className="text-xs text-slate-400 font-medium">Giơ 5 ngón</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
              <button
                onClick={startGame}
                className="w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-extrabold text-lg shadow-xl shadow-indigo-600/40 flex items-center justify-center gap-3 transition transform active:scale-95 cursor-pointer"
              >
                <Play className="w-6 h-6 fill-current" />
                Bắt đầu chơi ngay (Phím Space)
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
              <button
                onClick={() => setShowQuestionManager(true)}
                className="hover:text-indigo-400 underline underline-offset-4 cursor-pointer"
              >
                ✍️ Tự nhập câu hỏi của bạn ({questions.length} câu đã sẵn sàng)
              </button>
              <span>•</span>
              <button
                onClick={() => setShowPracticeModal(true)}
                className="hover:text-amber-400 underline underline-offset-4 cursor-pointer"
              >
                🎯 Luyện tập cử chỉ trước
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2 & 3: PLAYING & REVEAL SCREEN */}
        {/* ========================================================================= */}
        {(gameState === 'PLAYING' || gameState === 'REVEAL') && currentQuestion && (
          <div className="flex-1 flex flex-col lg:flex-row gap-5 items-stretch">
            {/* Left Area: Quiz Arena */}
            <div className="flex-1 flex flex-col justify-between space-y-4">
              {/* Question status bar */}
              <div className="flex items-center justify-between bg-slate-900/80 backdrop-blur-sm p-3.5 rounded-2xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-xl bg-indigo-600/30 text-indigo-300 text-xs font-black border border-indigo-500/30">
                    CÂU {currentQIndex + 1} / {questions.length}
                  </span>
                  {currentQuestion.category && (
                    <span className="text-xs font-semibold text-slate-400">
                      Chủ đề: <strong className="text-slate-200">{currentQuestion.category}</strong>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-950/40 px-3 py-1 rounded-xl border border-amber-500/30">
                    <Award className="w-4 h-4" />
                    <span>{score * 100} điểm</span>
                  </div>

                  <button
                    onClick={() => setGameState('PAUSED')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                    title="Tạm dừng"
                  >
                    <Pause className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 10-Second Countdown Timer Bar */}
              <div className="bg-slate-900/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-800">
                <TimerBar
                  timeLeft={timeLeft}
                  totalTime={QUESTION_TIME_LIMIT}
                  isActive={gameState === 'PLAYING'}
                />
              </div>

              {/* Question Box */}
              <div className="p-5 sm:p-6 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-xl flex-1 flex flex-col justify-center min-h-[140px] relative overflow-hidden">
                {/* Reveal state banner on top */}
                {gameState === 'REVEAL' && (
                  <div
                    className={`absolute inset-x-0 top-0 py-1.5 text-center text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                      selectedChoice === currentQuestion.correctAnswer
                        ? 'bg-emerald-500 text-white shadow-md'
                        : selectedChoice === 'TIMEOUT'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'bg-rose-500 text-white shadow-md'
                    }`}
                  >
                    {selectedChoice === currentQuestion.correctAnswer ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Chính xác! (+100 điểm)
                      </>
                    ) : selectedChoice === 'TIMEOUT' ? (
                      <>
                        <Clock className="w-4 h-4" /> Hết giờ 10 giây! (0 điểm)
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" /> Chưa chính xác! (0 điểm)
                      </>
                    )}
                  </div>
                )}

                <h3 className="text-lg sm:text-2xl font-extrabold text-white leading-snug">
                  {currentQuestion.question}
                </h3>

                {/* Explanation text in reveal mode */}
                {gameState === 'REVEAL' && currentQuestion.explanation && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-slate-700/60 text-xs sm:text-sm text-slate-300">
                    💡 <strong>Giải thích:</strong> {currentQuestion.explanation}
                  </div>
                )}
              </div>

              {/* 4 Choices Grid (A, B, C, D) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <OptionCard
                  choiceKey="A"
                  text={currentQuestion.options.A}
                  fingerCount={1}
                  gestureEmoji="☝️"
                  isHoveredOrDetected={candidateChoice === 'A'}
                  holdProgress={candidateChoice === 'A' ? holdProgress : 0}
                  isSelected={selectedChoice === 'A'}
                  isRevealed={gameState === 'REVEAL'}
                  isCorrect={currentQuestion.correctAnswer === 'A'}
                  onClick={() => lockInChoice('A')}
                  disabled={gameState !== 'PLAYING'}
                />

                <OptionCard
                  choiceKey="B"
                  text={currentQuestion.options.B}
                  fingerCount={2}
                  gestureEmoji="✌️"
                  isHoveredOrDetected={candidateChoice === 'B'}
                  holdProgress={candidateChoice === 'B' ? holdProgress : 0}
                  isSelected={selectedChoice === 'B'}
                  isRevealed={gameState === 'REVEAL'}
                  isCorrect={currentQuestion.correctAnswer === 'B'}
                  onClick={() => lockInChoice('B')}
                  disabled={gameState !== 'PLAYING'}
                />

                <OptionCard
                  choiceKey="C"
                  text={currentQuestion.options.C}
                  fingerCount={3}
                  gestureEmoji="🤟"
                  isHoveredOrDetected={candidateChoice === 'C'}
                  holdProgress={candidateChoice === 'C' ? holdProgress : 0}
                  isSelected={selectedChoice === 'C'}
                  isRevealed={gameState === 'REVEAL'}
                  isCorrect={currentQuestion.correctAnswer === 'C'}
                  onClick={() => lockInChoice('C')}
                  disabled={gameState !== 'PLAYING'}
                />

                <OptionCard
                  choiceKey="D"
                  text={currentQuestion.options.D}
                  fingerCount={5}
                  gestureEmoji="🖐️"
                  isHoveredOrDetected={candidateChoice === 'D'}
                  holdProgress={candidateChoice === 'D' ? holdProgress : 0}
                  isSelected={selectedChoice === 'D'}
                  isRevealed={gameState === 'REVEAL'}
                  isCorrect={currentQuestion.correctAnswer === 'D'}
                  onClick={() => lockInChoice('D')}
                  disabled={gameState !== 'PLAYING'}
                />
              </div>
            </div>

            {/* Right Area: Interactive Camera & Gesture Tracker */}
            <div className="w-full lg:w-96 shrink-0 flex flex-col space-y-3">
              <CameraView
                onFingerDetected={handleFingerDetected}
                activeChoice={candidateChoice}
                holdProgress={holdProgress}
                isLocked={gameState === 'REVEAL'}
                className="w-full shadow-2xl"
              />

              {/* Gesture Quick Helper Card */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-2">
                <span className="font-bold text-white block">Hướng dẫn giơ tay:</span>
                <ul className="space-y-1.5 text-slate-400">
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center text-[10px]">
                      A
                    </span>
                    <span>
                      Giơ <strong>1 ngón</strong> trỏ hướng lên
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-[10px]">
                      B
                    </span>
                    <span>
                      Giơ <strong>2 ngón</strong> chữ V
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[10px]">
                      C
                    </span>
                    <span>
                      Giơ <strong>3 ngón</strong> tay
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">
                      D
                    </span>
                    <span>
                      Xòe <strong>5 ngón</strong> trọn bàn tay
                    </span>
                  </li>
                </ul>
                <p className="text-[11px] text-indigo-300 pt-1 border-t border-slate-800 italic">
                  💡 Giữ yên cử chỉ khoảng 0.8 giây để khóa đáp án (hoặc bấm trực tiếp/dùng phím 1-4).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 4: PAUSED SCREEN OVERLAY */}
        {/* ========================================================================= */}
        {gameState === 'PAUSED' && (
          <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-700 max-w-sm w-full text-center space-y-4 shadow-2xl">
              <h3 className="text-2xl font-black text-white">Tạm Dừng Trò Chơi</h3>
              <p className="text-xs text-slate-400">Thời gian 10s đang được tạm dừng.</p>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => setGameState('PLAYING')}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition shadow-lg shadow-indigo-600/30"
                >
                  Tiếp tục chơi
                </button>
                <button
                  onClick={restartGame}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition"
                >
                  Chơi lại từ đầu
                </button>
                <button
                  onClick={() => setGameState('TITLE')}
                  className="w-full py-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 font-bold text-sm transition"
                >
                  Về màn hình chính
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODALS: Question Manager, Practice, Results */}
      {/* ========================================================================= */}
      <QuestionManagerModal
        isOpen={showQuestionManager}
        onClose={() => setShowQuestionManager(false)}
        questions={questions}
        onSaveQuestions={handleSaveQuestions}
      />

      <PracticeModal isOpen={showPracticeModal} onClose={() => setShowPracticeModal(false)} />

      <ResultModal
        isOpen={gameState === 'FINISHED'}
        score={score}
        totalQuestions={questions.length}
        records={records}
        onRestart={restartGame}
        onOpenQuestionManager={() => {
          setGameState('TITLE');
          setShowQuestionManager(true);
        }}
      />
    </div>
  );
}
