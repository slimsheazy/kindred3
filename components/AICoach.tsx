import React, { useState, useRef, useEffect } from 'react';
import { getCoachingResponse } from '../services/geminiService';
import { cloudService } from '../services/cloudService';
import type { ChatMessage } from '../types';
import Markdown from 'markdown-to-jsx';
import ErrorBoundary from './ErrorBoundary';
import * as schemas from '../lib/schemas';

const AICoachContent: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    const saved = localStorage.getItem('kindred_user_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      setUserData(parsed);
      cloudService.getChatHistory(parsed.partnerCode || 'default').then(h => 
        setMessages(h.length ? h : [{ role: 'model', text: "I'm listening.", timestamp: Date.now() }])
      );
    }
  }, []);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = schemas.ChatMessageSchema.safeParse(userInput);
    if (!valid.success || isLoading || !userData) return;
    
    const userMsg: ChatMessage = { role: 'user', text: userInput, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    const partnerCode = userData.partnerCode || userData.id || 'default';
    await cloudService.saveChatMessage(partnerCode, userMsg);

    const input = userInput;
    setUserInput('');
    setIsLoading(true);

    try {
      const scores = await cloudService.getBondScores(partnerCode);

      const result = await getCoachingResponse(input, messages, userData, { 
        bondScores: scores
      });
      
      const modelMsg: ChatMessage = { 
        role: 'model', 
        text: result.data || result.error || "The link is fragile.", 
        timestamp: Date.now() 
      };
      setMessages(prev => [...prev, modelMsg]);
      await cloudService.saveChatMessage(partnerCode, modelMsg);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: "Sync lost. I am still here, but my connection is fading.", timestamp: Date.now() }]);
    } finally { 
      setIsLoading(false); 
    }
  };

  return (
    <div className="py-20 border-t border-current border-opacity-10">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 mb-12">Oracle</h2>
        <div className="space-y-12 mb-12 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
            {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}>
                  <div className="text-xl font-light p-4 bg-current bg-opacity-5 rounded-2xl max-w-[85%]">
                      <Markdown>{msg.text}</Markdown>
                  </div>
                </div>
            ))}
            {isLoading && (
              <div className="flex items-start animate-fade-in">
                <div className="text-xl font-light p-4 bg-current bg-opacity-5 rounded-2xl opacity-40 italic">
                  Kindred is reflecting...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
        </div>
        <form onSubmit={handleSubmit} className="relative mt-8">
            <input 
              type="text" 
              value={userInput} 
              onChange={(e) => setUserInput(e.target.value)} 
              placeholder="Share your depths..." 
              className="w-full py-6 bg-transparent border-b border-current outline-none text-2xl font-light italic pr-20" 
              disabled={isLoading}
            />
            <button 
              type="submit" 
              disabled={!userInput.trim() || isLoading} 
              className="absolute right-0 bottom-6 text-[10px] font-bold uppercase tracking-widest opacity-80 hover:opacity-100 transition-opacity disabled:opacity-20"
            >
              {isLoading ? '...' : 'Speak'}
            </button>
        </form>
    </div>
  );
};

const AICoach: React.FC = () => (
  <ErrorBoundary name="AI Coach Service">
    <AICoachContent />
  </ErrorBoundary>
);

export default AICoach;