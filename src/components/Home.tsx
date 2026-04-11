import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Sparkles, Database, Plus, Trash2, Edit2, Check, X, AlertCircle, HelpCircle } from 'lucide-react';
import { Deck, DeckMetadata } from '../hooks/useDeck';

interface HomeProps {
  deck: Deck;
  decks: DeckMetadata[];
  activeDeck: DeckMetadata;
  onStartGame: () => void;
  onOpenStudio: () => void;
  createDeck: (name: string) => string;
  deleteDeck: (id: string) => boolean;
  clearDeck: (id: string) => boolean;
  renameDeck: (id: string, name: string) => boolean;
  switchDeck: (id: string) => void;
  onOpenTutorial: () => void;
}

export function Home({ 
  deck, 
  decks, 
  activeDeck, 
  onStartGame, 
  onOpenStudio,
  createDeck,
  deleteDeck,
  clearDeck,
  renameDeck,
  switchDeck,
  onOpenTutorial
}: HomeProps) {
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [createInput, setCreateInput] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [clearConfirmId, setClearConfirmId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'error' | 'info', msg: string } | null>(null);

  const showStatus = (type: 'error' | 'info', msg: string) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 4000);
  };

  const handleCreate = () => {
    if (createInput.trim()) {
      createDeck(createInput.trim());
      setCreateInput('');
    }
  };

  const handleRename = (id: string) => {
    if (renameInput.trim()) {
      renameDeck(id, renameInput.trim());
      setIsRenaming(null);
    }
  };

  const handleStartGame = () => {
    if (deck.questions.length === 0 || deck.answers.length === 0) {
      showStatus('error', '題庫或答案卡不足，請先至卡牌工作室新增！');
      return;
    }
    onStartGame();
  };

  return (
    <div className="min-h-screen bg-[#9dbfbf] text-gray-800 flex flex-col items-center justify-center p-6 font-sans relative">
      <button
        onClick={onOpenTutorial}
        className="absolute top-6 right-6 bg-white/20 hover:bg-white/40 text-white p-3 rounded-full backdrop-blur-sm transition-all shadow-sm hover:shadow-md"
        title="新手教學"
      >
        <HelpCircle className="w-6 h-6" />
      </button>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-2xl w-full"
      >
        <h1 className="text-4xl md:text-6xl font-bold mb-4 text-white drop-shadow-md tracking-wider">
          {activeDeck.name}
        </h1>
        <h2 className="text-2xl md:text-3xl font-bold mb-12 text-[#28a89b] drop-shadow-sm">
          填空卡牌遊戲
        </h2>

        <div className="bg-[#f4f7f7] border-2 border-[#476a6f] rounded-3xl p-8 mb-8 shadow-xl relative">
          {/* Database Manager Button */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center z-20">
            <button
              onClick={() => setIsManageModalOpen(true)}
              className="bg-[#476a6f] text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 shadow-lg hover:bg-[#3a575b] transition-colors"
            >
              <Database className="w-4 h-4" />
              管理資料庫
            </button>
          </div>

          <div className="flex items-center justify-center gap-8 mb-8 mt-4">
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
              onClick={handleStartGame}
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

      {/* Status Toast */}
      {status && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full flex items-center gap-2 shadow-xl z-50 font-bold ${
            status.type === 'error' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
          }`}
        >
          <AlertCircle className="w-5 h-5" />
          {status.msg}
        </motion.div>
      )}

      {/* Database Management Modal */}
      <AnimatePresence>
        {isManageModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#f4f7f7] border-4 border-[#28a89b] rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4 max-h-[80vh]"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-[#476a6f] flex items-center gap-2">
                  <Database className="w-6 h-6" />
                  資料庫管理
                </h3>
                <button onClick={() => setIsManageModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-full p-1 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-3 my-2">
                {decks.map(d => (
                  <div key={d.id} className={`p-3 rounded-2xl border-2 transition-colors shadow-sm ${activeDeck.id === d.id ? 'border-[#28a89b] bg-white' : 'border-[#d1dfdf] bg-gray-50 hover:bg-white'}`}>
                    {isRenaming === d.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={renameInput}
                          onChange={e => setRenameInput(e.target.value)}
                          className="flex-1 bg-white border-2 border-[#28a89b] rounded-xl px-3 py-1.5 text-sm outline-none font-bold text-gray-700"
                          onKeyDown={e => e.key === 'Enter' && handleRename(d.id)}
                        />
                        <button onClick={() => handleRename(d.id)} className="p-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setIsRenaming(null)} className="p-2 bg-gray-400 text-white rounded-xl hover:bg-gray-500 transition-colors"><X className="w-4 h-4" /></button>
                      </div>
                    ) : deleteConfirmId === d.id ? (
                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-bold text-red-600">確定要刪除「{d.name}」嗎？</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => { deleteDeck(d.id); setDeleteConfirmId(null); }} className="flex-1 py-1.5 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600 transition-colors">確認刪除</button>
                          <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-1.5 bg-gray-300 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-400 transition-colors">取消</button>
                        </div>
                      </div>
                    ) : clearConfirmId === d.id ? (
                      <div className="flex flex-col gap-2">
                        <span className="text-sm font-bold text-orange-600">確定要清空「{d.name}」嗎？將會保留一組基本卡牌。</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => { clearDeck(d.id); setClearConfirmId(null); }} className="flex-1 py-1.5 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600 transition-colors">確認清空</button>
                          <button onClick={() => setClearConfirmId(null)} className="flex-1 py-1.5 bg-gray-300 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-400 transition-colors">取消</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => { switchDeck(d.id); setIsManageModalOpen(false); }}
                          className="flex-1 text-left truncate font-bold text-[#476a6f] text-lg flex items-center gap-2"
                        >
                          {d.name}
                          {activeDeck.id === d.id && <span className="text-xs bg-[#28a89b] text-white px-2 py-0.5 rounded-full align-middle shadow-sm">使用中</span>}
                        </button>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => { setIsRenaming(d.id); setRenameInput(d.name); }} className="p-2 text-blue-500 hover:bg-blue-100 rounded-xl transition-colors" title="重新命名">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {d.id !== 'default' ? (
                            <button onClick={() => setDeleteConfirmId(d.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-xl transition-colors" title="刪除資料庫">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <button onClick={() => setClearConfirmId(d.id)} className="p-2 text-orange-500 hover:bg-orange-100 rounded-xl transition-colors" title="清空資料庫">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t-2 border-[#d1dfdf]">
                <div className="flex items-center gap-2">
                  <input
                    placeholder="輸入新資料庫名稱..."
                    value={createInput}
                    onChange={e => setCreateInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                    className="flex-1 bg-white border-2 border-[#d1dfdf] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#28a89b] transition-colors font-bold text-gray-700"
                  />
                  <button
                    onClick={handleCreate}
                    disabled={!createInput.trim()}
                    className="bg-[#28a89b] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-1 hover:bg-[#239287] transition-colors disabled:opacity-50 shadow-sm"
                  >
                    <Plus className="w-5 h-5" />
                    新增
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
