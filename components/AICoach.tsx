import React, { useState, useRef, useEffect } from 'react';
import { getCoachingResponse, analyzeInteractionForScores } from '../services/geminiService';
import { cloudService } from '../services/cloudService';
import type { ChatMessage, GrowthLog } from '../types';
import Markdown from 'react-markdown';

const AICoach: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages, isLoading]);

  useEffect(() => {
    const saved = localStorage.getItem('kindred_user_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      setUserData(parsed);
      
      cloudService.getChatHistory(parsed.partnerCode || 'default').then(history => {
        if (history.length === 0) {
          const initialMsg: ChatMessage = { 
            role: 'model', 
            text: "Hello. I'm listening. What's unfolding in your relationship today?", 
            timestamp: Date.now() 
          };
          setMessages([initialMsg]);
          cloudService.saveChatMessage(parsed.partnerCode || 'default', initialMsg);
        } else {
          setMessages(history);
        }
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading || !userData) return;
    
    const userMsg: ChatMessage = { role: 'user', text: userInput, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    const partnerCode = userData.partnerCode || userData.id || 'default';
    await cloudService.saveChatMessage(partnerCode, userMsg);

    const currentInput = userInput;
    setUserInput('');
    setIsLoading(true);

    try {
      const [scores, entries, foundation] = await Promise.all([
        cloudService.getBondScores(partnerCode),
        cloudService.getJournalEntries(partnerCode),
        cloudService.getLatestFoundationSummary(partnerCode)
      ]);
      const lastThreeEntries = entries.slice(0, 3);

      const res = await getCoachingResponse(currentInput, messages, { 
        bondScores: scores, 
        journalEntries: lastThreeEntries,
        foundationSummary: foundation?.content
      });
      
      const modelMsg: ChatMessage = { role: 'model', text: res, timestamp: Date.now() };
      setMessages(prev => [...prev, modelMsg]);
      await cloudService.saveChatMessage(partnerCode, modelMsg);
      
      const recentContext = messages.slice(-2).map(m => m.text).join(' ') + ' ' + currentInput + ' ' + res;
      const updates = await analyzeInteractionForScores(recentContext);
      if (updates.length > 0) {
          await cloudService.batchUpdateScores(partnerCode, updates);
          
          for (const update of updates) {
              const log: GrowthLog = {
                  id: `growth-${Date.now()}-${Math.random()}`,
                  timestamp: Date.now(),
                  category: update.category,
                  delta: update.delta,
                  context: `following your dialogue about ${currentInput.slice(0, 30)}...`
              };
              await cloudService.saveGrowthLog(partnerCode, log);
          }
      }
    } catch (err) {
      const errorMsg: ChatMessage = { 
        role: 'model', 
        text: "Something missed a beat. Try sharing again.", 
        timestamp: Date.now() 
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (ts: number) => {
      const date = new Date(ts);
      const now = new Date();
      if (date.toDateString() === now.toDateString()) return 'Today';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="py-20 border-t border-current border-opacity-5">
        <div className="flex justify-between items-center mb-12">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 heading-font">Kindred Oracle</h2>
            <button 
                onClick={() => {
                  if(confirm("Clear history?")) {
                    cloudService.clearChatHistory(userData?.partnerCode || userData?.id || 'default');
                    setMessages([{ role: 'model', text: 'History cleared.', timestamp: Date.now() }]);
                  }
                }}
                className="text-[8px] font-bold uppercase tracking-widest opacity-20 hover:opacity-100 transition-all"
            >
              Reset Memory
            </button>
        </div>

        <div className="space-y-12 mb-12 max-h-[500px] overflow-y-auto no-scrollbar pr-2">
            {messages.map((msg, i) => {
                const showTime = i === 0 || formatTimestamp(messages[i-1].timestamp) !== formatTimestamp(msg.timestamp);
                return (
                    <React.Fragment key={i}>
                        {showTime && (
                            <div className="flex justify-center my-6">
                                <span className="text-[7px] font-bold uppercase tracking-[0.3em] opacity-20 bg-current bg-opacity-5 px-3 py-1 rounded-full">{formatTimestamp(msg.timestamp)}</span>
                            </div>
                        )}
                        <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fade-in`}>
                          <span className="text-[8px] font-bold uppercase tracking-widest opacity-30 mb-2 heading-font">
                            {msg.role === 'model' ? 'Oracle' : 'You'}
                          </span>
                          <div className={`text-xl leading-relaxed prose dark:prose-invert prose-stone ${msg.role === 'user' ? 'text-right italic opacity-90 bg-current bg-opacity-5 p-4 rounded-2xl' : 'text-left font-light p-4'}`}>
                              <Markdown>{msg.text}</Markdown>
                          </div>
                        </div>
                    </React.Fragment>
                );
            })}
            {isLoading && (
                <div className="text-[8px] font-bold uppercase tracking-widest opacity-40 animate-pulse flex items-center gap-2">
                    <span className="w-1 h-1 bg-current opacity-40 rounded-full animate-bounce" />
                    <span className="w-1 h-1 bg-current opacity-40 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1 h-1 bg-current opacity-40 rounded-full animate-bounce [animation-delay:0.4s]" />
                    Architecting wisdom...
                </div>
            )}
            <div ref={chatEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="relative mt-8 group">
            <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Share a thought..."
                className="w-full py-6 bg-transparent border-b border-current border-opacity-10 focus:border-inherit outline-none text-2xl font-light italic transition-all placeholder-current placeholder-opacity-20 pr-24"
            />
            <button 
                type="submit" 
                disabled={!userInput.trim() || isLoading}
                className="absolute right-0 bottom-6 text-[10px] font-bold uppercase tracking-widest opacity-60 hover:opacity-100 transition-colors disabled:opacity-0 heading-font"
            >
                Speak
            </button>
        </form>
    </div>
  );
};

export default AICoach;