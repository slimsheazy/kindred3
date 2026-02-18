import React, { useState, useEffect } from 'react';
import { getDailyPrompt } from '../services/geminiService';
import { cloudService } from '../services/cloudService';
import { UserData } from '../types';

const DailyPrompt: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [myAnswer, setMyAnswer] = useState('');
  const [myAnswerSubmitted, setMyAnswerSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('kindred_user_data');
    if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUserData(parsed);
    }
  }, []);

  useEffect(() => {
    const fetchPrompt = async () => {
      setIsLoading(true);
      const result = await getDailyPrompt();
      if (result.error) setError(result.error);
      const sanitized = (result.data || "What do you appreciate about your partner today?").replace(/^["'“”]|["'“”]$/g, '').trim();
      setPrompt(sanitized);
      setIsLoading(false);
    };
    fetchPrompt();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (myAnswer.trim() && userData) {
      setMyAnswerSubmitted(true);
      await cloudService.submitPromptAnswer(userData.partnerCode || 'default', userData.id, myAnswer);
    }
  };
  
  return (
    <div className="py-8 animate-fade-in mb-4" role="region" aria-labelledby="daily-reflection-title">
      <div className="flex items-center opacity-40 mb-8 justify-center">
        <h2 id="daily-reflection-title" className="text-[9px] font-bold uppercase tracking-[0.4em] heading-font">Daily Reflection</h2>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3 px-2" aria-hidden="true">
            <div className="h-4 bg-current opacity-10 rounded-full w-full"></div>
            <div className="h-4 bg-current opacity-10 rounded-full w-4/5 mx-auto"></div>
        </div>
      ) : (
        <p className="text-[var(--text-primary)] font-medium text-2xl leading-snug mb-12 italic text-center px-4">
          "{prompt}"
        </p>
      )}

      {error && <p className="text-[10px] text-center mb-4 text-[var(--accent-pink)] uppercase font-bold tracking-widest opacity-40">Oracle Sync Disturbed</p>}

      {myAnswerSubmitted ? (
        <div className="text-center py-10" role="status">
          <p className="opacity-60 text-sm italic tracking-wide">Shared with {userData?.partnerName || 'Partner'}.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="px-2" aria-label="Respond to daily reflection">
          <label htmlFor="daily-reflection-answer" className="sr-only">Your reflection response</label>
          <textarea
            id="daily-reflection-answer"
            value={myAnswer}
            onChange={(e) => setMyAnswer(e.target.value)}
            placeholder="Type your heart here..."
            className="w-full h-40 bg-current/5 border-b border-current border-opacity-10 focus:border-opacity-60 focus:outline-none transition-all resize-none placeholder-current placeholder-opacity-20 text-xl font-light italic leading-relaxed mb-8 p-6 rounded-t-3xl"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="w-full bg-theme-inverted font-bold py-6 rounded-full hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-10 text-[10px] tracking-[0.3em] uppercase heading-font shadow-2xl"
            disabled={!myAnswer.trim() || isLoading}
          >
            Commit to Archive
          </button>
        </form>
      )}
    </div>
  );
};

export default DailyPrompt;