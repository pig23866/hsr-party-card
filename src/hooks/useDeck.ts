import { useState, useEffect } from 'react';
import { packs, Question } from '../data/packs';

export interface Deck {
  answers: string[];
  questions: Question[];
}

export function useDeck() {
  const [deck, setDeck] = useState<Deck>({ answers: [], questions: [] });
  const [aiAnswers, setAiAnswers] = useState<string[]>([]);
  const [aiQuestions, setAiQuestions] = useState<Question[]>([]);

  const loadDeck = () => {
    const storedAnswers = JSON.parse(localStorage.getItem('custom_answers') || '[]');
    const deletedAnswers = JSON.parse(localStorage.getItem('deleted_answers') || '[]');
    const storedQuestions = JSON.parse(localStorage.getItem('custom_questions') || '[]');
    const deletedQuestions = JSON.parse(localStorage.getItem('deleted_questions') || '[]');

    const allAnswers = [...packs.flatMap(p => p.answers), ...storedAnswers];
    // Case-insensitive unique answers
    const uniqueAnswers = allAnswers.filter((a, index, self) => 
      index === self.findIndex((t) => t.toLowerCase() === a.toLowerCase())
    ).filter(a => !deletedAnswers.some((da: string) => da.toLowerCase() === a.toLowerCase()));

    const allQuestions = [...packs.flatMap(p => p.questions), ...storedQuestions];
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
    setAiAnswers(JSON.parse(localStorage.getItem('ai_answers') || '[]'));
    setAiQuestions(JSON.parse(localStorage.getItem('ai_questions') || '[]'));
  };

  useEffect(() => {
    loadDeck();
  }, []);

  const addAnswer = (ans: string, isAiGenerated: boolean = false) => {
    const trimmed = ans.trim();
    if (deck.answers.some(a => a.toLowerCase() === trimmed.toLowerCase())) return false;
    const stored = JSON.parse(localStorage.getItem('custom_answers') || '[]');
    localStorage.setItem('custom_answers', JSON.stringify([...stored, trimmed]));
    
    if (isAiGenerated) {
      const aiStored = JSON.parse(localStorage.getItem('ai_answers') || '[]');
      localStorage.setItem('ai_answers', JSON.stringify([...aiStored, trimmed]));
    }

    // If it was previously deleted, remove from deleted
    const deleted = JSON.parse(localStorage.getItem('deleted_answers') || '[]');
    const newDeleted = deleted.filter((a: string) => a.toLowerCase() !== trimmed.toLowerCase());
    localStorage.setItem('deleted_answers', JSON.stringify(newDeleted));
    
    loadDeck();
    return true;
  };

  const deleteAnswer = (ans: string) => {
    const custom = JSON.parse(localStorage.getItem('custom_answers') || '[]');
    const isCustom = custom.some((a: string) => a.toLowerCase() === ans.toLowerCase());
    if (isCustom) {
      localStorage.setItem('custom_answers', JSON.stringify(custom.filter((a: string) => a.toLowerCase() !== ans.toLowerCase())));
    } else {
      const deleted = JSON.parse(localStorage.getItem('deleted_answers') || '[]');
      if (!deleted.some((a: string) => a.toLowerCase() === ans.toLowerCase())) {
        localStorage.setItem('deleted_answers', JSON.stringify([...deleted, ans]));
      }
    }
    loadDeck();
  };

  const editAnswer = (oldAns: string, newAns: string) => {
    const trimmedNew = newAns.trim();
    if (oldAns.toLowerCase() === trimmedNew.toLowerCase()) {
      // Just case change, allow it by deleting old and adding new
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
    const stored = JSON.parse(localStorage.getItem('custom_questions') || '[]');
    localStorage.setItem('custom_questions', JSON.stringify([...stored, newQ]));

    if (isAiGenerated) {
      const aiStored = JSON.parse(localStorage.getItem('ai_questions') || '[]');
      localStorage.setItem('ai_questions', JSON.stringify([...aiStored, newQ]));
    }

    const deleted = JSON.parse(localStorage.getItem('deleted_questions') || '[]');
    const newDeleted = deleted.filter((dq: Question) => !(
      dq.segmentA.toLowerCase() === segA.toLowerCase() && 
      dq.segmentB.toLowerCase() === segB.toLowerCase() && 
      dq.segmentC.toLowerCase() === segC.toLowerCase()
    ));
    localStorage.setItem('deleted_questions', JSON.stringify(newDeleted));

    loadDeck();
    return true;
  };

  const deleteQuestion = (q: Question) => {
    const custom = JSON.parse(localStorage.getItem('custom_questions') || '[]');
    const isCustom = custom.some((cq: Question) => 
      cq.segmentA.toLowerCase() === q.segmentA.toLowerCase() && 
      cq.segmentB.toLowerCase() === q.segmentB.toLowerCase() && 
      cq.segmentC.toLowerCase() === q.segmentC.toLowerCase()
    );
    if (isCustom) {
      localStorage.setItem('custom_questions', JSON.stringify(custom.filter((cq: Question) => !(
        cq.segmentA.toLowerCase() === q.segmentA.toLowerCase() && 
        cq.segmentB.toLowerCase() === q.segmentB.toLowerCase() && 
        cq.segmentC.toLowerCase() === q.segmentC.toLowerCase()
      ))));
    } else {
      const deleted = JSON.parse(localStorage.getItem('deleted_questions') || '[]');
      const exists = deleted.some((dq: Question) => 
        dq.segmentA.toLowerCase() === q.segmentA.toLowerCase() && 
        dq.segmentB.toLowerCase() === q.segmentB.toLowerCase() && 
        dq.segmentC.toLowerCase() === q.segmentC.toLowerCase()
      );
      if (!exists) {
        localStorage.setItem('deleted_questions', JSON.stringify([...deleted, q]));
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
      // Just case/whitespace change
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

    const storedAnswers = JSON.parse(localStorage.getItem('custom_answers') || '[]');
    const deletedAnswers = JSON.parse(localStorage.getItem('deleted_answers') || '[]');
    const storedQuestions = JSON.parse(localStorage.getItem('custom_questions') || '[]');
    const deletedQuestions = JSON.parse(localStorage.getItem('deleted_questions') || '[]');

    let newCustomAnswers = [...storedAnswers];
    let newDeletedAnswers = [...deletedAnswers];
    let newCustomQuestions = [...storedQuestions];
    let newDeletedQuestions = [...deletedQuestions];

    // Build sets for fast lookup
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

    localStorage.setItem('custom_answers', JSON.stringify(newCustomAnswers));
    localStorage.setItem('deleted_answers', JSON.stringify(newDeletedAnswers));
    localStorage.setItem('custom_questions', JSON.stringify(newCustomQuestions));
    localStorage.setItem('deleted_questions', JSON.stringify(newDeletedQuestions));

    loadDeck();
    return { addedAnswers, addedQuestions, duplicateAnswers, duplicateQuestions };
  };

  return { deck, aiAnswers, aiQuestions, addAnswer, deleteAnswer, editAnswer, addQuestion, deleteQuestion, editQuestion, bulkImport };
}
