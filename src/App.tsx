import React, { useState } from 'react';
import { Home } from './components/Home';
import { Game } from './components/Game';
import { Studio } from './components/Studio';
import { useDeck } from './hooks/useDeck';

type ViewState = 'home' | 'game' | 'studio';

export default function App() {
  const [view, setView] = useState<ViewState>('home');
  const { 
    deck, 
    decks,
    activeDeck,
    storageUsage,
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
    clearDeck,
    resetDeckToDefault,
    renameDeck,
    switchDeck
  } = useDeck();

  return (
    <>
      {view === 'home' && (
        <Home 
          deck={deck} 
          decks={decks}
          activeDeck={activeDeck}
          onStartGame={() => setView('game')} 
          onOpenStudio={() => setView('studio')} 
          createDeck={createDeck}
          deleteDeck={deleteDeck}
          clearDeck={clearDeck}
          renameDeck={renameDeck}
          switchDeck={switchDeck}
        />
      )}
      {view === 'game' && (
        <Game 
          deck={deck} 
          activeDeck={activeDeck}
          onBack={() => setView('home')} 
        />
      )}
      {view === 'studio' && (
        <Studio 
          deck={deck}
          activeDeck={activeDeck}
          storageUsage={storageUsage}
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
          resetDeckToDefault={resetDeckToDefault}
        />
      )}
    </>
  );
}
