import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, PenTool, Download, Play, CheckCircle2, ChevronRight, ChevronLeft, X } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

const steps = [
  {
    title: '歡迎來到填空派對！',
    description: '這是一個發揮創意與幽默感的卡牌遊戲。你需要用手上的「答案卡」來填補「題目卡」中的空白，創造出最搞笑的句子！',
    icon: Sparkles,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-100',
  },
  {
    title: '進入卡牌工作室',
    description: '點擊首頁的「卡牌工作室」，你可以自由新增、修改題目與答案。新增題目時，請用 OO、__ 或 [] 來代表需要填空的位子喔！',
    icon: PenTool,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100',
  },
  {
    title: '匯入與匯出',
    description: '在工作室中，你可以將精心製作的卡牌庫「匯出」與朋友分享，或是「匯入」別人做好的有趣卡牌庫，擴充你的遊戲內容！',
    icon: Download,
    color: 'text-green-500',
    bgColor: 'bg-green-100',
  },
  {
    title: '開始遊戲',
    description: '準備好之後，在首頁選擇你的卡牌庫，點擊「開始遊戲」。在遊戲中點擊手牌即可填入空格，完成後點擊提交！',
    icon: Play,
    color: 'text-[#28a89b]',
    bgColor: 'bg-[#e8efef]',
  },
  {
    title: '準備就緒！',
    description: '你已經了解所有基本操作了。現在就開始探索預設的卡牌庫，或是前往工作室打造專屬於你的搞笑派對吧！',
    icon: CheckCircle2,
    color: 'text-purple-500',
    bgColor: 'bg-purple-100',
  }
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const CurrentIcon = steps[currentStep].icon;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden relative border-4 border-[#28a89b]"
      >
        <button 
          onClick={onComplete}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10 bg-white/50 rounded-full p-1"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="p-8 flex flex-col items-center text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center w-full"
            >
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${steps[currentStep].bgColor}`}>
                <CurrentIcon className={`w-12 h-12 ${steps[currentStep].color}`} />
              </div>
              
              <h2 className="text-2xl font-black text-gray-800 mb-4">
                {steps[currentStep].title}
              </h2>
              
              <p className="text-gray-600 leading-relaxed min-h-[80px]">
                {steps[currentStep].description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Dots Indicator */}
          <div className="flex gap-2 mt-8 mb-8">
            {steps.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  idx === currentStep ? 'w-8 bg-[#28a89b]' : 'w-2.5 bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="flex w-full gap-3">
            {currentStep > 0 && (
              <button 
                onClick={handlePrev}
                className="flex-1 py-3.5 rounded-2xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center gap-1"
              >
                <ChevronLeft className="w-5 h-5" />
                上一步
              </button>
            )}
            <button 
              onClick={handleNext}
              className={`flex-[2] py-3.5 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-1 shadow-md hover:shadow-lg ${
                currentStep === steps.length - 1 
                  ? 'bg-gradient-to-r from-[#28a89b] to-[#1e8278]' 
                  : 'bg-[#28a89b] hover:bg-[#1e8278]'
              }`}
            >
              {currentStep === steps.length - 1 ? '開始體驗！' : '下一步'}
              {currentStep < steps.length - 1 && <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
