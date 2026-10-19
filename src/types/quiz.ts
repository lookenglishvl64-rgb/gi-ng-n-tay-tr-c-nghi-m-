export type ChoiceKey = 'A' | 'B' | 'C' | 'D';

export interface QuizQuestion {
  id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: ChoiceKey;
  explanation?: string;
  category?: string;
}

export interface AnswerRecord {
  questionId: string;
  question: string;
  userAnswer: ChoiceKey | 'TIMEOUT' | null;
  correctAnswer: ChoiceKey;
  isCorrect: boolean;
  timeSpentSeconds: number;
  pointsEarned: number;
}

export interface QuizSettings {
  timePerQuestion: number; // default 10 seconds
  holdTimeSeconds: number; // e.g., 0.9s to confirm gesture
  soundEnabled: boolean;
  showSkeleton: boolean;
  flipCamera: boolean;
}
