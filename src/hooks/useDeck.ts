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
  const [decks, setDecks] = useState<DeckMetadata[]>([]);
  const [activeDeckId, setActiveDeckId] = useState<string>('default');
  const [deck, setDeck] = useState<Deck>({ answers: [], questions: [] });
  const [aiAnswers, setAiAnswers] = useState<string[]>([]);
  const [aiQuestions, setAiQuestions] = useState<Question[]>([]);

  const safeSetItem = useCallback((key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.error('Storage quota exceeded', e);
      alert('儲存空間已滿！請刪除一些卡牌或匯出後再試。');
      return false;
    }
  }, []);

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
    const uniqueAnswers = allAnswers.filter((a, index, self) => 
      index === self.findIndex((t) => t.toLowerCase() === a.toLowerCase())
    ).filter(a => !deletedAnswers.some((da: string) => da.toLowerCase() === a.toLowerCase()));

    const allQuestions = [...baseQuestions, ...storedQuestions];
    const uniqueQuestions = allQuestions.filter((q, index, self) =>
      index === self.findIndex((t) => (
        t.segmentA.toLowerCase() === q.segmentA.toLowerCase() && 
        t.segmentB.toLowerCase() === q.segmentB.toLowerCase() && 
        t.segmentC.toLowerCase() === q.segmentC.toLowerCase()
      ))
    ).filter(q => !deletedQuestions.some((dq: Question) => 
      dq.segmentA.toLowerCase() === q.segmentA.toLowerCase() && 
      dq.segmentB.toLowerCase() === q.segmentB.toLowerCase() && 
      dq.segmentC.toLowerCase() === q.segmentC.toLowerCase()
    ));

    setDeck({ answers: uniqueAnswers, questions: uniqueQuestions });
    setAiAnswers(JSON.parse(localStorage.getItem(getStorageKey('ai_answers', deckId)) || '[]'));
    setAiQuestions(JSON.parse(localStorage.getItem(getStorageKey('ai_questions', deckId)) || '[]'));
  }, [activeDeckId, getStorageKey]);

  useEffect(() => {
    // Migration and initial load
    const storedDecks = JSON.parse(localStorage.getItem('deck_list') || '[]');
    if (storedDecks.length === 0) {
      const initialDecks: DeckMetadata[] = [
        { id: 'default', name: '預設資料庫', createdAt: Date.now() }
      ];
      localStorage.setItem('deck_list', JSON.stringify(initialDecks));
      setDecks(initialDecks);
      
      // Migrate old data to default if it exists
      const oldAnswers = localStorage.getItem('custom_answers');
      if (oldAnswers) {
        localStorage.setItem('deck_default_custom_answers', oldAnswers);
        localStorage.setItem('deck_default_deleted_answers', localStorage.getItem('deleted_answers') || '[]');
        localStorage.setItem('deck_default_custom_questions', localStorage.getItem('custom_questions') || '[]');
        localStorage.setItem('deck_default_deleted_questions', localStorage.getItem('deleted_questions') || '[]');
        localStorage.setItem('deck_default_ai_answers', localStorage.getItem('ai_answers') || '[]');
        localStorage.setItem('deck_default_ai_questions', localStorage.getItem('ai_questions') || '[]');
        
        // Clean up old keys
        localStorage.removeItem('custom_answers');
        localStorage.removeItem('deleted_answers');
        localStorage.removeItem('custom_questions');
        localStorage.removeItem('deleted_questions');
        localStorage.removeItem('ai_answers');
        localStorage.removeItem('ai_questions');
      }
    } else {
      setDecks(storedDecks);
    }

    const currentId = localStorage.getItem('current_deck_id') || 'default';
    setActiveDeckId(currentId);
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
    localStorage.removeItem(getStorageKey('ai_answers', id));
    localStorage.removeItem(getStorageKey('ai_questions', id));

    if (activeDeckId === id) {
      switchDeck('default');
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

  const addAnswer = (ans: string, isAiGenerated: boolean = false) => {
    const trimmed = ans.trim();
    if (deck.answers.some(a => a.toLowerCase() === trimmed.toLowerCase())) return false;
    const stored = JSON.parse(localStorage.getItem(getStorageKey('custom_answers')) || '[]');
    safeSetItem(getStorageKey('custom_answers'), JSON.stringify([...stored, trimmed]));
    
    if (isAiGenerated) {
      const aiStored = JSON.parse(localStorage.getItem(getStorageKey('ai_answers')) || '[]');
      safeSetItem(getStorageKey('ai_answers'), JSON.stringify([...aiStored, trimmed]));
    }

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
    if (oldAns.toLowerCase() === trimmedNew.toLowerCase()) {
      deleteAnswer(oldAns);
      addAnswer(trimmedNew);
      return true;
    }
    if (deck.answers.some(a => a.toLowerCase() === trimmedNew.toLowerCase())) return false;
    deleteAnswer(oldAns);
    addAnswer(trimmedNew);
    return true;
  };

  const addQuestion = (q: Question, isAiGenerated: boolean = false) => {
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

    if (isAiGenerated) {
      const aiStored = JSON.parse(localStorage.getItem(getStorageKey('ai_questions')) || '[]');
      safeSetItem(getStorageKey('ai_questions'), JSON.stringify([...aiStored, newQ]));
    }

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
    
    if (
      oldQ.segmentA.toLowerCase() === segA.toLowerCase() && 
      oldQ.segmentB.toLowerCase() === segB.toLowerCase() && 
      oldQ.segmentC.toLowerCase() === segC.toLowerCase()
    ) {
      deleteQuestion(oldQ);
      addQuestion({ segmentA: segA, segmentB: segB, segmentC: segC });
      return true;
    }
    
    const exists = deck.questions.some(t => 
      t.segmentA.toLowerCase() === segA.toLowerCase() && 
      t.segmentB.toLowerCase() === segB.toLowerCase() && 
      t.segmentC.toLowerCase() === segC.toLowerCase()
    );
    if (exists) return false;
    
    deleteQuestion(oldQ);
    addQuestion({ segmentA: segA, segmentB: segB, segmentC: segC });
    return true;
  };

  const bulkImport = (data: any) => {
    let addedAnswers = 0;
    let addedQuestions = 0;
    let duplicateAnswers = 0;
    let duplicateQuestions = 0;

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

    if (data.answers && Array.isArray(data.answers)) {
      data.answers.forEach((ans: string) => {
        if (typeof ans !== 'string') return;
        const trimmed = ans.trim();
        if (!trimmed) return;
        
        const lower = trimmed.toLowerCase();
        if (currentAnswersLower.has(lower)) {
          duplicateAnswers++;
        } else {
          newCustomAnswers.push(trimmed);
          currentAnswersLower.add(lower);
          newDeletedAnswers = newDeletedAnswers.filter(a => a.toLowerCase() !== lower);
          addedAnswers++;
        }
      });
    }

    if (data.questions && Array.isArray(data.questions)) {
      data.questions.forEach((q: any) => {
        if (!q || typeof q !== 'object') return;
        const segA = (q.segmentA || '').toString().trim();
        const segB = (q.segmentB || '').toString().trim();
        const segC = (q.segmentC || '').toString().trim();
        if (!segA && !segB) return;

        const key = `${segA.toLowerCase()}|${segB.toLowerCase()}|${segC.toLowerCase()}`;
        if (currentQuestionsLower.has(key)) {
          duplicateQuestions++;
        } else {
          newCustomQuestions.push({ segmentA: segA, segmentB: segB, segmentC: segC });
          currentQuestionsLower.add(key);
          newDeletedQuestions = newDeletedQuestions.filter(dq => 
            `${dq.segmentA.toLowerCase()}|${dq.segmentB.toLowerCase()}|${dq.segmentC.toLowerCase()}` !== key
          );
          addedQuestions++;
        }
      });
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
    aiAnswers, 
    aiQuestions, 
    addAnswer, 
    deleteAnswer, 
    editAnswer, 
    addQuestion, 
    deleteQuestion, 
    editQuestion, 
    bulkImport,
    createDeck,
    deleteDeck,
    renameDeck,
    switchDeck
  };
}
