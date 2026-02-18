
import React, { useState, useEffect, useCallback } from 'react';
import { UserData } from '../types';
import { cloudService } from '../services/cloudService';
import { sensoryService } from '../services/sensoryService';
import { synthesizeRitualBlueprints } from '../services/geminiService';
import Markdown from 'markdown-to-jsx';
import { motion, AnimatePresence } from 'framer-motion';

interface RitualCategory {
  id: string;
  name: string;
  description: string;
  questions: string[];
  foundation: string;
}

const RITUAL_CATEGORIES: RitualCategory[] = [
  {
    id: 'social',
    name: 'Home & Social Life',
    description: 'How we welcome others into our sanctuary.',
    foundation: 'Gottman: External World Boundaries',
    questions: [
      "How do we handle bringing friends into our home? (Spontaneity vs. Planning)",
      "What is the blueprint for a small dinner party in our space?",
      "Who handles what roles when we host?"
    ]
  },
  {
    id: 'rhythm',
    name: 'Daily Flow & Meals',
    description: 'The recurring heartbeat of our days.',
    foundation: 'Gottman: Shared Rituals of Daily Life',
    questions: [
      "What does an ideal mealtime together look like? (Phones, music, conversation types)",
      "How do we prefer to separate at the start of the day and reunite at the end?"
    ]
  },
  {
    id: 'celebrations',
    name: 'Celebrations',
    description: 'Marking time and honoring existence.',
    foundation: 'Gottman: Honoring Shared History',
    questions: [
      "How do we celebrate big wins vs. small moments?",
      "What makes a birthday feel truly special to you? (Gifts, words, or experiences?)",
      "What are our non-negotiable anniversary traditions?"
    ]
  },
  {
    id: 'intimacy',
    name: 'Physical Intimacy',
    description: 'The sacred dance of desire and refusal.',
    foundation: 'Gottman: The Culture of Intimacy',
    questions: [
      "How do we best initiate lovemaking? (Subtle cues vs. direct requests)",
      "How can we refuse lovemaking in a way that protects the bond and feels safe?",
      "What makes you feel most physically connected outside of the bedroom?"
    ]
  }
];

