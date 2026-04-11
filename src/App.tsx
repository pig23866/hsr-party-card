import React, { useState, useEffect } from 'react';
import { Home } from './components/Home';
import { Game } from './components/Game';
import { Studio } from './components/Studio';
import { Onboarding } from './components/Onboarding';
import { useDeck } from './hooks/useDeck';

type ViewState = 'home' | 'game' | 'studio';

export default function App() {
  const [view, setView] = useState<ViewState>(() => {
    const saved = sessionStorage.getItem('app_view_state');
    return (saved as ViewState) || 'home';
  });

  useEffect(() => {
    sessionStorage.setItem('app_view_state', view);
  }, [view]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('fill_in_party_onboarding_done');
    if (!hasSeenOnboarding) {
      setShowOnboarding(true);
    }
  }, []);

  const handleCompleteOnboarding = () => {
    localStorage.setItem('fill_in_party_onboarding_done', 'true');
    setShowOnboarding(false);
  };

  const { 
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
  } = useDeck();

  return (
    <>
      {showOnboarding && <Onboarding onComplete={handleCompleteOnboarding} />}
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
          onOpenTutorial={() => setShowOnboarding(true)}
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
