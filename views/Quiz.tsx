
import React, { useState, useEffect, useMemo } from 'react';
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
  const [error, setError] = useState<string | null>(null);
  const [partnerAnswers, setPartnerAnswers] = useState<any>(null);
  const [interpretation, setInterpretation] = useState('');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [topicStatuses, setTopicStatuses] = useState<Record<string, TopicStatus>>({});

  const topics = ['Love Languages', 'Our Future', 'Memories', 'Daily Rhythms', 'Deep Desires'];

  useEffect(() => {
    const saved = localStorage.getItem('kindred_user_data');
    if (saved) {
        const parsed = JSON.parse(saved);
        setUserData(parsed);
        fetchTopicStatuses(parsed);
    }
  }, []);

  const fetchTopicStatuses = async (user: UserData) => {
    const code = user.partnerCode || user.id || 'default';
    const statuses: Record<string, TopicStatus> = {};
    
    for (const t of topics) {
        const [ans, synthesis] = await Promise.all([
          cloudService.getQuizAnswers(code, t),
          cloudService.getQuizSynthesis(code, t)
        ]);
        
        const myAns = ans.find((a: any) => a.userId === user.id);
        const partnerAns = ans.find((a: any) => a.userId !== user.id);

        if (synthesis) statuses[t] = 'completed';
        else if (myAns && partnerAns) statuses[t] = 'ready';
        else if (myAns) statuses[t] = 'waiting';
        else statuses[t] = 'new';
    }
    setTopicStatuses(statuses);
  };

  useEffect(() => {
    let interval: any;
    if (currentStep === 'waiting') {
      interval = setInterval(() => {
        checkPartnerStatus();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [currentStep, topic]);

  const startQuiz = async (selectedTopic: string) => {
    const status = topicStatuses[selectedTopic];
    setTopic(selectedTopic);

    if (status === 'completed' || status === 'ready') {
        resumeQuiz(selectedTopic);
        return;
    }

    if (status === 'waiting') {
        setCurrentStep('waiting');
        return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const generated = await generateQuizQuestions(selectedTopic);
      if (generated && generated.length > 0) {
        setQuestions(generated);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setCurrentStep('quiz');
      } else {
        setError("The Oracle is momentarily quiet. Please check your API key.");
      }
    } catch (err) {
      setError("An unexpected error occurred while architecting your quiz.");
    } finally {
      setIsLoading(false);
    }
  };

  const resumeQuiz = async (selectedTopic: string) => {
    if (!userData) return;
    const code = userData.partnerCode || userData.id;
    const synthesis = await cloudService.getQuizSynthesis(code, selectedTopic);
    
    if (synthesis) {
        setInterpretation(synthesis);
        setCurrentStep('results');
    } else {
        setIsLoading(true);
        const ans = await cloudService.getQuizAnswers(code, selectedTopic);
        const myAns = ans.find((a: any) => a.userId === userData.id)?.answers;
        const partnerAns = ans.find((a: any) => a.userId !== userData.id)?.answers;
        
        if (myAns && partnerAns) {
            setAnswers(myAns);
            setPartnerAnswers(partnerAns);
            generateInsights(selectedTopic, myAns, partnerAns);
        } else {
            setCurrentStep('topic');
        }
    }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    if (!answer.trim()) return;
    const updatedAnswers = { ...answers, [questionId]: answer };
    setAnswers(updatedAnswers);
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      submitQuiz(updatedAnswers);
    }
  };

  const submitQuiz = async (finalAnswers: Record<string, string>) => {
    if (!userData) return;
    setCurrentStep('waiting');
    const partnerCode = userData.partnerCode || 'default';
    await cloudService.saveQuizAnswer(partnerCode, userData.id, topic, finalAnswers);
    fetchTopicStatuses(userData);
    checkPartnerStatus();
  };

  const checkPartnerStatus = async () => {
    if (!userData || !topic) return;
    const partnerCode = userData.partnerCode || 'default';
    const existingSynthesis = await cloudService.getQuizSynthesis(partnerCode, topic);
    if (existingSynthesis) {
      setInterpretation(existingSynthesis);
      setCurrentStep('results');
      return;
    }
    const allAnswers = await cloudService.getQuizAnswers(partnerCode, topic);
    const partner = allAnswers.find((a: any) => a.userId !== userData.id);
    const me = allAnswers.find((a: any) => a.userId === userData.id);
    if (partner && me) {
      setPartnerAnswers(partner.answers);
      generateInsights(topic, me.answers, partner.answers);
    }
  };

  const generateInsights = async (quizTopic: string, myAns: any, pAns: any) => {
    if (!userData || isLoading) return;
    const partnerCode = userData.partnerCode || 'default';
    const existing = await cloudService.getQuizSynthesis(partnerCode, quizTopic);
    if (existing) {
        setInterpretation(existing);
        setCurrentStep('results');
        return;
    }

    setIsLoading(true);
    try {
      const res = await interpretQuizResults(quizTopic, Object.values(myAns), Object.values(pAns));
      setInterpretation(res);
      setCurrentStep('results');
      await cloudService.saveQuizSynthesis(partnerCode, quizTopic, res);
      
      const updates = await analyzeInteractionForScores(res);
      if (updates.length > 0) {
          await cloudService.batchUpdateScores(partnerCode, updates);
          
          for (const update of updates) {
              const log: GrowthLog = {
                  id: `growth-${Date.now()}-${Math.random()}`,
                  timestamp: Date.now(),
                  category: update.category,
                  delta: update.delta,
                  context: `following the successful alchemy of your "${quizTopic}" exploration.`
              };
              await cloudService.saveGrowthLog(partnerCode, log);
          }
      }
      fetchTopicStatuses(userData);
    } catch (err) {
      console.error("Interpretation failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusLabel = (t: string) => {
    const status = topicStatuses[t];
    switch (status) {
        case 'waiting': return 'Awaiting Partner';
        case 'ready': return 'Alchemy Ready';
        case 'completed': return 'Synthesis Complete';
        default: return 'Initiate';
    }
  };

  if (currentStep === 'topic') {
    return (
      <div className="px-6 py-12 max-w-xl mx-auto animate-fade-in">
        <header className="mb-16">
          <h1 className="text-clamp-6xl font-light mb-2 text-[#FDFCF0]">Quiz.</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FDFCF0]/40 heading-font">Discover each other again</p>
        </header>
        <p className="text-xl text-[#FDFCF0]/70 mb-12 italic font-light leading-relaxed">Select a theme for your journey into each other's worlds.</p>
        <div className="space-y-4">
          {topics.map(t => (
            <button
              key={t}
              disabled={isLoading}
              onClick={() => startQuiz(t)}
              className="w-full text-left py-10 border-b border-white/5 hover:opacity-70 transition-all flex justify-between items-center group disabled:opacity-50"
            >
              <div>
                <span className="text-clamp-4xl font-light text-[#FDFCF0]">{t}</span>
                {topicStatuses[t] === 'completed' && (
                    <div className="mt-1 flex items-center gap-1">
                        <span className="text-[8px] font-bold text-[#A8FFB5] uppercase tracking-widest">Achieved Equilibrium</span>
                    </div>
                )}
              </div>
              <span className={`text-[9px] font-bold uppercase heading-font transition-all ${topicStatuses[t] === 'ready' ? 'text-[#A8FFB5] animate-pulse' : 'text-white/20'}`}>
                {isLoading && topic === t ? 'Designing...' : getStatusLabel(t)}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (currentStep === 'quiz') {
    const q = questions[currentQuestionIndex];
    if (!q) return null;
    return (
      <div className="px-6 py-12 max-w-xl mx-auto animate-fade-in text-[#FDFCF0]">
        <button onClick={() => setCurrentStep('topic')} className="text-white/30 text-[10px] font-bold uppercase tracking-widest mb-12 heading-font">← Exit</button>
        <div className="mb-12">
            <span className="text-[8px] font-bold uppercase tracking-widest text-white/20 block mb-2 heading-font">Step {currentQuestionIndex + 1} of {questions.length}</span>
            <h2 className="text-clamp-4xl font-light leading-tight">{q.question}</h2>
        </div>
        <div className="space-y-4">
          {q.type === 'multiple_choice' && q.options ? (
            q.options.map(opt => (
              <button
                key={opt}
                onClick={() => handleAnswer(q.id, opt)}
                className="w-full text-left p-6 border border-white/10 rounded-full hover:bg-white hover:text-[#121212] transition-all text-xl font-light italic"
              >
                {opt}
              </button>
            ))
          ) : (
            <div className="space-y-6">
              <textarea
                autoFocus
                className="w-full bg-transparent border-b border-white/10 focus:border-[#A8FFB5] outline-none text-2xl font-light italic p-4 resize-none h-40 placeholder-white/20"
                placeholder="Write from the heart..."
              />
              <button 
                onClick={(e) => {
                  const val = (e.currentTarget.previousElementSibling as HTMLTextAreaElement).value;
                  handleAnswer(q.id, val);
                }}
                className="w-full py-5 bg-[#FDFCF0] text-[#121212] font-bold rounded-full uppercase text-xs tracking-widest heading-font"
              >
                Submit Answer
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (currentStep === 'waiting') {
    return (
      <div className="px-6 py-12 max-w-xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
        <h2 className="text-clamp-5xl font-light mb-6 text-[#FDFCF0]">Waiting.</h2>
        <p className="text-xl text-[#FDFCF0]/70 italic mb-12">Your reflections are archived. We're waiting for {userData?.partnerName || 'your partner'} to complete their cycle.</p>
        <div className="w-16 h-16 border-2 border-white/5 border-t-[#A8FFB5] rounded-full animate-spin mb-12" />
        <button onClick={() => setCurrentStep('topic')} className="w-64 py-5 border border-white/20 text-white font-bold rounded-full uppercase text-[10px] tracking-widest heading-font">Return to Space</button>
      </div>
    );
  }

  if (currentStep === 'results') {
    return (
      <div className="px-6 py-12 max-w-xl mx-auto animate-fade-in">
        <header className="mb-16">
          <h1 className="text-clamp-6xl font-light mb-2 text-[#FDFCF0]">Synthesis.</h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FDFCF0]/40 heading-font">The Alchemy of Connection</p>
        </header>
        <div className="lesson-content mb-16 prose prose-invert prose-xl prose-stone">
          <Markdown>{interpretation}</Markdown>
        </div>
        <button onClick={() => setCurrentStep('topic')} className="w-full py-5 bg-[#FDFCF0] text-[#121212] font-bold rounded-full uppercase text-xs tracking-widest heading-font">Return Home</button>
      </div>
    );
  }
  return null;
};

export default Quiz;
