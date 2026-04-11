import { useState, useEffect, useCallback } from 'react';
import { packs, Question } from '../data/packs';

export interface Deck {
  answers: string[];
  questions: Question[];
}

export interface DeckMetadata {
  id: string;
  name: string;
  createdAt: number;
}

export function useDeck() {
  const [decks, setDecks] = useState<DeckMetadata[]>(() => {
    const storedDecks = JSON.parse(localStorage.getItem('deck_list') || '[]');
    if (storedDecks.length === 0) {
      return [{ id: 'default', name: '預設資料庫', createdAt: Date.now() }];
    }
    return storedDecks;
  });
  const [activeDeckId, setActiveDeckId] = useState<string>(() => {
    return localStorage.getItem('current_deck_id') || 'default';
  });
  const [deck, setDeck] = useState<Deck>({ answers: [], questions: [] });
  const [storageUsage, setStorageUsage] = useState({ usage: 0, limit: 5 * 1024 * 1024, ratio: 0 });

  const updateStorageUsage = useCallback(() => {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        total += key.length + value.length;
      }
    }
    const usageBytes = total * 2;
    const limitBytes = 5 * 1024 * 1024; // 5MB limit
    const ratio = usageBytes / limitBytes;
    
    setStorageUsage({ usage: usageBytes, limit: limitBytes, ratio });
    return ratio;
  }, []);

  const safeSetItem = useCallback((key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
      updateStorageUsage();
      return true;
    } catch (e) {
      console.error('Storage quota exceeded', e);
      alert('儲存空間已滿！請刪除一些卡牌或匯出後再試。');
      return false;
    }
  }, [updateStorageUsage]);

  const getStorageKey = useCallback((key: string, deckId: string = activeDeckId) => {
    return `deck_${deckId}_${key}`;
  }, [activeDeckId]);

  const loadDeck = useCallback((deckId: string = activeDeckId) => {
    const storedAnswers = JSON.parse(localStorage.getItem(getStorageKey('custom_answers', deckId)) || '[]');
    const deletedAnswers = JSON.parse(localStorage.getItem(getStorageKey('deleted_answers', deckId)) || '[]');
    const storedQuestions = JSON.parse(localStorage.getItem(getStorageKey('custom_questions', deckId)) || '[]');
    const deletedQuestions = JSON.parse(localStorage.getItem(getStorageKey('deleted_questions', deckId)) || '[]');

    // Only "default" deck includes packs data
    const baseAnswers = deckId === 'default' ? packs.flatMap(p => p.answers) : [];
    const baseQuestions = deckId === 'default' ? packs.flatMap(p => p.questions) : [];

    const allAnswers = [...baseAnswers, ...storedAnswers];
    
    // Optimize deduplication using Set (O(N) instead of O(N^2))
    const deletedAnswersSet = new Set(deletedAnswers.map((a: string) => a.toLowerCase()));
    const seenAnswers = new Set<string>();
    const uniqueAnswers: string[] = [];

    for (const a of allAnswers) {
      const lower = a.toLowerCase();
      if (!seenAnswers.has(lower) && !deletedAnswersSet.has(lower)) {
        seenAnswers.add(lower);
        uniqueAnswers.push(a);
      }
    }

    const allQuestions = [...baseQuestions, ...storedQuestions];
    
    // Optimize deduplication using Set (O(N) instead of O(N^2))
    const deletedQuestionsSet = new Set(deletedQuestions.map((q: Question) => 
      `${q.segmentA.toLowerCase()}|${q.segmentB.toLowerCase()}|${q.segmentC.toLowerCase()}`
    ));
    const seenQuestions = new Set<string>();
    const uniqueQuestions: Question[] = [];

    for (const q of allQuestions) {
      const key = `${q.segmentA.toLowerCase()}|${q.segmentB.toLowerCase()}|${q.segmentC.toLowerCase()}`;
      if (!seenQuestions.has(key) && !deletedQuestionsSet.has(key)) {
        seenQuestions.add(key);
        uniqueQuestions.push(q);
      }
    }

    setDeck({ answers: uniqueAnswers, questions: uniqueQuestions });
  }, [activeDeckId, getStorageKey]);

  useEffect(() => {
    // Migration and initial load
    const storedDecks = JSON.parse(localStorage.getItem('deck_list') || '[]');
    if (storedDecks.length === 0) {
      const initialDecks: DeckMetadata[] = [
        { id: 'default', name: '預設資料庫', createdAt: Date.now() }
      ];
      localStorage.setItem('deck_list', JSON.stringify(initialDecks));
      
      // Migrate old data to default if it exists
      const oldAnswers = localStorage.getItem('custom_answers');
      if (oldAnswers) {
        localStorage.setItem('deck_default_custom_answers', oldAnswers);
        localStorage.setItem('deck_default_deleted_answers', localStorage.getItem('deleted_answers') || '[]');
        localStorage.setItem('deck_default_custom_questions', localStorage.getItem('custom_questions') || '[]');
        localStorage.setItem('deck_default_deleted_questions', localStorage.getItem('deleted_questions') || '[]');
        
        // Clean up old keys
        localStorage.removeItem('custom_answers');
        localStorage.removeItem('deleted_answers');
        localStorage.removeItem('custom_questions');
        localStorage.removeItem('deleted_questions');
      }
    }
  }, []);

  useEffect(() => {
    loadDeck();
  }, [activeDeckId, loadDeck]);

  const createDeck = (name: string) => {
    const id = `deck_${Date.now()}`;
    const newDeck: DeckMetadata = { id, name, createdAt: Date.now() };
    const newList = [...decks, newDeck];
    safeSetItem('deck_list', JSON.stringify(newList));
    setDecks(newList);
    switchDeck(id);
    return id;
  };

  const deleteDeck = (id: string) => {
    if (id === 'default') return false; // Cannot delete default
    const newList = decks.filter(d => d.id !== id);
    safeSetItem('deck_list', JSON.stringify(newList));
    setDecks(newList);
    
    // Clean up data
    localStorage.removeItem(getStorageKey('custom_answers', id));
    localStorage.removeItem(getStorageKey('deleted_answers', id));
    localStorage.removeItem(getStorageKey('custom_questions', id));
    localStorage.removeItem(getStorageKey('deleted_questions', id));

    if (activeDeckId === id) {
      switchDeck('default');
    }
    return true;
  };

  const clearDeck = (id: string) => {
    // Clean up data
    localStorage.removeItem(getStorageKey('custom_answers', id));
    localStorage.removeItem(getStorageKey('deleted_answers', id));
    localStorage.removeItem(getStorageKey('custom_questions', id));
    localStorage.removeItem(getStorageKey('deleted_questions', id));

    // 確保要有一組可以遊玩的卡組 (Ensure there is a playable deck)
    if (id === 'default') {
      const basicAnswers = ['這是一個好遊戲', '填空派對', '開心的笑容'];
      const basicQuestions = [{ segmentA: '今天玩了', segmentB: '，感覺', segmentC: '' }];
      safeSetItem(getStorageKey('custom_answers', id), JSON.stringify(basicAnswers));
      safeSetItem(getStorageKey('custom_questions', id), JSON.stringify(basicQuestions));
    }

    if (activeDeckId === id) {
      loadDeck(id);
    }
    return true;
  };

  const resetDeckToDefault = (id: string = activeDeckId) => {
    // Only remove custom and deleted keys, keeping the base packs intact
    localStorage.removeItem(getStorageKey('custom_answers', id));
    localStorage.removeItem(getStorageKey('deleted_answers', id));
    localStorage.removeItem(getStorageKey('custom_questions', id));
    localStorage.removeItem(getStorageKey('deleted_questions', id));

    if (activeDeckId === id) {
      loadDeck(id);
    }
    return true;
  };

  const renameDeck = (id: string, newName: string) => {
    const newList = decks.map(d => d.id === id ? { ...d, name: newName } : d);
    safeSetItem('deck_list', JSON.stringify(newList));
    setDecks(newList);
    return true;
  };

  const switchDeck = (id: string) => {
    safeSetItem('current_deck_id', id);
    setActiveDeckId(id);
  };

  const addAnswer = (ans: string) => {
    const ratio = updateStorageUsage();
    if (ratio > 0.95) {
      alert('警告：儲存空間即將額滿！請考慮匯出或刪除部分卡牌，以免無法繼續新增。');
    }
    if (ratio > 0.99) {
      alert('儲存空間已滿！無法新增卡牌。');
      return false;
    }

    const trimmed = ans.trim();
    if (deck.answers.some(a => a.toLowerCase() === trimmed.toLowerCase())) return false;
    const stored = JSON.parse(localStorage.getItem(getStorageKey('custom_answers')) || '[]');
    safeSetItem(getStorageKey('custom_answers'), JSON.stringify([...stored, trimmed]));
    
    const deleted = JSON.parse(localStorage.getItem(getStorageKey('deleted_answers')) || '[]');
    const newDeleted = deleted.filter((a: string) => a.toLowerCase() !== trimmed.toLowerCase());
    safeSetItem(getStorageKey('deleted_answers'), JSON.stringify(newDeleted));
    
    loadDeck();
    return true;
  };

  const deleteAnswer = (ans: string) => {
    const custom = JSON.parse(localStorage.getItem(getStorageKey('custom_answers')) || '[]');
    const isCustom = custom.some((a: string) => a.toLowerCase() === ans.toLowerCase());
    if (isCustom) {
      safeSetItem(getStorageKey('custom_answers'), JSON.stringify(custom.filter((a: string) => a.toLowerCase() !== ans.toLowerCase())));
    } else {
      const deleted = JSON.parse(localStorage.getItem(getStorageKey('deleted_answers')) || '[]');
      if (!deleted.some((a: string) => a.toLowerCase() === ans.toLowerCase())) {
        safeSetItem(getStorageKey('deleted_answers'), JSON.stringify([...deleted, ans]));
      }
    }
    loadDeck();
  };

  const editAnswer = (oldAns: string, newAns: string) => {
    const trimmedNew = newAns.trim();
    if (!trimmedNew) return false;
    
    const isSame = oldAns.toLowerCase() === trimmedNew.toLowerCase();
    
    // Check if new name already exists in the current deck (excluding the one being edited)
    if (!isSame && deck.answers.some(a => a.toLowerCase() === trimmedNew.toLowerCase())) {
      return false;
    }

    const custom = JSON.parse(localStorage.getItem(getStorageKey('custom_answers')) || '[]');
    const deleted = JSON.parse(localStorage.getItem(getStorageKey('deleted_answers')) || '[]');
    
    let nextCustom = custom.filter((a: string) => a.toLowerCase() !== oldAns.toLowerCase());
    let nextDeleted = deleted;
    
    const wasCustom = custom.length !== nextCustom.length;
    if (!wasCustom) {
      if (!nextDeleted.some((a: string) => a.toLowerCase() === oldAns.toLowerCase())) {
        nextDeleted.push(oldAns);
      }
    }
    
    nextCustom.push(trimmedNew);
    nextDeleted = nextDeleted.filter((a: string) => a.toLowerCase() !== trimmedNew.toLowerCase());
    
    safeSetItem(getStorageKey('custom_answers'), JSON.stringify(nextCustom));
    safeSetItem(getStorageKey('deleted_answers'), JSON.stringify(nextDeleted));
    
    loadDeck();
    return true;
  };

  const addQuestion = (q: Question) => {
    const ratio = updateStorageUsage();
    if (ratio > 0.95) {
      alert('警告：儲存空間即將額滿！請考慮匯出或刪除部分卡牌，以免無法繼續新增。');
    }
    if (ratio > 0.99) {
      alert('儲存空間已滿！無法新增卡牌。');
      return false;
    }

    const segA = q.segmentA.trim();
    const segB = q.segmentB.trim();
    const segC = q.segmentC.trim();
    const exists = deck.questions.some(t => 
      t.segmentA.toLowerCase() === segA.toLowerCase() && 
      t.segmentB.toLowerCase() === segB.toLowerCase() && 
      t.segmentC.toLowerCase() === segC.toLowerCase()
    );
    if (exists) return false;
    
    const newQ = { segmentA: segA, segmentB: segB, segmentC: segC };
    const stored = JSON.parse(localStorage.getItem(getStorageKey('custom_questions')) || '[]');
    safeSetItem(getStorageKey('custom_questions'), JSON.stringify([...stored, newQ]));

    const deleted = JSON.parse(localStorage.getItem(getStorageKey('deleted_questions')) || '[]');
    const newDeleted = deleted.filter((dq: Question) => !(
      dq.segmentA.toLowerCase() === segA.toLowerCase() && 
      dq.segmentB.toLowerCase() === segB.toLowerCase() && 
      dq.segmentC.toLowerCase() === segC.toLowerCase()
    ));
    safeSetItem(getStorageKey('deleted_questions'), JSON.stringify(newDeleted));

    loadDeck();
    return true;
  };

  const deleteQuestion = (q: Question) => {
    const custom = JSON.parse(localStorage.getItem(getStorageKey('custom_questions')) || '[]');
    const isCustom = custom.some((cq: Question) => 
      cq.segmentA.toLowerCase() === q.segmentA.toLowerCase() && 
      cq.segmentB.toLowerCase() === q.segmentB.toLowerCase() && 
      cq.segmentC.toLowerCase() === q.segmentC.toLowerCase()
    );
    if (isCustom) {
      safeSetItem(getStorageKey('custom_questions'), JSON.stringify(custom.filter((cq: Question) => !(
        cq.segmentA.toLowerCase() === q.segmentA.toLowerCase() && 
        cq.segmentB.toLowerCase() === q.segmentB.toLowerCase() && 
        cq.segmentC.toLowerCase() === q.segmentC.toLowerCase()
      ))));
    } else {
      const deleted = JSON.parse(localStorage.getItem(getStorageKey('deleted_questions')) || '[]');
      const exists = deleted.some((dq: Question) => 
        dq.segmentA.toLowerCase() === q.segmentA.toLowerCase() && 
        dq.segmentB.toLowerCase() === q.segmentB.toLowerCase() && 
        dq.segmentC.toLowerCase() === q.segmentC.toLowerCase()
      );
      if (!exists) {
        safeSetItem(getStorageKey('deleted_questions'), JSON.stringify([...deleted, q]));
      }
    }
    loadDeck();
  };

  const editQuestion = (oldQ: Question, newQ: Question) => {
    const segA = newQ.segmentA.trim();
    const segB = newQ.segmentB.trim();
    const segC = newQ.segmentC.trim();
    
    const isSame = oldQ.segmentA.toLowerCase() === segA.toLowerCase() && 
                   oldQ.segmentB.toLowerCase() === segB.toLowerCase() && 
                   oldQ.segmentC.toLowerCase() === segC.toLowerCase();

    if (!isSame && deck.questions.some(t => 
      t.segmentA.toLowerCase() === segA.toLowerCase() && 
      t.segmentB.toLowerCase() === segB.toLowerCase() && 
      t.segmentC.toLowerCase() === segC.toLowerCase()
    )) {
      return false;
    }

    const custom = JSON.parse(localStorage.getItem(getStorageKey('custom_questions')) || '[]');
    const deleted = JSON.parse(localStorage.getItem(getStorageKey('deleted_questions')) || '[]');
    
    let nextCustom = custom.filter((cq: Question) => !(
      cq.segmentA.toLowerCase() === oldQ.segmentA.toLowerCase() && 
      cq.segmentB.toLowerCase() === oldQ.segmentB.toLowerCase() && 
      cq.segmentC.toLowerCase() === oldQ.segmentC.toLowerCase()
    ));
    let nextDeleted = deleted;
    
    const wasCustom = custom.length !== nextCustom.length;
    if (!wasCustom) {
      const alreadyDeleted = nextDeleted.some((dq: Question) => 
        dq.segmentA.toLowerCase() === oldQ.segmentA.toLowerCase() && 
        dq.segmentB.toLowerCase() === oldQ.segmentB.toLowerCase() && 
        dq.segmentC.toLowerCase() === oldQ.segmentC.toLowerCase()
      );
      if (!alreadyDeleted) {
        nextDeleted.push(oldQ);
      }
    }
    
    const finalNewQ = { segmentA: segA, segmentB: segB, segmentC: segC };
    nextCustom.push(finalNewQ);
    nextDeleted = nextDeleted.filter((dq: Question) => !(
      dq.segmentA.toLowerCase() === segA.toLowerCase() && 
      dq.segmentB.toLowerCase() === segB.toLowerCase() && 
      dq.segmentC.toLowerCase() === segC.toLowerCase()
    ));
    
    safeSetItem(getStorageKey('custom_questions'), JSON.stringify(nextCustom));
    safeSetItem(getStorageKey('deleted_questions'), JSON.stringify(nextDeleted));

    loadDeck();
    return true;
  };

  const bulkImport = async (data: any, onProgress?: (progress: number, message: string) => void) => {
    let addedAnswers = 0;
    let addedQuestions = 0;
    const duplicateAnswers: string[] = [];
    const duplicateQuestions: Question[] = [];

    const storedAnswers = JSON.parse(localStorage.getItem(getStorageKey('custom_answers')) || '[]');
    const deletedAnswers = JSON.parse(localStorage.getItem(getStorageKey('deleted_answers')) || '[]');
    const storedQuestions = JSON.parse(localStorage.getItem(getStorageKey('custom_questions')) || '[]');
    const deletedQuestions = JSON.parse(localStorage.getItem(getStorageKey('deleted_questions')) || '[]');

    let newCustomAnswers = [...storedAnswers];
    let newDeletedAnswers = [...deletedAnswers];
    let newCustomQuestions = [...storedQuestions];
    let newDeletedQuestions = [...deletedQuestions];

    const currentAnswersLower = new Set(deck.answers.map(a => a.toLowerCase()));
    const currentQuestionsLower = new Set(deck.questions.map(q => `${q.segmentA.toLowerCase()}|${q.segmentB.toLowerCase()}|${q.segmentC.toLowerCase()}`));

    const totalItems = (data.answers?.length || 0) + (data.questions?.length || 0);
    let processedItems = 0;
    const chunkSize = 500;

    if (data.answers && Array.isArray(data.answers)) {
      const answersToRemoveFromDeleted = new Set<string>();
      for (let i = 0; i < data.answers.length; i += chunkSize) {
        const chunk = data.answers.slice(i, i + chunkSize);
        chunk.forEach((ans: string) => {
          if (typeof ans !== 'string') return;
          const trimmed = ans.trim();
          if (!trimmed) return;
          
          const lower = trimmed.toLowerCase();
          if (currentAnswersLower.has(lower)) {
            duplicateAnswers.push(trimmed);
          } else {
            newCustomAnswers.push(trimmed);
            currentAnswersLower.add(lower);
            answersToRemoveFromDeleted.add(lower);
            addedAnswers++;
          }
        });
        processedItems += chunk.length;
        if (onProgress) {
          onProgress(Math.round((processedItems / totalItems) * 50) + 50, `正在匯入答案卡... (${processedItems}/${totalItems})`);
          await new Promise(resolve => setTimeout(resolve, 10)); // Yield to UI
        }
      }
      if (answersToRemoveFromDeleted.size > 0) {
        newDeletedAnswers = newDeletedAnswers.filter(a => !answersToRemoveFromDeleted.has(a.toLowerCase()));
      }
    }

    if (data.questions && Array.isArray(data.questions)) {
      const questionsToRemoveFromDeleted = new Set<string>();
      for (let i = 0; i < data.questions.length; i += chunkSize) {
        const chunk = data.questions.slice(i, i + chunkSize);
        chunk.forEach((q: any) => {
          if (!q || typeof q !== 'object') return;
          const segA = (q.segmentA || '').toString().trim();
          const segB = (q.segmentB || '').toString().trim();
          const segC = (q.segmentC || '').toString().trim();
          if (!segA && !segB) return;

          const key = `${segA.toLowerCase()}|${segB.toLowerCase()}|${segC.toLowerCase()}`;
          if (currentQuestionsLower.has(key)) {
            duplicateQuestions.push({ segmentA: segA, segmentB: segB, segmentC: segC });
          } else {
            newCustomQuestions.push({ segmentA: segA, segmentB: segB, segmentC: segC });
            currentQuestionsLower.add(key);
            questionsToRemoveFromDeleted.add(key);
            addedQuestions++;
          }
        });
        processedItems += chunk.length;
        if (onProgress) {
          onProgress(Math.round((processedItems / totalItems) * 50) + 50, `正在匯入題目卡... (${processedItems}/${totalItems})`);
          await new Promise(resolve => setTimeout(resolve, 10)); // Yield to UI
        }
      }
      if (questionsToRemoveFromDeleted.size > 0) {
        newDeletedQuestions = newDeletedQuestions.filter(dq => 
          !questionsToRemoveFromDeleted.has(`${dq.segmentA.toLowerCase()}|${dq.segmentB.toLowerCase()}|${dq.segmentC.toLowerCase()}`)
        );
      }
    }

    safeSetItem(getStorageKey('custom_answers'), JSON.stringify(newCustomAnswers));
    safeSetItem(getStorageKey('deleted_answers'), JSON.stringify(newDeletedAnswers));
    safeSetItem(getStorageKey('custom_questions'), JSON.stringify(newCustomQuestions));
    safeSetItem(getStorageKey('deleted_questions'), JSON.stringify(newDeletedQuestions));

    loadDeck();
    return { addedAnswers, addedQuestions, duplicateAnswers, duplicateQuestions };
  };

  const activeDeck = decks.find(d => d.id === activeDeckId) || decks[0] || { id: 'default', name: '預設資料庫' };

  return { 
    deck, 
    decks,
    activeDeck,
    storageUsage,
    addAnswer, 
    deleteAnswer, 
    editAnswer, 
    addQuestion, 
    deleteQuestion, 
    editQuestion, 
    bulkImport,
    createDeck,
    deleteDeck,
    clearDeck,
    resetDeckToDefault,
    renameDeck,
    switchDeck
  };
}
