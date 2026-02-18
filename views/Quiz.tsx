import React, { useState, useEffect, useCallback } from 'react';
import { QuizQuestion, UserData, GrowthLog } from '../types';
import { generateQuizQuestions, interpretQuizResults, analyzeInteractionForScores } from '../services/geminiService';
import { cloudService } from '../services/cloudService';
import Markdown from 'markdown-to-jsx';

type TopicStatus = 'new' | 'waiting' | 'ready' | 'completed';

const Quiz: React.FC = () => {
  const [topic, setTopic] = useState('');
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

  const topics = ['Love Languages', 'Our Future', 'Memories', 'Daily Rhythms', 'Deep Desires'];

  const fetchTopicStatuses = useCallback(async (user: UserData) => {
    const code = user.partnerCode || user.id || 'default';
    setStatusLoading(true);
    const statuses: Record<string, TopicStatus> = {};
    for (const t of topics) {
        const [ans, synthesis] = await Promise.all([cloudService.getQuizAnswers(code, t), cloudService.getQuizSynthesis(code, t)]);
        const myAns = ans.find((a: any) => a.userId === user.id);
        const partnerAns = ans.find((a: any) => a.userId !== user.id);
        if (synthesis) statuses[t] = 'completed';
        else if (myAns && partnerAns) statuses[t] = 'ready';
        else if (myAns) statuses[t] = 'waiting';
        else statuses[t] = 'new';
    }
    setTopicStatuses(statuses);
    setStatusLoading(false);
  }, []);

  const generateInsights = useCallback(async (quizTopic: string, myAns: any, pAns: any) => {
    if (!userData || isLoading) return;
    const partnerCode = userData.partnerCode || 'default';
    setIsLoading(true);
    try {
      const resResult = await interpretQuizResults(quizTopic, Object.values(myAns), Object.values(pAns));
      const resText = resResult.data || resResult.error || "Reflections complete.";
      setInterpretation(resText);
      setCurrentStep('results');
      await cloudService.saveQuizSynthesis(partnerCode, quizTopic, resText);
      
      const analysisResult = await analyzeInteractionForScores(resText);
      const updates = analysisResult.data || [];
      if (updates.length > 0) {
          await cloudService.batchUpdateScores(partnerCode, updates);
          for (const update of updates) {
              await cloudService.saveGrowthLog(partnerCode, { id: `growth-${Date.now()}`, timestamp: Date.now(), category: update.category, delta: update.delta, context: `following ${quizTopic} exploration.` });
          }
      }
      fetchTopicStatuses(userData);
    } finally { setIsLoading(false); }
  }, [userData, isLoading, fetchTopicStatuses]);

  const checkPartnerStatus = useCallback(async () => {
    if (!userData || !topic) return;
    const partnerCode = userData.partnerCode || 'default';
    const existingSynthesis = await cloudService.getQuizSynthesis(partnerCode, topic);
    if (existingSynthesis) { setInterpretation(existingSynthesis); setCurrentStep('results'); return; }
    const allAnswers = await cloudService.getQuizAnswers(partnerCode, topic);
    const partner = allAnswers.find((a: any) => a.userId !== userData.id);
    const me = allAnswers.find((a: any) => a.userId === userData.id);
    if (partner && me) generateInsights(topic, me.answers, partner.answers);
  }, [userData, topic, generateInsights]);

  useEffect(() => {
    const saved = localStorage.getItem('kindred_user_data');
    if (saved) {
        const parsed = JSON.parse(saved);
        setUserData(parsed);
        fetchTopicStatuses(parsed);
        return cloudService.subscribeToQuizHandshake(parsed.partnerCode || 'default', (payload) => {
          if (payload.userId !== parsed.id && payload.topic === topic) checkPartnerStatus();
        });
    }
  }, [fetchTopicStatuses, topic, checkPartnerStatus]);

  const startQuiz = async (selectedTopic: string) => {
    const status = topicStatuses[selectedTopic];
    setTopic(selectedTopic);
    if (status === 'completed' || status === 'ready') {
        const code = userData!.partnerCode || userData!.id;
        const synth = await cloudService.getQuizSynthesis(code, selectedTopic);
        if (synth) { setInterpretation(synth); setCurrentStep('results'); }
        else {
           const ans = await cloudService.getQuizAnswers(code, selectedTopic);
           generateInsights(selectedTopic, ans.find(a=>a.userId===userData?.id).answers, ans.find(a=>a.userId!==userData?.id).answers);
        }
        return;
    }
    if (status === 'waiting') { setCurrentStep('waiting'); return; }
    setIsLoading(true);
    try {
      const result = await generateQuizQuestions(selectedTopic);
      if (result.data) {
        setQuestions(result.data); setCurrentQuestionIndex(0); setAnswers({}); setCurrentStep('quiz');
      } else {
        setError(result.error);
      }
    } finally { setIsLoading(false); }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    const updated = { ...answers, [questionId]: answer }; setAnswers(updated);
    if (currentQuestionIndex < questions.length - 1) setCurrentQuestionIndex(prev => prev + 1);
    else {
      const partnerCode = userData!.partnerCode || 'default';
      cloudService.saveQuizAnswer(partnerCode, userData!.id, topic, updated);
      cloudService.sendQuizHandshake(partnerCode, userData!.id, topic);
      setCurrentStep('waiting');
    }
  };

  if (currentStep === 'topic') return (
    <div className="px-6 py-12 max-w-xl mx-auto animate-fade-in text-[var(--text-primary)]">
      <header className="mb-16"><h1 className="text-clamp-6xl font-light mb-2">Quiz.</h1></header>
      <div className="space-y-4">
        {statusLoading ? Array(5).fill(0).map((_, i) => (
          <div key={i} className="h-24 animate-pulse bg-current opacity-5 border-b border-current border-opacity-5" />
        )) : topics.map(t => (
          <button key={t} disabled={isLoading} onClick={() => startQuiz(t)} className="w-full text-left py-10 border-b border-current border-opacity-5 flex justify-between items-center group">
            <span className="text-clamp-4xl font-light">{t}</span>
            <span className="text-[9px] font-bold uppercase heading-font opacity-20">{isLoading && topic === t ? '...' : topicStatuses[t]}</span>
          </button>
        ))}
      </div>
    </div>
  );

  if (currentStep === 'quiz') return (
    <div className="px-6 py-12 max-w-xl mx-auto animate-fade-in text-[var(--text-primary)]">
      <div className="mb-12"><h2 className="text-clamp-4xl font-light">{questions[currentQuestionIndex]?.question}</h2></div>
      <div className="space-y-4">
        {questions[currentQuestionIndex]?.options?.map(opt => (
          <button key={opt} onClick={() => handleAnswer(questions[currentQuestionIndex].id, opt)} className="w-full text-left p-6 border border-current border-opacity-10 rounded-full text-xl font-light italic">{opt}</button>
        ))}
      </div>
    </div>
  );

  if (currentStep === 'waiting') return (
    <div className="px-6 py-12 max-w-xl mx-auto text-center flex flex-col items-center justify-center min-h-[50vh] text-[var(--text-primary)]">
      <h2 className="text-clamp-5xl font-light mb-6">Archived.</h2>
      <p className="text-xl opacity-70 italic mb-12">Waiting for {userData?.partnerName || 'partner'}...</p>
      <div className="w-12 h-12 border-2 border-current border-t-transparent animate-spin rounded-full opacity-10" />
    </div>
  );

  if (currentStep === 'results') return (
    <div className="px-6 py-12 max-w-xl mx-auto animate-fade-in text-[var(--text-primary)]">
      <div className="prose dark:prose-invert prose-xl"><Markdown>{interpretation}</Markdown></div>
      <button onClick={() => setCurrentStep('topic')} className="w-full py-5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full mt-12 font-bold uppercase text-xs tracking-widest">Return</button>
    </div>
  );
  return null;
};

export default Quiz;