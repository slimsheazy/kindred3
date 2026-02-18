import React, { useEffect, useState } from 'react';
import { UserData, CourseModule, View, Lesson } from '../types';
import { generateLearningPath } from '../services/geminiService';
import { cloudService } from '../services/cloudService';
import { sensoryService } from '../services/sensoryService';
import { useBondScores } from '../hooks/useBondScores';
import { DashboardView } from './Dashboard/DashboardView';

const Dashboard: React.FC<{ userData: UserData | null, onNavigate?: (view: View) => void }> = ({ userData }) => {
  const { bondScores, growthSummary, loading: scoresLoading } = useBondScores(userData);
  const [courseModules, setCourseModules] = useState<CourseModule[]>([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  const [selectedModule, setSelectedModule] = useState<CourseModule | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    if (!userData) return;
    const code = userData.partnerCode || userData.id || 'default';
    setModulesLoading(true);
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
    return cloudService.subscribeToPresence(code, userData.id, userData.userName, userData.vibe || 'Neutral', (presences) => {
        setIsPartnerOnline(presences.some(p => p.id !== userData.id));
    });
  }, [userData]);

  const handlePulse = () => {
    sensoryService.pulse();
    if(userData?.partnerCode) cloudService.sendPulse(userData.partnerCode, userData.id);
  };

  return (
    <DashboardView 
      userData={userData}
      isPartnerOnline={isPartnerOnline}
      bondScores={bondScores}
      growthSummary={growthSummary}
      scoresLoading={scoresLoading}
      courseModules={courseModules}
      modulesLoading={modulesLoading}
      selectedModule={selectedModule}
      selectedLesson={selectedLesson}
      onPulse={handlePulse}
      onSelectModule={setSelectedModule}
      onSelectLesson={setSelectedLesson}
    />
  );
};

export default Dashboard;