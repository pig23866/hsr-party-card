import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Sparkles, Plus, Check, AlertCircle, X, Search, Edit2, Save, Download, Upload, ClipboardPaste, FileCode, FileText, RotateCcw } from 'lucide-react';
import { Question } from '../data/packs';
import { Deck, DeckMetadata } from '../hooks/useDeck';
import { GoogleGenAI, Type } from '@google/genai';

interface StudioProps {
  deck: Deck;
  activeDeck: DeckMetadata;
  aiAnswers: string[];
  aiQuestions: Question[];
  onBack: () => void;
  addAnswer: (ans: string, isAiGenerated?: boolean) => boolean;
  deleteAnswer: (ans: string) => void;
  editAnswer: (oldAns: string, newAns: string) => boolean;
  addQuestion: (q: Question, isAiGenerated?: boolean) => boolean;
  deleteQuestion: (q: Question) => void;
  editQuestion: (oldQ: Question, newQ: Question) => boolean;
  bulkImport: (data: any) => { addedAnswers: number, addedQuestions: number, duplicateAnswers: string[], duplicateQuestions: Question[] };
  resetDeckToDefault: (id?: string) => void;
}

export function Studio({ deck, activeDeck, aiAnswers, aiQuestions, onBack, addAnswer, deleteAnswer, editAnswer, addQuestion, deleteQuestion, editQuestion, bulkImport, resetDeckToDefault }: StudioProps) {
  const [tab, setTab] = useState<'answer' | 'question'>('answer');
  const [answerInput, setAnswerInput] = useState('');
  const [smartQuestionInput, setSmartQuestionInput] = useState('');
  
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', msg: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');

  const [editingAnswer, setEditingAnswer] = useState<string | null>(null);
  const [editAnswerInput, setEditAnswerInput] = useState('');

  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editSmartInput, setEditSmartInput] = useState('');

  const [aiCount, setAiCount] = useState(5);

  const [showImportModal, setShowImportModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importText, setImportText] = useState('');
  const [exportConfirmConfig, setExportConfirmConfig] = useState<{type: 'txt' | 'html', numFiles: number, message: string} | null>(null);
  const [importReport, setImportReport] = useState<{ addedAnswers: number, addedQuestions: number, duplicateAnswers: string[], duplicateQuestions: Question[] } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showStatus = (type: 'success' | 'error' | 'info', msg: string) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 4000);
  };

  const processImportResult = (result: { addedAnswers: number, addedQuestions: number, duplicateAnswers: string[], duplicateQuestions: Question[] }) => {
    if (result.duplicateAnswers.length > 0 || result.duplicateQuestions.length > 0) {
      setImportReport(result);
    } else {
      showStatus('success', `匯入成功！新增 ${result.addedAnswers} 答案, ${result.addedQuestions} 題目。`);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const allAnswers: string[] = [];
    const allQuestions: any[] = [];
    let hasError = false;

    const readPromises = Array.from(files).map(file => {
      return new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const json = JSON.parse(event.target?.result as string);
            if (json.answers && Array.isArray(json.answers)) {
              allAnswers.push(...json.answers);
            }
            if (json.questions && Array.isArray(json.questions)) {
              allQuestions.push(...json.questions);
            }
          } catch (error) {
            hasError = true;
          }
          resolve();
        };
        reader.onerror = () => {
          hasError = true;
          resolve();
        };
        reader.readAsText(file);
      });
    });

    await Promise.all(readPromises);

    if (hasError) {
      showStatus('error', '部分檔案格式錯誤，僅匯入成功解析的內容！');
    }

    if (allAnswers.length > 0 || allQuestions.length > 0) {
      const result = bulkImport({ answers: allAnswers, questions: allQuestions });
      processImportResult(result);
    } else if (!hasError) {
      showStatus('info', '找不到可匯入的卡牌資料！');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClipboardImport = () => {
    try {
      if (!importText.trim()) {
        showStatus('info', '請輸入 JSON 內容！');
        return;
      }
      const json = JSON.parse(importText);
      const result = bulkImport(json);
      processImportResult(result);
      setShowImportModal(false);
      setImportText('');
    } catch (error) {
      showStatus('error', 'JSON 格式錯誤，匯入失敗！');
    }
  };

  const triggerExportTxt = () => {
    const maxAnswers = 200;
    const maxQuestions = 100;
    
    const totalAnswers = deck.answers.length;
    const totalQuestions = deck.questions.length;
    
    const numFiles = Math.max(
      Math.ceil(totalAnswers / maxAnswers),
      Math.ceil(totalQuestions / maxQuestions),
      1
    );

    setExportConfirmConfig({
      type: 'txt',
      numFiles,
      message: numFiles > 1 
        ? `卡牌數量較多，將為您匯出 ${numFiles} 個 TXT 檔案！`
        : `將為您匯出 1 個 TXT 檔案！`
    });
  };

  const executeExportTxt = (numFiles: number) => {
    const maxAnswers = 200;
    const maxQuestions = 100;

    for (let i = 0; i < numFiles; i++) {
      const chunkAnswers = deck.answers.slice(i * maxAnswers, (i + 1) * maxAnswers);
      const chunkQuestions = deck.questions.slice(i * maxQuestions, (i + 1) * maxQuestions);
      
      const partNum = String(i + 1).padStart(2, '0');
      const labelName = numFiles > 1 ? `${activeDeck.name}_${partNum}` : activeDeck.name;

      const exportData = {
        mode: "general",
        label: labelName,
        createdAt: Math.floor(Date.now() / 1000),
        answers: chunkAnswers,
        questions: chunkQuestions
      };

      const jsonString = JSON.stringify(exportData);
      const blob = new Blob([jsonString], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = numFiles > 1 ? `${activeDeck.name}${partNum}.txt` : `${activeDeck.name}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
    
    showStatus('success', `成功匯出 ${numFiles} 個 TXT 檔案！`);
    setExportConfirmConfig(null);
  };

  const triggerExportHtml = () => {
    setExportConfirmConfig({
      type: 'html',
      numFiles: 1,
      message: `將為您匯出 1 個 HTML 檔案！`
    });
  };

  const executeExportHtml = () => {
    const htmlContent = `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${activeDeck.name} - 卡牌庫</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f7; color: #333; padding: 20px; max-width: 1200px; margin: 0 auto; }
    h1 { color: #28a89b; text-align: center; margin-bottom: 40px; }
    .section { margin-bottom: 40px; }
    .section-title { border-bottom: 2px solid #28a89b; padding-bottom: 10px; margin-bottom: 20px; color: #476a6f; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px; }
    .card { background: white; border: 2px solid #d1dfdf; border-radius: 12px; padding: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: center; font-weight: bold; position: relative; }
    .card.ai { border-color: #fde047; background: linear-gradient(135deg, #fff, #fef9c3); }
    .answer-card { background-color: #28a89b; color: white; border-color: #1e8278; }
    .answer-card.ai { background: linear-gradient(135deg, #28a89b, #1e8278); border-color: #fde047; }
    .ai-badge { display: inline-block; font-size: 0.8em; background: #fde047; color: #854d0e; padding: 2px 8px; border-radius: 10px; margin-bottom: 10px; }
  </style>
</head>
<body>
  <h1>${activeDeck.name} - 填空派對卡牌庫</h1>
  
  <div class="section">
    <h2 class="section-title">題目卡 (${deck.questions.length} 張)</h2>
    <div class="grid">
      ${deck.questions.map(q => {
        const isAi = aiQuestions.some(aq => aq.segmentA === q.segmentA && aq.segmentB === q.segmentB && aq.segmentC === q.segmentC);
        return `
        <div class="card ${isAi ? 'ai' : ''}">
          ${isAi ? '<div class="ai-badge">✨ AI 生成</div>' : ''}
          <div>${q.segmentA} _____ ${q.segmentB} ${q.segmentC ? '_____ ' + q.segmentC : ''}</div>
        </div>
        `;
      }).join('')}
    </div>
  </div>

  <div class="section">
    <h2 class="section-title">答案卡 (${deck.answers.length} 張)</h2>
    <div class="grid">
      ${deck.answers.map(ans => {
        const isAi = aiAnswers.some(a => a === ans);
        return `
        <div class="card answer-card ${isAi ? 'ai' : ''}">
          ${isAi ? '✨ ' : ''}${ans}
        </div>
        `;
      }).join('')}
    </div>
  </div>
</body>
</html>
    `;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDeck.name}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus('success', '卡牌庫已匯出為 HTML！');
    setExportConfirmConfig(null);
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

  const parseQuestion = (text: string): Question | null => {
    const parts = text.split(/(?:OO|〇〇|\{\}|\[\]|_{2,})/i);
    if (parts.length === 2) {
      return { segmentA: parts[0].trim(), segmentB: parts[1].trim(), segmentC: '' };
    } else if (parts.length === 3) {
      return { segmentA: parts[0].trim(), segmentB: parts[1].trim(), segmentC: parts[2].trim() };
    }
    return null;
  };

  const handleAddQuestion = () => {
    if (!smartQuestionInput.trim()) return;
    const parsed = parseQuestion(smartQuestionInput);
    if (!parsed) {
      showStatus('error', '題目格式錯誤！請包含 1~2 個空格標記 (例如：OO, {}, [])');
      return;
    }
    const success = addQuestion(parsed);
    if (success) {
      showStatus('success', '題目卡新增成功！');
      setSmartQuestionInput('');
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
          contents: `你是一個《崩壞：星穹鐵道》的資深玩家與迷因大師。請為一個填空派對遊戲生成 ${aiCount} 個好笑、有梗的「答案卡」。答案可以是角色名稱、招式、遊戲迷因、社群梗等。請以 JSON 陣列格式回傳字串。`,
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
          contents: `你是一個《崩壞：星穹鐵道》的資深玩家與迷因大師。請為一個填空派對遊戲生成 ${aiCount} 個好笑、有梗的「題目卡」。題目卡會有 1 到 2 個空格。請將句子拆分成 segmentA, segmentB, segmentC。例如：「幫幫我，[空格]先生！」 -> segmentA: '幫幫我，', segmentB: '先生！', segmentC: ''。如果有兩個空格：「[空格]，便是[空格]。」 -> segmentA: '', segmentB: '，便是', segmentC: '。'。請以 JSON 陣列格式回傳。`,
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
    setEditSmartInput(`${q.segmentA}OO${q.segmentB}${q.segmentC ? 'OO' + q.segmentC : ''}`);
  };

  const saveEditQuestion = (oldQ: Question) => {
    if (!editSmartInput.trim()) return;
    const parsed = parseQuestion(editSmartInput);
    if (!parsed) {
      showStatus('error', '題目格式錯誤！請包含 1~2 個空格標記 (例如：OO, {}, [])');
      return;
    }
    const success = editQuestion(oldQ, parsed);
    if (success) {
      showStatus('success', '題目卡修改成功！');
      setEditingQuestion(null);
    } else {
      showStatus('error', '此題目卡已存在！');
    }
  };

  const [page, setPage] = useState(1);
  const itemsPerPage = 50;

  const handleTabChange = (newTab: 'answer' | 'question') => {
    setTab(newTab);
    setSearchTerm('');
    setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const filteredAnswers = deck.answers.filter(a => a.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredQuestions = deck.questions.filter(q => 
    `${q.segmentA} ${q.segmentB} ${q.segmentC}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedAnswers = filteredAnswers.slice(0, page * itemsPerPage);
  const paginatedQuestions = filteredQuestions.slice(0, page * itemsPerPage);

  // Optimize AI lookups
  const aiAnswersSet = React.useMemo(() => new Set(aiAnswers.map(a => a.toLowerCase())), [aiAnswers]);
  const aiQuestionsSet = React.useMemo(() => new Set(aiQuestions.map(q => `${q.segmentA.toLowerCase()}|${q.segmentB.toLowerCase()}|${q.segmentC.toLowerCase()}`)), [aiQuestions]);

  return (
    <div className="min-h-screen bg-[#9dbfbf] text-gray-800 flex flex-col font-sans">
      <header className="p-4 bg-[#28a89b] text-white flex items-center justify-between shadow-md sticky top-0 z-20">
        <button onClick={onBack} className="flex items-center gap-2 hover:text-yellow-300 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="font-bold text-lg tracking-wider flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-300" />
          {activeDeck.name}
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1 hover:text-red-300 transition-colors text-sm font-bold"
            title="清空自訂"
          >
            <RotateCcw className="w-5 h-5" />
            <span className="hidden sm:inline">清空自訂</span>
          </button>
          <div className="w-px h-4 bg-white/30 hidden sm:block"></div>
          <button 
            onClick={triggerExportHtml}
            className="flex items-center gap-1 hover:text-yellow-300 transition-colors text-sm font-bold"
            title="匯出為 HTML"
          >
            <FileCode className="w-5 h-5" />
            <span className="hidden sm:inline">匯出 HTML</span>
          </button>
          <div className="w-px h-4 bg-white/30 hidden sm:block"></div>
          <button 
            onClick={triggerExportTxt}
            className="flex items-center gap-1 hover:text-yellow-300 transition-colors text-sm font-bold"
            title="匯出為 TXT"
          >
            <Download className="w-5 h-5" />
            <span className="hidden sm:inline">匯出 TXT</span>
          </button>
          <div className="w-px h-4 bg-white/30 hidden sm:block"></div>
          <button 
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1 hover:text-yellow-300 transition-colors text-sm font-bold"
            title="匯入卡牌"
          >
            <Upload className="w-5 h-5" />
            <span className="hidden sm:inline">匯入卡牌</span>
          </button>
          <input 
            type="file" 
            accept=".json,.txt" 
            multiple
            ref={fileInputRef} 
            onChange={handleImport} 
            className="hidden" 
          />
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto p-4 flex flex-col gap-6">
        {/* Tabs */}
        <div className="flex bg-[#7aa8a8] rounded-full p-1 gap-1 shadow-inner">
          <button
            onClick={() => handleTabChange('answer')}
            className={`flex-1 py-2.5 rounded-full font-bold text-sm transition-all ${tab === 'answer' ? 'bg-white text-[#28a89b] shadow-sm' : 'text-white/80 hover:text-white'}`}
          >
            答案卡
          </button>
          <button
            onClick={() => handleTabChange('question')}
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
              <textarea
                value={smartQuestionInput}
                onChange={(e) => setSmartQuestionInput(e.target.value)}
                placeholder="輸入題目，使用 OO 或 {} 代表空格。例如：開拓者的每日任務竟然是 {} 和 {}。"
                className="bg-white border-2 border-[#d1dfdf] rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-[#28a89b] transition-colors font-medium h-24 resize-none"
              />
              {smartQuestionInput.trim() && (
                <div className="text-sm text-gray-500 bg-white/50 p-3 rounded-xl border border-[#d1dfdf]">
                  <div className="font-bold mb-1 text-[#476a6f]">預覽：</div>
                  {parseQuestion(smartQuestionInput) ? (
                    <div className="flex flex-wrap items-center gap-1 text-gray-800 font-bold">
                      {parseQuestion(smartQuestionInput)?.segmentA}
                      <span className="inline-block w-8 border-b-2 border-gray-400 mx-1"></span>
                      {parseQuestion(smartQuestionInput)?.segmentB}
                      {parseQuestion(smartQuestionInput)?.segmentC && (
                        <>
                          <span className="inline-block w-8 border-b-2 border-gray-400 mx-1"></span>
                          {parseQuestion(smartQuestionInput)?.segmentC}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-red-500 font-bold">格式錯誤：請確保包含 1 到 2 個空格標記 (例如 OO 或 {})</div>
                  )}
                </div>
              )}
              <button
                onClick={handleAddQuestion}
                disabled={!smartQuestionInput.trim() || !parseQuestion(smartQuestionInput)}
                className="bg-[#28a89b] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#239287] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                加入卡池
              </button>
            </div>
          )}

          <div className="mt-4 pt-4 border-t-2 border-[#d1dfdf]">
            <div className="flex gap-2 mb-3 items-center">
              <label className="text-sm font-bold text-gray-600 whitespace-nowrap">生成數量：</label>
              <input 
                type="number" 
                min="1" 
                max="20" 
                value={aiCount} 
                onChange={(e) => setAiCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                className="w-20 bg-white border-2 border-[#d1dfdf] rounded-lg px-3 py-1.5 text-gray-800 focus:outline-none focus:border-[#28a89b] font-medium text-center"
              />
            </div>
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
            onChange={handleSearchChange}
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
              {paginatedAnswers.map((ans, idx) => {
                const isAi = aiAnswersSet.has(ans.toLowerCase());
                return (
                <div key={idx} className="relative">
                  {editingAnswer === ans ? (
                    <div className="bg-white border-2 border-[#28a89b] rounded-2xl p-1 flex items-center shadow-md">
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
                      <div className={`border-[3px] rounded-2xl py-3 px-4 text-center text-white font-bold shadow-md break-words text-sm md:text-base ${isAi ? 'bg-gradient-to-r from-[#28a89b] to-[#1e8278] border-yellow-300' : 'bg-[#28a89b] border-[#fde047]'}`}>
                        {isAi && <Sparkles className="w-4 h-4 inline-block mr-1 text-yellow-300 -mt-1 shrink-0" />}
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
              {page * itemsPerPage < filteredAnswers.length && (
                <div className="col-span-2 flex justify-center mt-4">
                  <button 
                    onClick={() => setPage(p => p + 1)}
                    className="bg-white text-[#28a89b] border-2 border-[#28a89b] px-6 py-2 rounded-full font-bold hover:bg-[#e8efef] transition-colors"
                  >
                    載入更多
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-6 pt-2">
              {paginatedQuestions.map((q, idx) => {
                const isAi = aiQuestionsSet.has(`${q.segmentA.toLowerCase()}|${q.segmentB.toLowerCase()}|${q.segmentC.toLowerCase()}`);
                return (
                <div key={idx} className={`relative border-2 rounded-2xl p-5 shadow-md ${isAi ? 'bg-gradient-to-br from-[#f4f7f7] to-[#e6f0f0] border-yellow-400' : 'bg-[#f4f7f7] border-[#476a6f]'}`}>
                  {editingQuestion === q ? (
                    <div className="flex flex-col gap-3">
                      <textarea 
                        value={editSmartInput} 
                        onChange={(e) => setEditSmartInput(e.target.value)} 
                        className="bg-white border-2 border-[#d1dfdf] rounded-xl px-3 py-2 text-gray-800 outline-none font-medium h-24 resize-none" 
                        placeholder="輸入題目，使用 OO 或 {} 代表空格" 
                      />
                      {editSmartInput.trim() && (
                        <div className="text-sm text-gray-500 bg-white/50 p-2 rounded-xl border border-[#d1dfdf]">
                          {parseQuestion(editSmartInput) ? (
                            <div className="flex flex-wrap items-center gap-1 text-gray-800 font-bold text-xs">
                              {parseQuestion(editSmartInput)?.segmentA}
                              <span className="inline-block w-6 border-b-2 border-gray-400 mx-1"></span>
                              {parseQuestion(editSmartInput)?.segmentB}
                              {parseQuestion(editSmartInput)?.segmentC && (
                                <>
                                  <span className="inline-block w-6 border-b-2 border-gray-400 mx-1"></span>
                                  {parseQuestion(editSmartInput)?.segmentC}
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="text-red-500 font-bold text-xs">格式錯誤：請確保包含 1 到 2 個空格標記</div>
                          )}
                        </div>
                      )}
                      <div className="flex justify-end gap-2 mt-2">
                        <button onClick={() => setEditingQuestion(null)} className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-colors">取消</button>
                        <button onClick={() => saveEditQuestion(q)} disabled={!parseQuestion(editSmartInput)} className="px-4 py-2 font-bold bg-[#28a89b] text-white hover:bg-[#239287] rounded-xl flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"><Save className="w-4 h-4" /> 儲存</button>
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
              {page * itemsPerPage < filteredQuestions.length && (
                <div className="flex justify-center mt-4">
                  <button 
                    onClick={() => setPage(p => p + 1)}
                    className="bg-white text-[#28a89b] border-2 border-[#28a89b] px-6 py-2 rounded-full font-bold hover:bg-[#e8efef] transition-colors"
                  >
                    載入更多
                  </button>
                </div>
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
                  <Upload className="w-6 h-6" />
                  匯入卡牌庫
                </h3>
                <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="bg-white border-2 border-dashed border-[#28a89b] rounded-xl p-6 text-center hover:bg-[#f0f9f8] transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-8 h-8 text-[#28a89b] mx-auto mb-2" />
                  <p className="font-bold text-[#476a6f]">點擊選擇 JSON 或 TXT 檔案</p>
                  <p className="text-sm text-gray-500 mt-1">支援 .json 或 .txt 格式</p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-gray-300"></div>
                  <span className="text-sm font-bold text-gray-400">或貼上內容</span>
                  <div className="flex-1 h-px bg-gray-300"></div>
                </div>

                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="在此貼上您的 JSON 格式題庫..."
                  className="w-full h-32 bg-white border-2 border-[#d1dfdf] rounded-xl p-4 text-gray-800 focus:outline-none focus:border-[#28a89b] transition-colors font-mono text-sm resize-none"
                />
              </div>

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
                  確認匯入文字
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Export Confirm Modal */}
        {exportConfirmConfig && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#f4f7f7] border-4 border-[#28a89b] rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4 text-center"
            >
              <div className="mx-auto bg-[#28a89b]/10 p-4 rounded-full mb-2">
                {exportConfirmConfig.type === 'txt' ? <Download className="w-10 h-10 text-[#28a89b]" /> : <FileCode className="w-10 h-10 text-[#28a89b]" />}
              </div>
              <h3 className="text-xl font-bold text-[#476a6f]">確認匯出</h3>
              <p className="text-gray-600 font-medium mb-4">
                {exportConfirmConfig.message}
              </p>
              <div className="flex justify-center gap-3">
                <button 
                  onClick={() => setExportConfirmConfig(null)}
                  className="px-6 py-2.5 font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-colors flex-1"
                >
                  取消
                </button>
                <button 
                  onClick={() => {
                    if (exportConfirmConfig.type === 'txt') {
                      executeExportTxt(exportConfirmConfig.numFiles);
                    } else {
                      executeExportHtml();
                    }
                  }}
                  className="px-6 py-2.5 font-bold bg-[#28a89b] text-white hover:bg-[#239287] rounded-xl transition-colors shadow-sm flex-1"
                >
                  確認下載
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Import Report Modal */}
        {importReport && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#f4f7f7] border-4 border-[#28a89b] rounded-3xl p-6 max-w-2xl w-full shadow-2xl flex flex-col gap-4 max-h-[80vh]"
            >
              <div className="flex justify-between items-center border-b-2 border-[#d1dfdf] pb-4">
                <h3 className="text-xl font-bold text-[#476a6f] flex items-center gap-2">
                  <Check className="w-6 h-6 text-green-500" />
                  匯入完成報告
                </h3>
                <button onClick={() => setImportReport(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex gap-4 font-bold text-gray-700">
                <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg">
                  新增：{importReport.addedAnswers} 答案 / {importReport.addedQuestions} 題目
                </div>
                <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg">
                  跳過重複：{importReport.duplicateAnswers.length} 答案 / {importReport.duplicateQuestions.length} 題目
                </div>
              </div>

              <div className="overflow-y-auto flex-1 pr-2 space-y-4 custom-scrollbar">
                {importReport.duplicateAnswers.length > 0 && (
                  <div>
                    <h4 className="font-bold text-gray-600 mb-2 sticky top-0 bg-[#f4f7f7] py-1">重複的答案卡：</h4>
                    <div className="flex flex-wrap gap-2">
                      {importReport.duplicateAnswers.map((ans, i) => (
                        <span key={i} className="bg-white border border-gray-300 rounded-full px-3 py-1 text-sm text-gray-600 shadow-sm">
                          {ans}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {importReport.duplicateQuestions.length > 0 && (
                  <div>
                    <h4 className="font-bold text-gray-600 mb-2 sticky top-0 bg-[#f4f7f7] py-1">重複的題目卡：</h4>
                    <div className="flex flex-col gap-2">
                      {importReport.duplicateQuestions.map((q, i) => (
                        <div key={i} className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-600 shadow-sm">
                          {q.segmentA} <span className="inline-block w-6 border-b border-gray-400 mx-1 align-middle"></span> {q.segmentB} {q.segmentC && <><span className="inline-block w-6 border-b border-gray-400 mx-1 align-middle"></span> {q.segmentC}</>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t-2 border-[#d1dfdf]">
                <button 
                  onClick={() => setImportReport(null)}
                  className="px-8 py-2.5 font-bold bg-[#28a89b] text-white hover:bg-[#239287] rounded-xl transition-colors shadow-sm"
                >
                  我知道了
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {/* Reset Confirm Modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#f4f7f7] border-4 border-[#28a89b] rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4"
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold text-[#476a6f] flex items-center gap-2">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                  清空自訂卡牌
                </h3>
                <button onClick={() => setShowResetConfirm(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <p className="text-gray-600 font-medium">
                確定要清空所有自訂的題目與答案卡嗎？<br/>
                此操作將會保留預設卡牌，但所有您自己新增的卡牌都會被永久刪除，且無法復原。
              </p>
              <div className="flex justify-end gap-3 mt-4">
                <button 
                  onClick={() => setShowResetConfirm(false)}
                  className="px-6 py-2.5 font-bold text-gray-500 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={() => {
                    resetDeckToDefault();
                    setShowResetConfirm(false);
                    showStatus('success', '已清空自訂卡牌！');
                  }}
                  className="px-6 py-2.5 font-bold bg-red-500 text-white hover:bg-red-600 rounded-xl transition-colors shadow-sm"
                >
                  確定清空
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
