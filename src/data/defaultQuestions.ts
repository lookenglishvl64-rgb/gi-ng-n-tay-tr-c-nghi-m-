import { QuizQuestion } from '../types/quiz';

export const DEFAULT_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'Hành tinh nào gần Mặt Trời nhất trong Hệ Mặt Trời?',
    options: {
      A: 'Sao Hỏa',
      B: 'Sao Kim',
      C: 'Sao Thủy',
      D: 'Trái Đất',
    },
    correctAnswer: 'C',
    explanation: 'Sao Thủy (Mercury) là hành tinh nằm gần Mặt Trời nhất.',
    category: 'Khoa học',
  },
  {
    id: 'q2',
    question: 'Kết quả của phép tính: 5 + 5 x 2 là bao nhiêu?',
    options: {
      A: '20',
      B: '15',
      C: '25',
      D: '10',
    },
    correctAnswer: 'B',
    explanation: 'Theo thứ tự ưu tiên: nhân chia trước, cộng trừ sau. 5 x 2 = 10, sau đó 5 + 10 = 15.',
    category: 'Toán học',
  },
  {
    id: 'q3',
    question: 'Từ tiếng Anh nào có nghĩa là "Con mèo"?',
    options: {
      A: 'Cat',
      B: 'Dog',
      C: 'Bird',
      D: 'Fish',
    },
    correctAnswer: 'A',
    explanation: '"Cat" là con mèo. Dog là chó, Bird là chim, Fish là cá.',
    category: 'Tiếng Anh',
  },
  {
    id: 'q4',
    question: 'Thủ đô của nước Việt Nam là thành phố nào?',
    options: {
      A: 'Đà Nẵng',
      B: 'Huế',
      C: 'Hải Phòng',
      D: 'Hà Nội',
    },
    correctAnswer: 'D',
    explanation: 'Hà Nội là thủ đô ngàn năm văn hiến của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam.',
    category: 'Địa lý',
  },
  {
    id: 'q5',
    question: 'Loài động vật nào được mệnh danh là "Chúa sơn lâm"?',
    options: {
      A: 'Báo hoa mai',
      B: 'Hổ (Cọp)',
      C: 'Sư tử',
      D: 'Gấu xám',
    },
    correctAnswer: 'B',
    explanation: 'Ở châu Á và văn hóa Việt Nam, Hổ thường được tôn xưng là Chúa sơn lâm.',
    category: 'Tự nhiên',
  },
  {
    id: 'q6',
    question: 'Một hình vuông có cạnh dài 6cm thì diện tích bằng bao nhiêu?',
    options: {
      A: '24 cm²',
      B: '30 cm²',
      C: '36 cm²',
      D: '12 cm²',
    },
    correctAnswer: 'C',
    explanation: 'Diện tích hình vuông = cạnh x cạnh = 6 x 6 = 36 cm².',
    category: 'Toán học',
  },
  {
    id: 'q7',
    question: 'Mặt trời mọc ở hướng nào vào buổi sáng?',
    options: {
      A: 'Hướng Tây',
      B: 'Hướng Đông',
      C: 'Hướng Bắc',
      D: 'Hướng Nam',
    },
    correctAnswer: 'B',
    explanation: 'Do Trái Đất tự quay quanh trục từ Tây sang Đông, Mặt Trời luôn mọc ở hướng Đông.',
    category: 'Tự nhiên',
  },
  {
    id: 'q8',
    question: 'Cơ quan nào trong cơ thể người làm nhiệm vụ bơm máu đi khắp cơ thể?',
    options: {
      A: 'Phổi',
      B: 'Dạ dày',
      C: 'Não',
      D: 'Tim',
    },
    correctAnswer: 'D',
    explanation: 'Trái tim hoạt động như một chiếc máy bơm tuần hoàn máu nuôi dưỡng toàn bộ cơ thể.',
    category: 'Sinh học',
  },
];

const STORAGE_KEY = 'fingerquiz_custom_questions_v1';

export function getStoredQuestions(): QuizQuestion[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading stored questions:', e);
  }
  return DEFAULT_QUESTIONS;
}

export function saveStoredQuestions(questions: QuizQuestion[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
  } catch (e) {
    console.error('Error saving stored questions:', e);
  }
}

export function resetToDefaultQuestions(): QuizQuestion[] {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Error resetting questions:', e);
  }
  return DEFAULT_QUESTIONS;
}

/**
 * Text parser for quick question import
 * Supports format:
 * 1. Câu hỏi?
 * A. Đáp án 1
 * B. Đáp án 2
 * C. Đáp án 3
 * D. Đáp án 4
 * Đáp án: A
 */
export function parseQuestionsFromText(text: string): QuizQuestion[] {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const questions: QuizQuestion[] = [];

  let currentQ: Partial<QuizQuestion> = {};
  let options: Partial<Record<'A' | 'B' | 'C' | 'D', string>> = {};

  const commitCurrent = () => {
    if (
      currentQ.question &&
      options.A &&
      options.B &&
      options.C &&
      options.D &&
      currentQ.correctAnswer
    ) {
      questions.push({
        id: 'user_q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        question: currentQ.question,
        options: {
          A: options.A,
          B: options.B,
          C: options.C,
          D: options.D,
        },
        correctAnswer: currentQ.correctAnswer,
        explanation: currentQ.explanation || '',
        category: 'Tự tạo',
      });
    }
    currentQ = {};
    options = {};
  };

  for (const line of lines) {
    const matchQ = line.match(/^(?:Câu\s*\d+[:.]|\d+[:.])\s*(.+)/i);
    const matchA = line.match(/^[Aa][:.)\-]\s*(.+)/);
    const matchB = line.match(/^[Bb][:.)\-]\s*(.+)/);
    const matchC = line.match(/^[Cc][:.)\-]\s*(.+)/);
    const matchD = line.match(/^[Dd][:.)\-]\s*(.+)/);
    const matchAns = line.match(/^(?:Đáp án|ĐA|Answer|Key)[:.]\s*([ABCDabcd])/i);
    const matchExp = line.match(/^(?:Giải thích|Ghi chú|Note)[:.]\s*(.+)/i);

    if (matchQ) {
      if (currentQ.question) {
        commitCurrent();
      }
      currentQ.question = matchQ[1].trim();
    } else if (matchA) {
      options.A = matchA[1].trim();
    } else if (matchB) {
      options.B = matchB[1].trim();
    } else if (matchC) {
      options.C = matchC[1].trim();
    } else if (matchD) {
      options.D = matchD[1].trim();
    } else if (matchAns) {
      currentQ.correctAnswer = matchAns[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
    } else if (matchExp) {
      currentQ.explanation = matchExp[1].trim();
    } else if (!currentQ.question && !line.startsWith('A.') && !line.startsWith('B.')) {
      currentQ.question = line;
    }
  }

  commitCurrent();
  return questions;
}
