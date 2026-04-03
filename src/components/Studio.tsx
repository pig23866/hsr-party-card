import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Sparkles, Plus, Check, AlertCircle, X, Search, Edit2, Save, Upload, ClipboardPaste } from 'lucide-react';
import { Question } from '../data/packs';
import { Deck } from '../hooks/useDeck';
import { GoogleGenAI, Type } from '@google/genai';

interface StudioProps {
  deck: Deck;
  aiAnswers: string[];
  aiQuestions: Question[];
  onBack: () => void;
  addAnswer: (ans: string, isAiGenerated?: boolean) => boolean;
  deleteAnswer: (ans: string) => void;
  editAnswer: (oldAns: string, newAns: string) => boolean;
  addQuestion: (q: Question, isAiGenerated?: boolean) => boolean;
  deleteQuestion: (q: Question) => void;
  editQuestion: (oldQ: Question, newQ: Question) => boolean;
  bulkImport: (data: any) => { addedAnswers: number, addedQuestions: number, duplicateAnswers: number, duplicateQuestions: number };
}

export function Studio({ deck, aiAnswers, aiQuestions, onBack, addAnswer, deleteAnswer, editAnswer, addQuestion, deleteQuestion, editQuestion, bulkImport }: StudioProps) {
  const [tab, setTab] = useState<'answer' | 'question'>('answer');
  const [answerInput, setAnswerInput] = useState('');
  const [qSegA, setQSegA] = useState('');
  const [qSegB, setQSegB] = useState('');
  const [qSegC, setQSegC] = useState('');
  
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', msg: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');

  const [editingAnswer, setEditingAnswer] = useState<string | null>(null);
  const [editAnswerInput, setEditAnswerInput] = useState('');

  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editQSegA, setEditQSegA] = useState('');
  const [editQSegB, setEditQSegB] = useState('');
  const [editQSegC, setEditQSegC] = useState('');

  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showStatus = (type: 'success' | 'error' | 'info', msg: string) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 4000);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const result = bulkImport(json);
        showStatus('success', `匯入成功！新增 ${result.addedAnswers} 答案, ${result.addedQuestions} 題目。跳過 ${result.duplicateAnswers + result.duplicateQuestions} 個重複項目。`);
      } catch (error) {
        showStatus('error', 'JSON 格式錯誤，匯入失敗！');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleClipboardImport = () => {
    try {
      if (!importText.trim()) {
        showStatus('info', '請輸入 JSON 內容！');
        return;
      }
      const json = JSON.parse(importText);
      const result = bulkImport(json);
      showStatus('success', `匯入成功！新增 ${result.addedAnswers} 答案, ${result.addedQuestions} 題目。跳過 ${result.duplicateAnswers + result.duplicateQuestions} 個重複項目。`);
      setShowImportModal(false);
      setImportText('');
    } catch (error) {
      showStatus('error', 'JSON 格式錯誤，匯入失敗！');
    }
  };

  const handleAddAnswer = () => {
    if (!answerInput.trim()) return;
    const success = addAnswer(answerInput.trim());
    if (success) {
      showStatus('success', '答案卡新增成功！');
      setAnswerInput('');
    } else {
      showStatus('error', '此答案卡已存在！');
    }
  };

  const handleAddQuestion = () => {
    if (!qSegA.trim() && !qSegB.trim()) return;
    const q: Question = {
      segmentA: qSegA.trim(),
      segmentB: qSegB.trim(),
      segmentC: qSegC.trim()
    };
    const success = addQuestion(q);
    if (success) {
      showStatus('success', '題目卡新增成功！');
      setQSegA(''); setQSegB(''); setQSegC('');
    } else {
      showStatus('error', '此題目卡已存在！');
    }
  };

  const generateWithAI = async () => {
    setIsGenerating(true);
    setStatus({ type: 'info', msg: 'AI 正在腦力激盪中...' });
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      if (tab === 'answer') {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: "你是一個《崩壞：星穹鐵道》的資深玩家與迷因大師。請為一個填空派對遊戲生成 5 個好笑、有梗的「答案卡」。答案可以是角色名稱、招式、遊戲迷因、社群梗等。請以 JSON 陣列格式回傳字串。",
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        });
        const newAnswers: string[] = JSON.parse(response.text || '[]');
        let addedCount = 0;
        newAnswers.forEach(ans => {
          if (addAnswer(ans, true)) addedCount++;
        });
        showStatus('success', `AI 生成完畢！成功新增 ${addedCount} 張不重複的答案卡。`);
      } else {
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: "你是一個《崩壞：星穹鐵道》的資深玩家與迷因大師。請為一個填空派對遊戲生成 3 個好笑、有梗的「題目卡」。題目卡會有 1 到 2 個空格。請將句子拆分成 segmentA, segmentB, segmentC。例如：「幫幫我，[空格]先生！」 -> segmentA: '幫幫我，', segmentB: '先生！', segmentC: ''。如果有兩個空格：「[空格]，便是[空格]。」 -> segmentA: '', segmentB: '，便是', segmentC: '。'。請以 JSON 陣列格式回傳。",
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  segmentA: { type: Type.STRING },
                  segmentB: { type: Type.STRING },
                  segmentC: { type: Type.STRING }
                }
              }
            }
          }
        });
        const newQuestions: Question[] = JSON.parse(response.text || '[]');
        let addedCount = 0;
        newQuestions.forEach(q => {
          if (addQuestion({ segmentA: q.segmentA || '', segmentB: q.segmentB || '', segmentC: q.segmentC || '' }, true)) addedCount++;
        });
        showStatus('success', `AI 生成完畢！成功新增 ${addedCount} 張不重複的題目卡。`);
      }
    } catch (error) {
      console.error(error);
      showStatus('error', 'AI 生成失敗，請檢查 API Key 或稍後再試。');
    }
    setIsGenerating(false);
  };

  const startEditAnswer = (ans: string) => {
    setEditingAnswer(ans);
    setEditAnswerInput(ans);
  };

  const saveEditAnswer = (oldAns: string) => {
    if (!editAnswerInput.trim()) return;
    const success = editAnswer(oldAns, editAnswerInput.trim());
    if (success) {
      showStatus('success', '答案卡修改成功！');
      setEditingAnswer(null);
    } else {
      showStatus('error', '此答案卡已存在！');
    }
  };

  const startEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setEditQSegA(q.segmentA);
    setEditQSegB(q.segmentB);
    setEditQSegC(q.segmentC);
  };

  const saveEditQuestion = (oldQ: Question) => {
    if (!editQSegA.trim() && !editQSegB.trim()) return;
    const newQ: Question = {
      segmentA: editQSegA.trim(),
      segmentB: editQSegB.trim(),
      segmentC: editQSegC.trim()
    };
    const success = editQuestion(oldQ, newQ);
    if (success) {
      showStatus('success', '題目卡修改成功！');
      setEditingQuestion(null);
    } else {
      showStatus('error', '此題目卡已存在！');
    }
  };

  const filteredAnswers = deck.answers.filter(a => a.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredQuestions = deck.questions.filter(q => 
    `${q.segmentA} ${q.segmentB} ${q.segmentC}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#9dbfbf] text-gray-800 flex flex-col font-sans">
      <header className="p-4 bg-[#28a89b] text-white flex items-center justify-between shadow-md sticky top-0 z-20">
        <button onClick={onBack} className="flex items-center gap-2 hover:text-yellow-300 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="font-bold text-lg tracking-wider flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-300" />
          卡牌工作室
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1 hover:text-yellow-300 transition-colors text-sm font-bold"
            title="貼上 JSON 文字"
          >
            <ClipboardPaste className="w-5 h-5" />
            <span className="hidden sm:inline">貼上</span>
          </button>
          <div className="w-px h-4 bg-white/30 hidden sm:block"></div>
          <input 
            type="file" 
            accept=".json,.txt" 
            ref={fileInputRef} 
            onChange={handleImport} 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 hover:text-yellow-300 transition-colors text-sm font-bold"
            title="上傳 JSON 檔案"
          >
            <Upload className="w-5 h-5" />
            <span className="hidden sm:inline">檔案</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto p-4 flex flex-col gap-6">
        {/* Tabs */}
        <div className="flex bg-[#7aa8a8] rounded-full p-1 gap-1 shadow-inner">
          <button
            onClick={() => { setTab('answer'); setSearchTerm(''); }}
            className={`flex-1 py-2.5 rounded-full font-bold text-sm transition-all ${tab === 'answer' ? 'bg-white text-[#28a89b] shadow-sm' : 'text-white/80 hover:text-white'}`}
          >
            答案卡
          </button>
          <button
            onClick={() => { setTab('question'); setSearchTerm(''); }}
            className={`flex-1 py-2.5 rounded-full font-bold text-sm transition-all ${tab === 'question' ? 'bg-white text-[#28a89b] shadow-sm' : 'text-white/80 hover:text-white'}`}
          >
            題目卡
          </button>
        </div>

        {/* Add New Section */}
        <div className="bg-[#f4f7f7] border-2 border-[#476a6f] rounded-2xl p-5 shadow-md">
          <h2 className="text-lg font-bold text-[#476a6f] mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            新增{tab === 'answer' ? '答案' : '題目'}卡
          </h2>
          
          {tab === 'answer' ? (
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
                placeholder="輸入答案內容..."
                className="bg-white border-2 border-[#d1dfdf] rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-[#28a89b] transition-colors font-medium"
              />
              <button
                onClick={handleAddAnswer}
                disabled={!answerInput.trim()}
                className="bg-[#28a89b] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#239287] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                加入卡池
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={qSegA}
                onChange={(e) => setQSegA(e.target.value)}
                placeholder="第一段內容"
                className="bg-white border-2 border-[#d1dfdf] rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-[#28a89b] transition-colors font-medium"
              />
              <input
                type="text"
                value={qSegB}
                onChange={(e) => setQSegB(e.target.value)}
                placeholder="第二段內容"
                className="bg-white border-2 border-[#d1dfdf] rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-[#28a89b] transition-colors font-medium"
              />
              <input
                type="text"
                value={qSegC}
                onChange={(e) => setQSegC(e.target.value)}
                placeholder="第三段內容 (可不填)"
                className="bg-white border-2 border-[#d1dfdf] rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-[#28a89b] transition-colors font-medium"
              />
              <button
                onClick={handleAddQuestion}
                disabled={!qSegA.trim() && !qSegB.trim()}
                className="mt-2 bg-[#28a89b] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#239287] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                加入卡池
              </button>
            </div>
          )}

          <div className="mt-4 pt-4 border-t-2 border-[#d1dfdf]">
            <button
              onClick={generateWithAI}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-[#28a89b]/10 to-[#fde047]/20 border-2 border-[#28a89b]/30 text-[#28a89b] font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#28a89b]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-5 h-5" />
              {isGenerating ? 'AI 靈感湧現中...' : `讓 AI 幫我想${tab === 'answer' ? '答案' : '題目'}`}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 bg-white border-2 border-[#d1dfdf] rounded-full px-4 py-2.5 focus-within:border-[#28a89b] transition-colors shadow-sm">
          <Search className="w-5 h-5 text-gray-400" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`搜尋${tab === 'answer' ? '答案' : '題目'}...`}
            className="bg-transparent border-none outline-none text-gray-800 w-full font-medium"
          />
          <div className="text-xs text-gray-400 whitespace-nowrap font-bold">
            共 {tab === 'answer' ? filteredAnswers.length : filteredQuestions.length} 張
          </div>
        </div>

        {/* List Section */}
        <div className="flex-1 pb-12">
          {tab === 'answer' ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 pt-2">
              {filteredAnswers.map((ans, idx) => {
                const isAi = aiAnswers.some(a => a.toLowerCase() === ans.toLowerCase());
                return (
                <div key={idx} className="relative">
                  {editingAnswer === ans ? (
                    <div className="bg-white border-2 border-[#28a89b] rounded-full p-1 flex items-center shadow-md">
                      <input 
                        type="text"
                        value={editAnswerInput}
                        onChange={(e) => setEditAnswerInput(e.target.value)}
                        className="flex-1 bg-transparent px-3 py-1 text-gray-800 outline-none font-bold min-w-0 text-center"
                        autoFocus
                      />
                      <button onClick={() => saveEditAnswer(ans)} className="p-1.5 text-green-500 hover:bg-green-50 rounded-full shrink-0"><Save className="w-4 h-4" /></button>
                      <button onClick={() => setEditingAnswer(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-full shrink-0"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <>
                      <div className={`border-[3px] rounded-full py-3 px-4 text-center text-white font-bold shadow-md truncate text-sm md:text-base ${isAi ? 'bg-gradient-to-r from-[#28a89b] to-[#1e8278] border-yellow-300' : 'bg-[#28a89b] border-[#fde047]'}`}>
                        {isAi && <Sparkles className="w-4 h-4 inline-block mr-1 text-yellow-300 -mt-1" />}
                        {ans}
                      </div>
                      <button 
                        onClick={() => deleteAnswer(ans)}
                        className="absolute -bottom-2 -left-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md border-2 border-red-500 text-red-500 hover:bg-red-50 z-10"
                      >
                        <X className="w-4 h-4" strokeWidth={3} />
                      </button>
                      <button 
                        onClick={() => startEditAnswer(ans)}
                        className="absolute -top-2 -right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md border-2 border-blue-500 text-blue-500 hover:bg-blue-50 z-10"
                      >
                        <Edit2 className="w-3.5 h-3.5" strokeWidth={2.5} />
                      </button>
                    </>
                  )}
                </div>
                );
              })}
              {filteredAnswers.length === 0 && (
                <div className="col-span-2 text-center text-gray-500 py-8 font-medium">找不到符合的答案卡</div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-6 pt-2">
              {filteredQuestions.map((q, idx) => {
                const isAi = aiQuestions.some(aq => 
                  aq.segmentA.toLowerCase() === q.segmentA.toLowerCase() && 
                  aq.segmentB.toLowerCase() === q.segmentB.toLowerCase() && 
                  aq.segmentC.toLowerCase() === q.segmentC.toLowerCase()
                );
                return (
                <div key={idx} className={`relative border-2 rounded-2xl p-5 shadow-md ${isAi ? 'bg-gradient-to-br from-[#f4f7f7] to-[#e6f0f0] border-yellow-400' : 'bg-[#f4f7f7] border-[#476a6f]'}`}>
                  {editingQuestion === q ? (
                    <div className="flex flex-col gap-3">
                      <input type="text" value={editQSegA} onChange={(e) => setEditQSegA(e.target.value)} className="bg-white border-2 border-[#d1dfdf] rounded-xl px-3 py-2 text-gray-800 outline-none font-medium" placeholder="第一段內容" />
                      <input type="text" value={editQSegB} onChange={(e) => setEditQSegB(e.target.value)} className="bg-white border-2 border-[#d1dfdf] rounded-xl px-3 py-2 text-gray-800 outline-none font-medium" placeholder="第二段內容" />
                      <input type="text" value={editQSegC} onChange={(e) => setEditQSegC(e.target.value)} className="bg-white border-2 border-[#d1dfdf] rounded-xl px-3 py-2 text-gray-800 outline-none font-medium" placeholder="第三段內容 (可不填)" />
                      <div className="flex justify-end gap-2 mt-2">
                        <button onClick={() => setEditingQuestion(null)} className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-colors">取消</button>
                        <button onClick={() => saveEditQuestion(q)} className="px-4 py-2 font-bold bg-[#28a89b] text-white hover:bg-[#239287] rounded-xl flex items-center gap-2 transition-colors shadow-sm"><Save className="w-4 h-4" /> 儲存</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {isAi && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                          <Sparkles className="w-3 h-3" /> AI 生成
                        </div>
                      )}
                      <div className="text-lg font-bold text-gray-800 mb-5 text-center leading-relaxed mt-2">
                        {q.segmentA} <span className="inline-block w-12 border-b-2 border-gray-400 mx-1 align-middle"></span> {q.segmentB} {q.segmentC && <><span className="inline-block w-12 border-b-2 border-gray-400 mx-1 align-middle"></span> {q.segmentC}</>}
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-[#d1dfdf] rounded-full px-2 py-1.5 text-xs text-gray-600 text-center truncate font-medium">{q.segmentA || '第一段內容'}</div>
                        <div className="flex-1 bg-[#d1dfdf] rounded-full px-2 py-1.5 text-xs text-gray-600 text-center truncate font-medium">{q.segmentB || '第二段內容'}</div>
                        <div className="flex-1 bg-[#d1dfdf] rounded-full px-2 py-1.5 text-xs text-gray-600 text-center truncate font-medium">{q.segmentC || '第三段內容(可不填)'}</div>
                      </div>
                      <button 
                        onClick={() => deleteQuestion(q)}
                        className="absolute -bottom-3 -left-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md border-2 border-red-500 text-red-500 hover:bg-red-50 z-10"
                      >
                        <X className="w-5 h-5" strokeWidth={3} />
                      </button>
                      <button 
                        onClick={() => startEditQuestion(q)}
                        className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md border-2 border-blue-500 text-blue-500 hover:bg-blue-50 z-10"
                      >
                        <Edit2 className="w-4 h-4" strokeWidth={2.5} />
                      </button>
                    </>
                  )}
                </div>
                );
              })}
              {filteredQuestions.length === 0 && (
                <div className="text-center text-gray-500 py-8 font-medium">找不到符合的題目卡</div>
              )}
            </div>
          )}
        </div>

        {/* Status Toast */}
        {status && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full flex items-center gap-2 shadow-xl z-50 font-bold ${
              status.type === 'success' ? 'bg-[#28a89b] text-white' :
              status.type === 'error' ? 'bg-red-500 text-white' :
              'bg-blue-500 text-white'
            }`}
          >
            {status.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {status.msg}
          </motion.div>
        )}

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#f4f7f7] border-4 border-[#28a89b] rounded-3xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-[#476a6f] flex items-center gap-2">
                  <ClipboardPaste className="w-6 h-6" />
                  貼上 JSON 內容
                </h3>
                <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="在此貼上您的 JSON 格式題庫..."
                className="w-full h-48 bg-white border-2 border-[#d1dfdf] rounded-xl p-4 text-gray-800 focus:outline-none focus:border-[#28a89b] transition-colors font-mono text-sm resize-none"
              />
              <div className="flex justify-end gap-3 mt-2">
                <button 
                  onClick={() => setShowImportModal(false)}
                  className="px-6 py-2.5 font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handleClipboardImport}
                  disabled={!importText.trim()}
                  className="px-6 py-2.5 font-bold bg-[#28a89b] text-white hover:bg-[#239287] rounded-xl flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-5 h-5" />
                  確認匯入
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
