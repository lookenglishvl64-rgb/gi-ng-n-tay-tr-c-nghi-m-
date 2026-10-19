import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  FileText,
  Upload,
  Download,
  RotateCcw,
  CheckCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { QuizQuestion, ChoiceKey } from '../types/quiz';
import { parseQuestionsFromText, resetToDefaultQuestions } from '../data/defaultQuestions';

interface QuestionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: QuizQuestion[];
  onSaveQuestions: (newQuestions: QuizQuestion[]) => void;
}

const SAMPLE_PASTE_TEXT = `1. Thủ đô của Nhật Bản là thành phố nào?
A. Seoul
B. Bắc Kinh
C. Tokyo
D. Bangkok
Đáp án: C
Giải thích: Tokyo là thủ đô hiện tại và trung tâm kinh tế sầm uất của Nhật Bản.

2. Phép tính 12 x 3 có kết quả là bao nhiêu?
A. 36
B. 32
C. 48
D. 24
Đáp án: A
Giải thích: 12 nhân 3 bằng 36.

3. Khí nào chiếm thể tích lớn nhất trong bầu khí quyển Trái Đất?
A. Khí Ô-xi (O2)
B. Khí Nitơ (N2)
C. Khí CO2
D. Khí Hiđrô
Đáp án: B
Giải thích: Khí Nitơ chiếm khoảng 78% thể tích bầu khí quyển.`;

