
import React, { useState, useEffect, useCallback } from 'react';
import { QuizQuestion, UserData } from '../types';
import { generateQuizQuestions, interpretQuizResults, analyzeInteractionForScores } from '../services/geminiService';
import { cloudService } from '../services/cloudService';
import Markdown from 'markdown-to-jsx';
import { sensoryService } from '../services/sensoryService';

type TopicStatus = 'new' | 'waiting' | 'ready' | 'completed';

interface ResearchTopic {
  id: string;
  name: string;
  foundation: string;
  description: string;
}

const Quiz: React.FC = () => {
  const [topic, setTopic] = useState<ResearchTopic | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentStep, setCurrentStep] = useState<'topic' | 'quiz' | 'waiting' | 'results'>('topic');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interpretation, setInterpretation] = useState('');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [topicStatuses, setTopicStatuses] = useState<Record<string, TopicStatus>>({});

  const topics: ResearchTopic[] = [
    { id: 'love_maps', name: 'Love Maps', foundation: 'The Gottman Method', description: 'Assessing your knowledge of each other’s inner world.' },
    { id: 'attachment', name: 'Attachment Patterns', foundation: 'Attachment Theory', description: 'Exploring your emotional bond and security needs.' },
    { id: 'languages', name: 'Love Languages', foundation: 'The Chapman Framework', description: 'Identifying how you best give and receive affection.' },
    { id: 'horsemen', name: 'Conflict Styles', foundation: 'The Gottman Method', description: 'Assessing resilience and communication during friction.' },
    { id: 'meaning', name: 'Shared Meaning', foundation: 'Existential Psychology', description: 'Aligning on life goals, values, and legacies.' }
  ];

  const fetchTopicStatuses = useCallback(async (user: UserData) => {
    const code = user.partnerCode || user.id || 'default';
    setStatusLoading(true);
    const statuses: Record<string, TopicStatus> = {};
    for (const t of topics) {
        const [ans, synthesis] = await Promise.all([cloudService.getQuizAnswers(code, t.name), cloudService.getQuizSynthesis(code, t.name)]);
        const myAns = ans.find((a: any) => a.userId === user.id);
        const partnerAns = ans.find((a: any) => a.userId !== user.id);
        if (synthesis) statuses[t.id] = 'completed';
        else if (myAns && partnerAns) statuses[t.id] = 'ready';
        else if (myAns) statuses[t.id] = 'waiting';
        else statuses[t.id] = 'new';
    }
    setTopicStatuses(statuses);
    setStatusLoading(false);
  }, []);

  const generateInsights = useCallback(async (quizTopicName: string, myAns: any, pAns: any) => {
    if (!userData || isLoading) return;
    const partnerCode = userData.partnerCode || 'default';
    setIsLoading(true);
    try {
      const resResult = await interpretQuizResults(quizTopicName, Object.values(myAns), Object.values(pAns));
      const resText = resResult.data || resResult.error || "Reflections complete.";
      setInterpretation(resText);
      setCurrentStep('results');
      await cloudService.saveQuizSynthesis(partnerCode, quizTopicName, resText);
      
      const analysisResult = await analyzeInteractionForScores(resText);
      let updates = analysisResult.data || [];
      
      // Explicitly boost "Knowledge" if Love Maps is completed
      if (quizTopicName === 'Love Maps') {
        updates = [...updates, { category: 'Knowledge', delta: 2.5 }];
      }

      if (updates.length > 0) {
          await cloudService.batchUpdateScores(partnerCode, updates);
          for (const update of updates) {
              await cloudService.saveGrowthLog(partnerCode, { id: `growth-${Date.now()}`, timestamp: Date.now(), category: update.category, delta: update.delta, context: `following ${quizTopicName} exploration.` });
          }
      }
      fetchTopicStatuses(userData);
      sensoryService.success();
    } finally { setIsLoading(false); }
  }, [userData, isLoading, fetchTopicStatuses]);

  const checkPartnerStatus = useCallback(async () => {
    if (!userData || !topic) return;
    const partnerCode = userData.partnerCode || 'default';
    const existingSynthesis = await cloudService.getQuizSynthesis(partnerCode, topic.name);
    if (existingSynthesis) { setInterpretation(existingSynthesis); setCurrentStep('results'); return; }
    const allAnswers = await cloudService.getQuizAnswers(partnerCode, topic.name);
    const partner = allAnswers.find((a: any) => a.userId !== userData.id);
    const me = allAnswers.find((a: any) => a.userId === userData.id);
    if (partner && me) generateInsights(topic.name, me.answers, partner.answers);
  }, [userData, topic, generateInsights]);

  useEffect(() => {
    const saved = localStorage.getItem('kindred_user_data');
    if (saved) {
        const parsed = JSON.parse(saved);
        setUserData(parsed);
        fetchTopicStatuses(parsed);
        return cloudService.subscribeToQuizHandshake(parsed.partnerCode || 'default', (payload) => {
          if (payload.userId !== parsed.id && payload.topic === topic?.name) checkPartnerStatus();
        });
    }
  }, [fetchTopicStatuses, topic, checkPartnerStatus]);

  const startQuiz = async (selectedTopic: ResearchTopic) => {
    const status = topicStatuses[selectedTopic.id];
    setTopic(selectedTopic);
    sensoryService.tap();
    
    if (status === 'completed' || status === 'ready') {
        const code = userData!.partnerCode || userData!.id;
        const synth = await cloudService.getQuizSynthesis(code, selectedTopic.name);
        if (synth) { setInterpretation(synth); setCurrentStep('results'); }
        else {
           const ans = await cloudService.getQuizAnswers(code, selectedTopic.name);
           generateInsights(selectedTopic.name, ans.find(a=>a.userId===userData?.id).answers, ans.find(a=>a.userId!==userData?.id).answers);
        }
        return;
    }
    if (status === 'waiting') { setCurrentStep('waiting'); return; }
    setIsLoading(true);
    try {
      const result = await generateQuizQuestions(selectedTopic.name);
      if (result.data) {
        setQuestions(result.data); setCurrentQuestionIndex(0); setAnswers({}); setCurrentStep('quiz');
      } else {
        setError(result.error);
      }
    } finally { setIsLoading(false); }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    sensoryService.tap();
    const updated = { ...answers, [questionId]: answer }; setAnswers(updated);
    if (currentQuestionIndex < questions.length - 1) setCurrentQuestionIndex(prev => prev + 1);
    else {
      const partnerCode = userData!.partnerCode || 'default';
      cloudService.saveQuizAnswer(partnerCode, userData!.id, topic!.name, updated);
      cloudService.sendQuizHandshake(partnerCode, userData!.id, topic!.name);
      setCurrentStep('waiting');
    }
  };

  if (currentStep === 'topic') return (
    <div className="px-6 py-12 max-w-xl mx-auto animate-fade-in text-[var(--text-primary)]">
      <header className="mb-16">
        <h1 className="text-clamp-6xl font-light mb-2">Echoes.</h1>
        <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-40 heading-font">Research-Backed Assessments</p>
      </header>

      <div className="space-y-4">
        {statusLoading ? Array(5).fill(0).map((_, i) => (
          <div key={i} className="h-28 animate-pulse bg-current opacity-5 border-b border-current border-opacity-5 rounded-3xl" />
        )) : topics.map(t => (
          <button 
            key={t.id} 
            disabled={isLoading} 
            onClick={() => startQuiz(t)} 
            className="w-full text-left p-8 border border-current border-opacity-5 rounded-[2rem] bg-current/2 hover:bg-current/5 transition-all flex flex-col group mb-4"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[var(--accent-green)] opacity-60">{t.foundation}</span>
              <span className="text-[9px] font-bold uppercase heading-font opacity-20 group-hover:opacity-100 transition-opacity">
                {isLoading && topic?.id === t.id ? 'Syncing...' : topicStatuses[t.id]}
              </span>
            </div>
            <h3 className="text-3xl font-light mb-2">{t.name}</h3>
            <p className="text-xs italic opacity-40 font-light leading-relaxed">{t.description}</p>
          </button>
        ))}
      </div>
    </div>
  );

  if (currentStep === 'quiz') return (
    <div className="px-6 py-12 max-w-xl mx-auto animate-fade-in text-[var(--text-primary)]">
      <header className="mb-12">
        <div className="flex justify-between items-center mb-4">
          <span className="text-[9px] font-bold uppercase tracking-widest opacity-30">{topic?.name} Assessment</span>
          <span className="text-[9px] font-bold uppercase tracking-widest opacity-30">{currentQuestionIndex + 1} / {questions.length}</span>
        </div>
        <div className="w-full h-1 bg-current opacity-5 rounded-full overflow-hidden">
          <div className="h-full bg-[var(--accent-green)] transition-all duration-500" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }} />
        </div>
      </header>

      <div className="mb-12">
        <h2 className="text-clamp-4xl font-light leading-snug">{questions[currentQuestionIndex]?.question}</h2>
      </div>

      <div className="space-y-4">
        {questions[currentQuestionIndex]?.options?.map(opt => (
          <button 
            key={opt} 
            onClick={() => handleAnswer(questions[currentQuestionIndex].id, opt)} 
            className="w-full text-left p-8 border border-current border-opacity-10 rounded-3xl text-xl font-light italic hover:bg-current hover:bg-opacity-5 transition-all"
          >
            {opt}
          </button>
        ))}
        {questions[currentQuestionIndex]?.type === 'open' && (
           <div className="space-y-6">
             <textarea 
               placeholder="Share your thoughts..."
               className="w-full h-40 bg-current/5 border-b border-current border-opacity-10 focus:border-opacity-60 focus:outline-none transition-all resize-none placeholder-current placeholder-opacity-20 text-xl font-light italic leading-relaxed p-6 rounded-t-3xl"
               onBlur={(e) => { if(e.target.value) handleAnswer(questions[currentQuestionIndex].id, e.target.value); }}
             />
             <p className="text-[10px] opacity-20 text-center uppercase tracking-widest font-bold">Reflect and tap away to continue</p>
           </div>
        )}
      </div>
    </div>
  );

  if (currentStep === 'waiting') return (
    <div className="px-6 py-12 max-w-xl mx-auto text-center flex flex-col items-center justify-center min-h-[50vh] text-[var(--text-primary)]">
      <h2 className="text-clamp-5xl font-light mb-6">Internalized.</h2>
      <p className="text-xl opacity-70 italic mb-12">The Oracle is waiting for {userData?.partnerName || 'your partner'} to complete the calibration.</p>
      <div className="w-16 h-16 border-2 border-current border-opacity-5 border-t-[var(--accent-green)] animate-spin rounded-full" />
      <button onClick={() => setCurrentStep('topic')} className="mt-20 text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 hover:opacity-100 border-b border-current pb-2 transition-all">Back to Echoes</button>
    </div>
  );

  if (currentStep === 'results') return (
    <div className="px-6 py-12 max-w-xl mx-auto animate-fade-in text-[var(--text-primary)]">
      <header className="mb-12">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--accent-green)] opacity-80 mb-2">Synthesis: {topic?.name}</h2>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30">Based on {topic?.foundation}</p>
      </header>
      <div className="prose dark:prose-invert prose-xl leading-relaxed font-light italic mb-20 shadow-sm p-1">
        <Markdown>{interpretation}</Markdown>
      </div>
      <div className="fixed bottom-12 left-0 right-0 px-8 flex justify-center z-[50]">
        <button 
          onClick={() => { sensoryService.tap(); setCurrentStep('topic'); }} 
          className="w-full max-w-md py-6 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full font-bold uppercase text-xs tracking-widest shadow-2xl active:scale-95 transition-all heading-font"
        >
          Return to Echoes
        </button>
      </div>
    </div>
  );
  return null;
};

export default Quiz;
