import React, { useState, useEffect, useRef } from 'react';
import { Question } from '../data/packs';
import { Deck, DeckMetadata } from '../hooks/useDeck';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, RefreshCw, CheckCircle2, ChevronRight, History, X, Download } from 'lucide-react';
import { toJpeg } from 'html-to-image';

interface GameProps {
  deck: Deck;
  activeDeck: DeckMetadata;
  onBack: () => void;
}

interface HistoryRecord {
  id: string;
  question: Question;
  answers: string[];
  timestamp: number;
}

export function Game({ deck, activeDeck, onBack }: GameProps) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [hand, setHand] = useState<string[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [history, setHistory] = useState<HistoryRecord[]>(() => {
    try {
      const saved = localStorage.getItem(`deck_${activeDeck.id}_history`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [showHistory, setShowHistory] = useState(false);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(`deck_${activeDeck.id}_history`, JSON.stringify(history));
  }, [history, activeDeck.id]);

  // Initialize game
  useEffect(() => {
    if (deck.questions.length > 0 && deck.answers.length > 0) {
      startNewRound();
    }
  }, [deck]);

  const startNewRound = () => {
    if (deck.questions.length === 0 || deck.answers.length === 0) return;
    // Pick a random question
    const randomQuestion = deck.questions[Math.floor(Math.random() * deck.questions.length)];
    setQuestion(randomQuestion);
    
    // Draw hand (11 cards)
    drawHand(11);
    
    setSelectedAnswers([]);
    setIsSubmitted(false);
  };

  const refreshQuestion = () => {
    if (deck.questions.length === 0) return;
    const randomQuestion = deck.questions[Math.floor(Math.random() * deck.questions.length)];
    setQuestion(randomQuestion);
    setHand(prev => [...prev, ...selectedAnswers]);
    setSelectedAnswers([]);
  };

  const drawHand = (count: number) => {
    if (deck.answers.length === 0) return;
    const newHand: string[] = [];
    for (let i = 0; i < count; i++) {
      newHand.push(deck.answers[Math.floor(Math.random() * deck.answers.length)]);
    }
    setHand(newHand);
  };

  const getBlanksCount = (q: Question) => {
    return q.segmentC !== "" ? 2 : 1;
  };

  const handleSelectAnswer = (answer: string, index: number) => {
    if (isSubmitted) return;
    
    const blanksCount = question ? getBlanksCount(question) : 1;
    
    if (selectedAnswers.length < blanksCount) {
      setSelectedAnswers([...selectedAnswers, answer]);
      // Remove from hand
      const newHand = [...hand];
      newHand.splice(index, 1);
      setHand(newHand);
    }
  };

  const handleRemoveSelected = (index: number) => {
    if (isSubmitted) return;
    
    const answer = selectedAnswers[index];
    const newSelected = [...selectedAnswers];
    newSelected.splice(index, 1);
    setSelectedAnswers(newSelected);
    
    // Add back to hand
    setHand([...hand, answer]);
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    if (question) {
      setHistory(prev => [{
        id: Date.now().toString(),
        question,
        answers: [...selectedAnswers],
        timestamp: Date.now()
      }, ...prev]);
    }
  };

  if (!question) return null;

  const blanksCount = getBlanksCount(question);
  const canSubmit = selectedAnswers.length === blanksCount;

  const saveAsImage = async (id: string) => {
    const element = document.getElementById(`history-record-${id}`);
    if (!element) return;
    
    try {
      const dataUrl = await toJpeg(element, {
        quality: 0.9,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `填空派對-${new Date().getTime()}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Failed to save image', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#9dbfbf] text-gray-800 flex flex-col font-sans">
      {/* Header */}
      <header className="p-4 bg-[#28a89b] text-white flex items-center justify-between shadow-md sticky top-0 z-20">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 hover:text-yellow-300 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="font-bold text-lg tracking-wider">{activeDeck.name}</div>
        <button 
          onClick={() => setShowHistory(true)}
          className="flex items-center gap-2 hover:text-yellow-300 transition-colors"
          title="歷史紀錄"
        >
          <History className="w-6 h-6" />
        </button>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 flex flex-col gap-8">
        
        {/* Question Area */}
        <div className="bg-[#f4f7f7] border-2 border-[#476a6f] rounded-3xl p-6 md:p-10 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-[#28a89b]"></div>
          
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-[#476a6f]">題目卡</h3>
            <button 
              onClick={refreshQuestion}
              disabled={isSubmitted || !question}
              className="flex items-center gap-2 text-sm font-bold text-[#476a6f] hover:text-[#28a89b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white/50 px-3 py-1.5 rounded-full"
            >
              <RefreshCw className="w-4 h-4" />
              更換題目
            </button>
          </div>

          {question ? (
            <div className="text-2xl md:text-3xl font-bold leading-relaxed flex flex-wrap items-center gap-y-4 gap-x-2 text-gray-800 mt-2">
              {question.segmentA && <span>{question.segmentA}</span>}
              
              {/* Blank 1 */}
              <BlankSlot 
                answer={selectedAnswers[0]} 
                isActive={!isSubmitted && selectedAnswers.length === 0}
                onClick={() => handleRemoveSelected(0)}
                isSubmitted={isSubmitted}
              />
              
              {question.segmentB && <span>{question.segmentB}</span>}
              
              {/* Blank 2 (if exists) */}
              {blanksCount === 2 && (
                <>
                  <BlankSlot 
                    answer={selectedAnswers[1]} 
                    isActive={!isSubmitted && selectedAnswers.length === 1}
                    onClick={() => handleRemoveSelected(1)}
                    isSubmitted={isSubmitted}
                  />
                  {question.segmentC && <span>{question.segmentC}</span>}
                </>
              )}
            </div>
          ) : (
            <div className="text-xl font-bold text-gray-500 text-center py-8">
              題庫為空，請先新增題目！
            </div>
          )}
        </div>

        {/* Action Area */}
        <div className="flex justify-center">
          <AnimatePresence mode="wait">
            {!isSubmitted ? (
              <motion.button
                key="submit"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                disabled={!canSubmit}
                onClick={handleSubmit}
                className={`flex items-center gap-2 px-8 py-4 rounded-full font-bold text-lg transition-all shadow-md ${
                  canSubmit 
                    ? 'bg-[#28a89b] text-white hover:bg-[#239287] hover:scale-105 active:scale-95' 
                    : 'bg-[#d1dfdf] text-gray-500 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-6 h-6" />
                確認提交
              </motion.button>
            ) : (
              <motion.button
                key="next"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onClick={startNewRound}
                className="flex items-center gap-2 px-8 py-4 rounded-full font-bold text-lg bg-[#fde047] text-gray-800 hover:bg-[#facc15] hover:scale-105 active:scale-95 shadow-md transition-all border-2 border-[#eab308]"
              >
                下一題
                <ChevronRight className="w-6 h-6" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Hand Area */}
        <div className="mt-auto pb-8">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-lg font-bold text-[#476a6f]">你的手牌</h3>
            <button 
              onClick={() => drawHand(11)}
              disabled={isSubmitted}
              className="flex items-center gap-2 text-sm font-bold text-[#476a6f] hover:text-[#28a89b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white/50 px-3 py-1.5 rounded-full"
            >
              <RefreshCw className="w-4 h-4" />
              重抽手牌
            </button>
          </div>
          
          <div className="flex flex-wrap gap-3 justify-center">
            <AnimatePresence>
              {hand.map((answer, index) => (
                <motion.button
                  key={`${answer}-${index}`}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 500, 
                    damping: 25,
                    delay: index * 0.02 
                  }}
                  exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.1 } }}
                  whileHover={!isSubmitted ? { y: -8, scale: 1.05, rotate: index % 2 === 0 ? 2 : -2 } : {}}
                  whileTap={!isSubmitted ? { scale: 0.95 } : {}}
                  onClick={() => handleSelectAnswer(answer, index)}
                  disabled={isSubmitted || selectedAnswers.length >= blanksCount}
                  className="bg-[#28a89b] border-[3px] border-[#fde047] text-white px-5 py-3 rounded-full font-bold text-base md:text-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {answer}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </div>

      </main>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#f4f7f7] border-4 border-[#28a89b] rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-[#476a6f] flex items-center gap-2">
                <History className="w-6 h-6" />
                歷史紀錄
              </h3>
              <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 pr-2 flex flex-col gap-4">
              {history.length === 0 ? (
                <div className="text-center text-gray-500 py-8 font-bold">尚無歷史紀錄</div>
              ) : (
                history.map(record => (
                  <div key={record.id} className="bg-white p-4 rounded-xl border-2 border-[#d1dfdf] shadow-sm relative group">
                    <div id={`history-record-${record.id}`} className="p-2 bg-white rounded-lg">
                      <div className="text-lg font-bold leading-relaxed text-gray-800">
                        {record.question.segmentA && <span>{record.question.segmentA}</span>}
                        <span className="mx-2 text-[#28a89b] underline decoration-2 underline-offset-4">{record.answers[0]}</span>
                        {record.question.segmentB && <span>{record.question.segmentB}</span>}
                        {record.answers.length > 1 && (
                          <>
                            <span className="mx-2 text-[#28a89b] underline decoration-2 underline-offset-4">{record.answers[1]}</span>
                            {record.question.segmentC && <span>{record.question.segmentC}</span>}
                          </>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-2 text-right">
                        {new Date(record.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <button 
                      onClick={() => saveAsImage(record.id)}
                      className="absolute top-2 right-2 p-2 bg-[#f4f7f7] text-[#28a89b] rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#e0eaea]"
                      title="儲存為圖片"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function BlankSlot({ answer, isActive, onClick, isSubmitted }: { answer?: string, isActive: boolean, onClick: () => void, isSubmitted: boolean }) {
  return (
    <motion.div 
      layout
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      onClick={answer && !isSubmitted ? onClick : undefined}
      className={`
        inline-flex items-center justify-center min-w-[120px] min-h-[48px] px-5 py-2 rounded-full border-[3px] transition-all overflow-hidden
        ${answer 
          ? 'bg-[#28a89b] text-white border-[#fde047] cursor-pointer hover:opacity-90 shadow-md' 
          : isActive 
            ? 'border-[#28a89b] border-dashed bg-white text-[#28a89b]' 
            : 'border-[#d1dfdf] border-dashed bg-[#e8efef] text-gray-400'
        }
      `}
    >
      <AnimatePresence mode="popLayout">
        {answer ? (
          <motion.span 
            key="answer"
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -10 }}
            transition={{ type: "spring", stiffness: 700, damping: 35 }}
            className="font-bold whitespace-nowrap"
          >
            {answer}
          </motion.span>
        ) : (
          <motion.span 
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm font-bold whitespace-nowrap"
          >
            {isActive ? '請選擇卡牌' : '等待填空'}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
