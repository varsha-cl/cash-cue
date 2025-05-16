import React, { createContext, useContext, useEffect, useState } from 'react';

interface TTSContextType {
  isTtsOn: boolean;
  setIsTtsOn: (on: boolean) => void;
  synth: SpeechSynthesis | null;
}

const TTSContext = createContext<TTSContextType | undefined>(undefined);

export const TTSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isTtsOn, setIsTtsOn] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tts_on') !== 'no';
    }
    return true;
  });

  const [synth, setSynth] = useState<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSynth(window.speechSynthesis);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tts_on', isTtsOn ? 'yes' : 'no');
    }
  }, [isTtsOn]);

  return (
    <TTSContext.Provider value={{ isTtsOn, setIsTtsOn, synth }}>
      {children}
    </TTSContext.Provider>
  );
};

export const useTTS = () => {
  const context = useContext(TTSContext);
  if (context === undefined) {
    throw new Error('useTTS must be used within a TTSProvider');
  }
  return context;
};
