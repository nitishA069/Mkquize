import React, { useState, useEffect } from 'react';
import { Question } from '../types';
import { Trash2, X } from 'lucide-react';

interface QuestionFormItemProps {
  key?: any;
  q: any;
  idx: number;
  isEditing: boolean;
  onToggleEdit: () => void;
  onRemove: () => void;
  onUpdate: (updated: any) => void;
  lang: any;
}

export default function QuestionFormItem({
  q,
  idx,
  isEditing,
  onToggleEdit,
  onRemove,
  onUpdate,
  lang
}: QuestionFormItemProps) {
  // Local state for fast rendering without triggering parent updates on every keystroke
  const [localQ, setLocalQ] = useState<Omit<Question, 'id' | 'quizId'>>(q);

  // Sync with parent when the question data shifts externally (e.g. from template parse, or changing active quiz)
  useEffect(() => {
    setLocalQ(q);
  }, [q]);

  const commitUpdate = (updated: Omit<Question, 'id' | 'quizId'>) => {
    setLocalQ(updated);
    onUpdate(updated);
  };

  const handleFieldChange = (key: keyof Omit<Question, 'id' | 'quizId'>, value: any) => {
    const next = { ...localQ, [key]: value };
    setLocalQ(next);
  };

  const handleBlur = () => {
    onUpdate(localQ);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all">
      {/* Accordion row trigger */}
      <div
        onClick={onToggleEdit}
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 select-none bg-slate-50/50"
      >
        <div className="flex-1 pr-6 flex items-start gap-3">
          <span className="font-mono font-black text-slate-300 pt-0.5 text-sm">#{idx + 1}</span>
          <div>
            <p className="font-bold text-slate-900 leading-snug line-clamp-2">{localQ.questionText || 'Empty Question Prompt'}</p>
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase font-mono mt-1">
              <span>Choice count: {localQ.options.length}</span>
              <span>•</span>
              <span>Correct: {String.fromCharCode(65 + localQ.correctOption)}</span>
              <span>•</span>
              <span>Value: +{localQ.marks}/-{localQ.negativeMarks}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg cursor-pointer"
            title="Remove question"
            id={`btn-del-question-${idx}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Accordion Body Form Editor */}
      {isEditing && (
        <div className="p-5 border-t border-slate-200 bg-white space-y-4 text-xs">
          
          <div>
            <label className="block font-bold text-slate-500 mb-1">Question Prompt</label>
            <textarea
              value={localQ.questionText}
              onChange={e => handleFieldChange('questionText', e.target.value)}
              onBlur={handleBlur}
              rows={3}
              className="w-full p-2.5 rounded-lg border-2 border-slate-200 focus:border-indigo-500 outline-none font-sans font-semibold text-slate-800 resize-none text-sm"
            />
          </div>

          {/* Options edit */}
          <div className="space-y-2">
            <label className="block font-bold text-slate-500">Edit Option Choices (4 to 5 choices):</label>
            {localQ.options.map((opt, oIdx) => (
              <div key={oIdx} className="flex items-center gap-2">
                <span className="font-bold text-slate-300 font-mono w-4">{String.fromCharCode(65 + oIdx)}.</span>
                <input
                  type="text"
                  value={opt}
                  onChange={e => {
                    const newOpts = [...localQ.options];
                    newOpts[oIdx] = e.target.value;
                    handleFieldChange('options', newOpts);
                  }}
                  onBlur={handleBlur}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-800 focus:border-indigo-500 outline-none"
                />
                <button
                  onClick={() => {
                    const newOpts = localQ.options.filter((_, i) => i !== oIdx);
                    let correctedCorrect = localQ.correctOption;
                    if (localQ.correctOption >= newOpts.length) {
                      correctedCorrect = newOpts.length - 1;
                    }
                    const next = { ...localQ, options: newOpts, correctOption: correctedCorrect };
                    commitUpdate(next);
                  }}
                  disabled={localQ.options.length <= 2}
                  className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 cursor-pointer"
                  title="Delete Option"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}

            {localQ.options.length < 5 && (
              <button
                onClick={() => {
                  const nextOpts = [...localQ.options, `New Option Choice ${String.fromCharCode(65 + localQ.options.length)}` ];
                  const next = { ...localQ, options: nextOpts };
                  commitUpdate(next);
                }}
                className="text-xs font-semibold text-indigo-600 mt-1 cursor-pointer"
              >
                + Add Option Choice {String.fromCharCode(65 + localQ.options.length)}
              </button>
            )}
          </div>

          {/* Settings parameters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block font-mono text-[10px] text-slate-400 uppercase font-bold mb-1">Correct Answer</label>
              <select
                value={localQ.correctOption}
                onChange={e => {
                  const val = Number(e.target.value);
                  const next = { ...localQ, correctOption: val };
                  commitUpdate(next);
                }}
                className="w-full p-2 bg-white rounded border border-slate-200 outline-none text-slate-800 font-semibold"
              >
                {localQ.options.map((_, oIdx) => (
                  <option key={oIdx} value={oIdx}>Option {String.fromCharCode(65 + oIdx)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-mono text-[10px] text-slate-400 uppercase font-bold mb-1">Marks Value</label>
              <input
                type="number"
                value={localQ.marks}
                onChange={e => handleFieldChange('marks', Number(e.target.value))}
                onBlur={handleBlur}
                className="w-full p-2 bg-white rounded border border-slate-200 outline-none text-slate-800 font-semibold"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] text-slate-400 uppercase font-bold mb-1">Neg Weight</label>
              <input
                type="number"
                value={localQ.negativeMarks}
                onChange={e => handleFieldChange('negativeMarks', Number(e.target.value))}
                onBlur={handleBlur}
                className="w-full p-2 bg-white rounded border border-slate-200 outline-none text-slate-800 font-semibold"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] text-slate-400 uppercase font-bold mb-1">Difficulty</label>
              <select
                value={localQ.difficulty}
                onChange={e => {
                  const val = e.target.value as any;
                  const next = { ...localQ, difficulty: val };
                  commitUpdate(next);
                }}
                className="w-full p-2 bg-white rounded border border-slate-200 font-semibold outline-none text-slate-800"
              >
                <option value="Easy">{lang === 'en' ? 'Easy' : 'सरल'}</option>
                <option value="Medium">{lang === 'en' ? 'Medium' : 'मध्यम'}</option>
                <option value="Hard">{lang === 'en' ? 'Hard' : 'कठिन'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-500 mb-1">Feedback Explanation</label>
            <textarea
              value={localQ.explanation}
              onChange={e => handleFieldChange('explanation', e.target.value)}
              onBlur={handleBlur}
              rows={2}
              className="w-full p-2 rounded-lg border border-slate-200 outline-none font-semibold text-slate-800"
            />
          </div>

        </div>
      )}
    </div>
  );
}
