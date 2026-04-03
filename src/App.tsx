import React, { useState } from 'react';
import { Home } from './components/Home';
import { Game } from './components/Game';
import { Studio } from './components/Studio';
import { useDeck } from './hooks/useDeck';

type ViewState = 'home' | 'game' | 'studio';

export default function App() {
  const [view, setView] = useState<ViewState>('home');
  const { deck, aiAnswers, aiQuestions, addAnswer, deleteAnswer, editAnswer, addQuestion, deleteQuestion, editQuestion, bulkImport } = useDeck();

  return (
    <>
      {view === 'home' && (
        <Home 
          deck={deck} 
          onStartGame={() => setView('game')} 
          onOpenStudio={() => setView('studio')} 
        />
      )}
      {view === 'game' && (
        <Game 
          deck={deck} 
          onBack={() => setView('home')} 
        />
      )}
      {view === 'studio' && (
        <Studio 
          deck={deck}
          aiAnswers={aiAnswers}
          aiQuestions={aiQuestions}
          onBack={() => setView('home')}
          addAnswer={addAnswer}
          deleteAnswer={deleteAnswer}
          editAnswer={editAnswer}
          addQuestion={addQuestion}
          deleteQuestion={deleteQuestion}
          editQuestion={editQuestion}
          bulkImport={bulkImport}
        />
      )}
    </>
  );
}
