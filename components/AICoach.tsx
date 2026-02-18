
import React, { useState, useRef, useEffect } from 'react';
import { getCoachingResponse, generateProactiveNudge } from '../services/ai/coaching';
import { cloudService } from '../services/cloudService';
import type { ChatMessage, BondScore, GrowthLog } from '../types';
import Markdown from 'markdown-to-jsx';
import ErrorBoundary from './ErrorBoundary';
import * as schemas from '../lib/schemas';
import { sensoryService } from '../services/sensoryService';

const AICoachContent: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProactiveLoading, setIsProactiveLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const initCoach = async (user: any) => {
    const partnerCode = user.partnerCode || user.id || 'default';
    const history = await cloudService.getChatHistory(partnerCode);
    
    if (history.length > 0) {
      setMessages(history);
      return;
    }

    // If no history, generate a proactive nudge based on actual data
    setIsProactiveLoading(true);
    try {
      const [scores, logs] = await Promise.all([
        cloudService.getBondScores(partnerCode),
        cloudService.getGrowthLogs(partnerCode)
      ]);
      
      const nudge = await generateProactiveNudge(user, scores, logs);
      const initialMsg: ChatMessage = { 
        role: 'model', 
        text: nudge.data || "I've been observing the architecture of your bond. I'm here when you're ready to share.", 
        timestamp: Date.now() 
      };
      setMessages([initialMsg]);
      await cloudService.saveChatMessage(partnerCode, initialMsg);
      if (nudge.data) sensoryService.shimmer();
    } catch (err) {
      setMessages([{ role: 'model', text: "I'm listening.", timestamp: Date.now() }]);
    } finally {
      setIsProactiveLoading(false);
    }
  };

  useEffect(() => { 
    const saved = localStorage.getItem('kindred_user_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      setUserData(parsed);
      initCoach(parsed);
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
    
    sensoryService.tap();
    const userMsg: ChatMessage = { role: 'user', text: userInput, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    const partnerCode = userData.partnerCode || userData.id || 'default';
    await cloudService.saveChatMessage(partnerCode, userMsg);

    const input = userInput;
    setUserInput('');
    setIsLoading(true);

    try {
      const [scores, foundation, synthesis] = await Promise.all([
        cloudService.getBondScores(partnerCode),
        cloudService.getLatestFoundationSummary(partnerCode),
        cloudService.getLatestWeeklySynthesis(partnerCode)
      ]);

      const result = await getCoachingResponse(input, messages, userData, { 
        bondScores: scores,
        foundation: foundation?.content,
        weeklySynthesis: synthesis?.insight
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
        <div className="flex justify-between items-center mb-12">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">Oracle</h2>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-[var(--accent-green)] rounded-full animate-pulse" />
            <span className="text-[8px] font-bold uppercase tracking-widest opacity-30">
              {isProactiveLoading ? 'Scanning Resonance...' : 'Contextual Memory Active'}
            </span>
          </div>
        </div>
        <div className="space-y-12 mb-12 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
            {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}>
                  <div className={`text-xl font-light p-6 rounded-[2.5rem] max-w-[90%] ${msg.role === 'user' ? 'bg-current/10 border border-current/5' : 'bg-current/5 italic'}`}>
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
            {isProactiveLoading && (
              <div className="animate-pulse space-y-4">
                <div className="h-10 bg-current opacity-5 rounded-3xl w-3/4" />
                <div className="h-10 bg-current opacity-5 rounded-3xl w-1/2" />
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
              disabled={isLoading || isProactiveLoading}
            />
            <button 
              type="submit" 
              disabled={!userInput.trim() || isLoading || isProactiveLoading} 
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
