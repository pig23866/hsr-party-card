import React from 'react';
import { motion } from 'motion/react';
import { Play, Sparkles } from 'lucide-react';
import { Deck } from '../hooks/useDeck';

interface HomeProps {
  deck: Deck;
  onStartGame: () => void;
  onOpenStudio: () => void;
}

export function Home({ deck, onStartGame, onOpenStudio }: HomeProps) {
  return (
    <div className="min-h-screen bg-[#9dbfbf] text-gray-800 flex flex-col items-center justify-center p-6 font-sans">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-2xl w-full"
      >
        <h1 className="text-4xl md:text-6xl font-bold mb-4 text-white drop-shadow-md tracking-wider">
          崩壞:星穹鐵道
        </h1>
        <h2 className="text-2xl md:text-3xl font-bold mb-12 text-[#28a89b] drop-shadow-sm">
          填空卡牌遊戲
        </h2>

        <div className="bg-[#f4f7f7] border-2 border-[#476a6f] rounded-3xl p-8 mb-8 shadow-xl">
          <div className="flex items-center justify-center gap-8 mb-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-[#28a89b] mb-1">{deck.questions.length}</div>
              <div className="text-sm font-bold text-[#476a6f]">題目卡</div>
            </div>
            <div className="w-0.5 h-12 bg-[#d1dfdf]"></div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[#28a89b] mb-1">{deck.answers.length}</div>
              <div className="text-sm font-bold text-[#476a6f]">答案卡</div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStartGame}
              className="bg-[#28a89b] text-white p-4 rounded-full font-bold text-lg flex items-center justify-center gap-2 hover:bg-[#239287] transition-colors shadow-md border-2 border-transparent"
            >
              <Play className="w-5 h-5" />
              開始遊戲
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onOpenStudio}
              className="bg-white text-[#28a89b] border-2 border-[#28a89b] p-4 rounded-full font-bold text-lg flex items-center justify-center gap-2 hover:bg-[#e8efef] transition-colors shadow-md"
            >
              <Sparkles className="w-5 h-5 text-[#facc15]" />
              卡牌工作室
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