export const QuestionManagerModal: React.FC<QuestionManagerModalProps> = ({
  isOpen,
  onClose,
  questions,
  onSaveQuestions,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'quick_paste' | 'single_form'>('list');

  // Quick Paste text state
  const [pasteText, setPasteText] = useState<string>('');
  const [pasteMessage, setPasteMessage] = useState<{ text: string; success: boolean } | null>(null);

  // Single form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formQuestion, setFormQuestion] = useState<string>('');
  const [formA, setFormA] = useState<string>('');
  const [formB, setFormB] = useState<string>('');
  const [formC, setFormC] = useState<string>('');
  const [formD, setFormD] = useState<string>('');
  const [formCorrect, setFormCorrect] = useState<ChoiceKey>('A');
  const [formExplanation, setFormExplanation] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('Tự chọn');

  if (!isOpen) return null;

  // Handle Quick Paste Import
  const handleImportText = (replaceMode: boolean) => {
    if (!pasteText.trim()) {
      setPasteMessage({ text: 'Vui lòng dán nội dung câu hỏi trước.', success: false });
      return;
    }

    const parsed = parseQuestionsFromText(pasteText);
    if (parsed.length === 0) {
      setPasteMessage({
        text: 'Không nhận diện được câu hỏi nào. Vui lòng kiểm tra định dạng theo mẫu hướng dẫn.',
        success: false,
      });
      return;
    }

    let updatedList: QuizQuestion[];
    if (replaceMode) {
      updatedList = parsed;
    } else {
      updatedList = [...questions, ...parsed];
    }

    onSaveQuestions(updatedList);
    setPasteMessage({
      text: `Đã nhập thành công ${parsed.length} câu hỏi mới!`,
      success: true,
    });
    setPasteText('');
    setTimeout(() => {
      setActiveTab('list');
      setPasteMessage(null);
    }, 1200);
  };

  // Handle Single Add/Edit
  const handleSaveSingle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formQuestion.trim() || !formA.trim() || !formB.trim() || !formC.trim() || !formD.trim()) {
      alert('Vui lòng điền đầy đủ câu hỏi và 4 phương án A, B, C, D.');
      return;
    }

    if (editingId) {
      // Edit existing
      const updated = questions.map((q) => {
        if (q.id === editingId) {
          return {
            ...q,
            question: formQuestion.trim(),
            options: {
              A: formA.trim(),
              B: formB.trim(),
              C: formC.trim(),
              D: formD.trim(),
            },
            correctAnswer: formCorrect,
            explanation: formExplanation.trim(),
            category: formCategory.trim() || 'Tự chọn',
          };
        }
        return q;
      });
      onSaveQuestions(updated);
      setEditingId(null);
    } else {
      // Create new
      const newQ: QuizQuestion = {
        id: 'q_' + Date.now(),
        question: formQuestion.trim(),
        options: {
          A: formA.trim(),
          B: formB.trim(),
          C: formC.trim(),
          D: formD.trim(),
        },
        correctAnswer: formCorrect,
        explanation: formExplanation.trim(),
        category: formCategory.trim() || 'Tự chọn',
      };
      onSaveQuestions([...questions, newQ]);
    }

    // Reset form
    setFormQuestion('');
    setFormA('');
    setFormB('');
    setFormC('');
    setFormD('');
    setFormExplanation('');
    setActiveTab('list');
  };

  // Start editing a question
  const startEdit = (q: QuizQuestion) => {
    setEditingId(q.id);
    setFormQuestion(q.question);
    setFormA(q.options.A);
    setFormB(q.options.B);
    setFormC(q.options.C);
    setFormD(q.options.D);
    setFormCorrect(q.correctAnswer);
    setFormExplanation(q.explanation || '');
    setFormCategory(q.category || 'Tự chọn');
    setActiveTab('single_form');
  };

  // Delete a question
  const handleDelete = (id: string) => {
    if (questions.length <= 1) {
      alert('Bạn phải giữ lại ít nhất 1 câu hỏi để chơi.');
      return;
    }
    if (confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) {
      const updated = questions.filter((q) => q.id !== id);
      onSaveQuestions(updated);
    }
  };

  // Reset to default starter set
  const handleResetDefault = () => {
    if (confirm('Khôi phục danh sách câu hỏi mẫu mặc định?')) {
      const def = resetToDefaultQuestions();
      onSaveQuestions(def);
    }
  };

  // Export JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(questions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `fingerquiz_questions_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/80">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-400" />
              Quản lý Câu hỏi Trắc nghiệm
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Bạn có thể tự nhập danh sách câu hỏi hoặc sửa đổi bộ câu hỏi cho học sinh
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('list')}
            className={`py-3 px-4 font-bold text-sm border-b-2 transition flex items-center gap-2 ${
              activeTab === 'list'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Danh sách câu ({questions.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('quick_paste');
              setPasteMessage(null);
            }}
            className={`py-3 px-4 font-bold text-sm border-b-2 transition flex items-center gap-2 ${
              activeTab === 'quick_paste'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            Nhập nhanh dạng văn bản
          </button>
          <button
            onClick={() => {
              setEditingId(null);
              setFormQuestion('');
              setFormA('');
              setFormB('');
              setFormC('');
              setFormD('');
              setFormExplanation('');
              setActiveTab('single_form');
            }}
            className={`py-3 px-4 font-bold text-sm border-b-2 transition flex items-center gap-2 ${
              activeTab === 'single_form'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            {editingId ? 'Chỉnh sửa câu' : 'Thêm từng câu'}
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* TAB 1: LIST */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-800/40 p-3 rounded-2xl border border-slate-800">
                <div className="text-xs sm:text-sm text-slate-300">
                  Tổng cộng: <span className="font-bold text-indigo-400">{questions.length}</span> câu
                  hỏi (mỗi câu 10 giây)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportJSON}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Tải về JSON
                  </button>
                  <button
                    onClick={handleResetDefault}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Khôi phục câu hỏi mẫu
                  </button>
                </div>
              </div>

              {questions.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  Chưa có câu hỏi nào. Vui lòng bấm &quot;Nhập nhanh&quot; hoặc &quot;Thêm câu&quot;.
                </div>
              ) : (
                <div className="grid gap-3">
                  {questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 hover:border-slate-600 transition flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-indigo-600/30 text-indigo-300 text-xs font-bold flex items-center justify-center border border-indigo-500/30">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-white text-base">{q.question}</span>
                          {q.category && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-700/80 text-[11px] text-slate-300">
                              {q.category}
                            </span>
                          )}
                        </div>

                        {/* Options pills */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {(['A', 'B', 'C', 'D'] as ChoiceKey[]).map((key) => {
                            const isCorrect = q.correctAnswer === key;
                            return (
                              <div
                                key={key}
                                className={`p-2 rounded-xl flex items-center gap-2 border ${
                                  isCorrect
                                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200 font-semibold'
                                    : 'bg-slate-900/60 border-slate-800 text-slate-300'
                                }`}
                              >
                                <span
                                  className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] ${
                                    isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-200'
                                  }`}
                                >
                                  {key}
                                </span>
                                <span className="truncate">{q.options[key]}</span>
                              </div>
                            );
                          })}
                        </div>

                        {q.explanation && (
                          <p className="text-xs text-slate-400 italic">
                            💡 Giải thích: {q.explanation}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex sm:flex-col items-center gap-1.5 self-end sm:self-start">
                        <button
                          onClick={() => startEdit(q)}
                          className="p-2 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(q.id)}
                          className="p-2 rounded-xl bg-slate-700/60 hover:bg-rose-900/40 text-slate-300 hover:text-rose-400 transition"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: QUICK PASTE */}
          {activeTab === 'quick_paste' && (
            <div className="space-y-4">
              <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-2xl p-4 text-xs sm:text-sm text-indigo-200 leading-relaxed flex items-start gap-3">
                <HelpCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block mb-1">
                    Hướng dẫn nhập nhanh hàng loạt câu hỏi:
                  </span>
                  Bạn chỉ cần copy danh sách câu hỏi từ Word / Excel / Google Docs và dán vào ô bên
                  dưới theo định dạng:
                  <pre className="mt-2 p-2.5 bg-slate-950/80 rounded-xl text-indigo-300 font-mono text-[11px] overflow-x-auto">
                    {`1. Câu hỏi của bạn?
A. Lựa chọn 1 (1 ngón)
B. Lựa chọn 2 (2 ngón)
C. Lựa chọn 3 (3 ngón)
D. Lựa chọn 4 (5 ngón)
Đáp án: B (hoặc A, C, D)
Giải thích: Tùy chọn...`}
                  </pre>
                </div>
              </div>

              {pasteMessage && (
                <div
                  className={`p-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                    pasteMessage.success
                      ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300'
                      : 'bg-rose-950/80 border border-rose-500/50 text-rose-300'
                  }`}
                >
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  {pasteMessage.text}
                </div>
              )}

              <div className="relative">
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Dán câu hỏi của bạn vào đây..."
                  rows={10}
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-4 text-white font-mono text-xs sm:text-sm focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
                <button
                  type="button"
                  onClick={() => setPasteText(SAMPLE_PASTE_TEXT)}
                  className="absolute bottom-4 right-4 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold border border-slate-700"
                >
                  Dán nội dung mẫu thử
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleImportText(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition border border-slate-700"
                >
                  + Thêm tiếp vào danh sách hiện tại
                </button>
                <button
                  type="button"
                  onClick={() => handleImportText(true)}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition shadow-lg shadow-indigo-600/30"
                >
                  Ghi đè hoàn toàn (Chỉ dùng câu mới)
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SINGLE FORM */}
          {activeTab === 'single_form' && (
            <form onSubmit={handleSaveSingle} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nội dung câu hỏi
                </label>
                <input
                  type="text"
                  required
                  value={formQuestion}
                  onChange={(e) => setFormQuestion(e.target.value)}
                  placeholder="Nhập câu hỏi (Ví dụ: Thủ đô của Việt Nam là gì?)"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option A */}
                <div>
                  <label className="block text-xs font-bold text-rose-400 mb-1 flex items-center justify-between">
                    <span>Phương án A (Giơ 1 ngón)</span>
                    <input
                      type="radio"
                      name="correctChoice"
                      checked={formCorrect === 'A'}
                      onChange={() => setFormCorrect('A')}
                      className="accent-rose-500 cursor-pointer"
                    />
                  </label>
                  <input
                    type="text"
                    required
                    value={formA}
                    onChange={(e) => setFormA(e.target.value)}
                    placeholder="Đáp án A"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>

                {/* Option B */}
                <div>
                  <label className="block text-xs font-bold text-blue-400 mb-1 flex items-center justify-between">
                    <span>Phương án B (Giơ 2 ngón)</span>
                    <input
                      type="radio"
                      name="correctChoice"
                      checked={formCorrect === 'B'}
                      onChange={() => setFormCorrect('B')}
                      className="accent-blue-500 cursor-pointer"
                    />
                  </label>
                  <input
                    type="text"
                    required
                    value={formB}
                    onChange={(e) => setFormB(e.target.value)}
                    placeholder="Đáp án B"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Option C */}
                <div>
                  <label className="block text-xs font-bold text-amber-400 mb-1 flex items-center justify-between">
                    <span>Phương án C (Giơ 3 ngón)</span>
                    <input
                      type="radio"
                      name="correctChoice"
                      checked={formCorrect === 'C'}
                      onChange={() => setFormCorrect('C')}
                      className="accent-amber-500 cursor-pointer"
                    />
                  </label>
                  <input
                    type="text"
                    required
                    value={formC}
                    onChange={(e) => setFormC(e.target.value)}
                    placeholder="Đáp án C"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Option D */}
                <div>
                  <label className="block text-xs font-bold text-emerald-400 mb-1 flex items-center justify-between">
                    <span>Phương án D (Giơ 5 ngón)</span>
                    <input
                      type="radio"
                      name="correctChoice"
                      checked={formCorrect === 'D'}
                      onChange={() => setFormCorrect('D')}
                      className="accent-emerald-500 cursor-pointer"
                    />
                  </label>
                  <input
                    type="text"
                    required
                    value={formD}
                    onChange={(e) => setFormD(e.target.value)}
                    placeholder="Đáp án D"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-300">
                  Đáp án chính xác: <span className="text-indigo-400 font-bold">{formCorrect}</span>
                </span>
                <div className="flex gap-2">
                  {(['A', 'B', 'C', 'D'] as ChoiceKey[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setFormCorrect(k)}
                      className={`w-9 h-9 rounded-xl font-bold text-sm transition ${
                        formCorrect === k
                          ? 'bg-indigo-600 text-white shadow-lg'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Chủ đề / Môn học
                  </label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="VD: Toán, Tiếng Anh, Đố vui..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Giải thích (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={formExplanation}
                    onChange={(e) => setFormExplanation(e.target.value)}
                    placeholder="Giải thích ngắn gọn cho đáp án đúng..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition shadow-lg shadow-indigo-600/30"
                >
                  {editingId ? 'Lưu chỉnh sửa' : 'Thêm câu hỏi'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">
            Dữ liệu câu hỏi được lưu tự động trên trình duyệt của bạn.
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition shadow-lg shadow-indigo-600/30"
          >
            Đã xong & Vào chơi
          </button>
        </div>
      </div>
    </div>
  );
};
