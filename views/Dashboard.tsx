
import React, { useEffect, useState, useCallback } from 'react';
import { UserData, CourseModule, View, Lesson, WeeklySynthesis } from '../types';
import { generateLearningPath, generateModuleLessons } from '../services/geminiService';
import { cloudService } from '../services/cloudService';
import { sensoryService } from '../services/sensoryService';
import { useBondScores } from '../hooks/useBondScores';
import { DashboardView } from './Dashboard/DashboardView';
import WeeklyReveal from './WeeklyReveal';

const Dashboard: React.FC<{ userData: UserData | null, onNavigate?: (view: View) => void }> = ({ userData, onNavigate }) => {
  const { bondScores, growthSummary, loading: scoresLoading } = useBondScores(userData);
  const [courseModules, setCourseModules] = useState<CourseModule[]>([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isEnrichingModule, setIsEnrichingModule] = useState(false);
  const [latestSynthesis, setLatestSynthesis] = useState<WeeklySynthesis | null>(null);
  const [showWeeklyReveal, setShowWeeklyReveal] = useState(false);

  const fetchSynthesis = useCallback(async () => {
    if (!userData?.partnerCode) return;
    const synth = await cloudService.getLatestWeeklySynthesis(userData.partnerCode);
    if (synth) {
      setLatestSynthesis(synth);
    }
  }, [userData]);

  useEffect(() => {
    if (!userData) return;
    const code = userData.partnerCode || userData.id || 'default';
    setModulesLoading(true);
    
    // Fetch path
    cloudService.getLearningPath(code).then(async (saved) => {
      if (saved.length === 0) {
        const result = await generateLearningPath();
        if (result.data) {
          setCourseModules(result.data);
          await cloudService.saveLearningPath(code, result.data);
        } else {
          setCourseModules([]);
        }
      } else setCourseModules(saved);
      setModulesLoading(false);
    });

    // Fetch synthesis
    fetchSynthesis();

    return cloudService.subscribeToPresence(code, userData.id, userData.userName, userData.vibe || 'Neutral', (presences) => {
        setIsPartnerOnline(presences.some(p => p.id !== userData.id));
    });
  }, [userData, fetchSynthesis]);

  const handleSelectModule = async (module: CourseModule | null) => {
    if (!module || !userData) {
      setSelectedModule(null);
      return;
    }

    sensoryService.tap();
    setSelectedModule(module);

    // If module has no lessons, generate them
    if (!module.content || module.content.length === 0) {
      setIsEnrichingModule(true);
      const result = await generateModuleLessons(module.title, module.description, userData);
      if (result.data) {
        const updatedModules = courseModules.map(m => 
          m.id === module.id ? { ...m, content: result.data as Lesson[] } : m
        );
        setCourseModules(updatedModules);
        setSelectedModule({ ...module, content: result.data as Lesson[] });
        
        const code = userData.partnerCode || userData.id || 'default';
        await cloudService.saveLearningPath(code, updatedModules);
        sensoryService.shimmer();
      }
      setIsEnrichingModule(false);
    }
  };

  const handlePulse = () => {
    sensoryService.pulse();
    if(userData?.partnerCode) cloudService.sendPulse(userData.partnerCode, userData.id);
  };

  const isRevealReady = latestSynthesis && userData && !latestSynthesis.readBy.includes(userData.id);

  return (
    <>
      <DashboardView 
        userData={userData}
        isPartnerOnline={isPartnerOnline}
        bondScores={bondScores}
        growthSummary={growthSummary}
        scoresLoading={scoresLoading}
        courseModules={courseModules}
        modulesLoading={modulesLoading || isEnrichingModule}
        selectedModule={selectedModule}
        selectedLesson={selectedLesson}
        onPulse={handlePulse}
        onSelectModule={handleSelectModule}
        onSelectLesson={setSelectedLesson}
        revealAvailable={!!isRevealReady}
        onStartReveal={() => {
          sensoryService.ripple();
          setShowWeeklyReveal(true);
        }}
        onNavigate={onNavigate}
      />
      {showWeeklyReveal && (
        <WeeklyReveal 
          userData={userData} 
          onClose={() => {
            setShowWeeklyReveal(false);
            fetchSynthesis(); // Refresh to clear reveal state
          }} 
        />
      )}
    </>
  );
};

export default Dashboard;