const Rituals: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [selectedCat, setSelectedCat] = useState<RitualCategory | null>(null);
  const [currentStep, setCurrentStep] = useState<'browse' | 'design' | 'waiting' | 'synthesis'>('browse');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthesisText, setSynthesisText] = useState<string | null>(null);
  const [catStatuses, setCatStatuses] = useState<Record<string, 'new' | 'partial' | 'ready' | 'complete'>>({});

  const refreshStatuses = useCallback(async (user: UserData) => {
    const code = user.partnerCode || user.id;
    const statuses: Record<string, any> = {};
    for (const cat of RITUAL_CATEGORIES) {
      const [ans, synth] = await Promise.all([
        cloudService.getQuizAnswers(code, `ritual_${cat.id}`),
        cloudService.getQuizSynthesis(code, `ritual_${cat.id}`)
      ]);
      const myAns = ans.find(a => a.userId === user.id);
      const partnerAns = ans.find(a => a.userId !== user.id);
      
      if (synth) statuses[cat.id] = 'complete';
      else if (myAns && partnerAns) statuses[cat.id] = 'ready';
      else if (myAns) statuses[cat.id] = 'partial';
      else statuses[cat.id] = 'new';
    }
    setCatStatuses(statuses);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('kindred_user_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      setUserData(parsed);
      refreshStatuses(parsed);
      return cloudService.subscribeToQuizHandshake(parsed.partnerCode || 'default', (p) => {
          if (p.topic.startsWith('ritual_')) refreshStatuses(parsed);
      });
    }
  }, [refreshStatuses]);

  const handleStartDesign = (cat: RitualCategory) => {
    const status = catStatuses[cat.id];
    setSelectedCat(cat);
    sensoryService.tap();
    
    if (status === 'complete') {
       cloudService.getQuizSynthesis(userData!.partnerCode || userData!.id, `ritual_${cat.id}`).then(s => {
         setSynthesisText(s);
         setCurrentStep('synthesis');
       });
    } else if (status === 'ready') {
       performSynthesis(cat);
    } else if (status === 'partial') {
       setCurrentStep('waiting');
    } else {
       setCurrentStep('design');
       setAnswers({});
       setActiveQuestionIndex(0);
    }
  };

  const performSynthesis = async (cat: RitualCategory) => {
    if (!userData) return;
    setIsSynthesizing(true);
    setCurrentStep('waiting');
    const code = userData.partnerCode || userData.id;
    try {
      const ans = await cloudService.getQuizAnswers(code, `ritual_${cat.id}`);
      const myAns = ans.find(a => a.userId === userData.id)?.answers;
      const pAns = ans.find(a => a.userId !== userData.id)?.answers;
      
      const result = await synthesizeRitualBlueprints(cat.name, myAns, pAns);
      const text = result.data || result.error || "Synthesis complete.";
      setSynthesisText(text);
      await cloudService.saveQuizSynthesis(code, `ritual_${cat.id}`, text);
      setCurrentStep('synthesis');
      sensoryService.success();
      refreshStatuses(userData);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const submitAnswer = () => {
    if (!selectedCat || !userData) return;
    sensoryService.tap();
    if (activeQuestionIndex < selectedCat.questions.length - 1) {
      setActiveQuestionIndex(prev => prev + 1);
    } else {
      const code = userData.partnerCode || userData.id;
      cloudService.saveQuizAnswer(code, userData.id, `ritual_${selectedCat.id}`, answers);
      cloudService.sendQuizHandshake(code, userData.id, `ritual_${selectedCat.id}`);
      refreshStatuses(userData);
      setCurrentStep('waiting');
    }
  };

  if (currentStep === 'browse') return (
    <div className="px-6 py-12 max-w-xl mx-auto animate-fade-in text-[var(--text-primary)]">
      <header className="mb-16">
        <h1 className="text-clamp-6xl font-light mb-2">Rituals.</h1>
        <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-40 heading-font">Architecting Shared Meaning</p>
      </header>

      <div className="space-y-6">
        {RITUAL_CATEGORIES.map(cat => (
          <button 
            key={cat.id} 
            onClick={() => handleStartDesign(cat)}
            className="w-full text-left p-10 border border-current border-opacity-5 rounded-[3rem] bg-current/2 hover:bg-current/5 transition-all flex flex-col group relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-4 relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent-green)] opacity-60">{cat.foundation}</span>
              <span className="text-[9px] font-bold uppercase opacity-30 group-hover:opacity-100 transition-all">{catStatuses[cat.id] || 'new'}</span>
            </div>
            <h3 className="text-3xl font-light mb-2 relative z-10">{cat.name}</h3>
            <p className="text-xs italic opacity-40 font-light leading-relaxed max-w-[80%] relative z-10">{cat.description}</p>
            <div className="absolute inset-0 bg-current opacity-0 group-hover:opacity-2 transition-opacity" />
          </button>
        ))}
      </div>
    </div>
  );

  if (currentStep === 'design') return (
    <div className="px-6 py-12 max-w-xl mx-auto animate-fade-in text-[var(--text-primary)] min-h-screen">
      <header className="mb-16">
        <div className="flex justify-between items-center mb-6">
          <span className="text-[9px] font-bold uppercase tracking-[0.4em] opacity-40">{selectedCat?.name} Blueprint</span>
          <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">{activeQuestionIndex + 1} / {selectedCat?.questions.length}</span>
        </div>
        <div className="w-full h-[1px] bg-current opacity-10">
          <div className="h-full bg-[var(--accent-green)] transition-all duration-700" style={{ width: `${((activeQuestionIndex + 1) / (selectedCat?.questions.length || 1)) * 100}%` }} />
        </div>
      </header>

      <div className="mb-12">
        <h2 className="text-3xl font-light italic leading-snug mb-12">"{selectedCat?.questions[activeQuestionIndex]}"</h2>
        <textarea 
          value={answers[activeQuestionIndex] || ''} 
          onChange={(e) => setAnswers({...answers, [activeQuestionIndex]: e.target.value})}
          placeholder="Draw your vision here..."
          className="w-full h-64 bg-current/5 border-b border-current border-opacity-10 focus:border-opacity-60 focus:outline-none transition-all resize-none placeholder-current placeholder-opacity-20 text-xl font-light italic leading-relaxed p-8 rounded-t-[3rem]"
        />
      </div>

      <button 
        disabled={!(answers[activeQuestionIndex]?.trim())}
        onClick={submitAnswer}
        className="w-full py-7 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full text-xs font-bold uppercase tracking-[0.4em] heading-font shadow-2xl transition-all disabled:opacity-10"
      >
        Commit Fragment
      </button>
    </div>
  );

  if (currentStep === 'waiting') return (
    <div className="fixed inset-0 bg-[var(--bg-primary)] flex flex-col items-center justify-center p-8 text-center animate-fade-in">
       <div className="w-24 h-24 border border-current border-opacity-5 rounded-full flex items-center justify-center mb-12 relative">
          <div className="absolute inset-0 border border-[var(--accent-green)] rounded-full animate-ping opacity-20" />
          <div className="w-2 h-2 bg-[var(--accent-green)] rounded-full animate-pulse" />
       </div>
       <h2 className="text-clamp-5xl font-light mb-4">Blueprint Staged.</h2>
       <p className="text-xl italic opacity-60 font-light max-w-sm mb-16">
          The Oracle is holding your vision while {userData?.partnerName} drafts their blueprint.
       </p>
       <button onClick={() => setCurrentStep('browse')} className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-40 hover:opacity-100 border-b border-current pb-2 transition-all">Back to Rituals</button>
    </div>
  );

  if (currentStep === 'synthesis') return (
    <div className="px-6 py-12 max-w-xl mx-auto animate-fade-in text-[var(--text-primary)] pb-40">
       <header className="mb-16">
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-[var(--accent-green)] mb-2 block">{selectedCat?.foundation}</span>
          <h1 className="text-clamp-5xl font-light">{selectedCat?.name} Synthesis.</h1>
       </header>

       <div className="prose dark:prose-invert prose-xl leading-relaxed font-light italic bg-current/2 p-10 rounded-[3.5rem] border border-current border-opacity-5 shadow-inner">
          <Markdown>{synthesisText || ""}</Markdown>
       </div>

       <div className="fixed bottom-12 left-0 right-0 px-8 flex justify-center z-50">
          <button 
            onClick={() => { sensoryService.tap(); setCurrentStep('browse'); }} 
            className="w-full max-w-md py-7 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-[10px] tracking-[0.4em] shadow-2xl active:scale-95 transition-all heading-font"
          >
            Internalize Ritual Design
          </button>
       </div>
    </div>
  );

  return null;
};

export default Rituals;
