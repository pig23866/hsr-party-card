import React, { useState, useEffect } from 'react';
import { Question } from '../data/packs';
import { Deck } from '../hooks/useDeck';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, RefreshCw, CheckCircle2, ChevronRight } from 'lucide-react';

interface GameProps {
  deck: Deck;
  onBack: () => void;
}

export function Game({ deck, onBack }: GameProps) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [hand, setHand] = useState<string[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

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
    
    // Draw hand (7 cards)
    drawHand(7);
    
    setSelectedAnswers([]);
    setIsSubmitted(false);
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
  };

  if (!question) return null;

  const blanksCount = getBlanksCount(question);
  const canSubmit = selectedAnswers.length === blanksCount;

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
        <div className="font-bold text-lg tracking-wider">星穹鐵道 填空卡牌</div>
        <div className="w-6"></div> {/* Spacer for centering */}
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 flex flex-col gap-8">
        
        {/* Question Area */}
        <div className="bg-[#f4f7f7] border-2 border-[#476a6f] rounded-3xl p-6 md:p-10 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-[#28a89b]"></div>
          
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
              onClick={() => drawHand(7)}
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
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={!isSubmitted ? { y: -5, scale: 1.02 } : {}}
                  whileTap={!isSubmitted ? { scale: 0.98 } : {}}
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
    </div>
  );
}

function BlankSlot({ answer, isActive, onClick, isSubmitted }: { answer?: string, isActive: boolean, onClick: () => void, isSubmitted: boolean }) {
  return (
    <motion.div 
      layout
      onClick={answer && !isSubmitted ? onClick : undefined}
      className={`
        inline-flex items-center justify-center min-w-[120px] min-h-[48px] px-5 py-2 rounded-full border-[3px] transition-all
        ${answer 
          ? 'bg-[#28a89b] text-white border-[#fde047] cursor-pointer hover:opacity-90 shadow-md' 
          : isActive 
            ? 'border-[#28a89b] border-dashed bg-white text-[#28a89b]' 
            : 'border-[#d1dfdf] border-dashed bg-[#e8efef] text-gray-400'
        }
      `}
    >
      {answer ? (
        <span className="font-bold">{answer}</span>
      ) : (
        <span className="text-sm font-bold">
          {isActive ? '請選擇卡牌' : '等待填空'}
        </span>
      )}
    </motion.div>
  );
}
