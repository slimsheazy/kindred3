import { useMemo } from 'react';
import { Goal, UserData, MicroStep } from '../types';
import { cloudService } from '../services/cloudService';
import { generateGoalMicroSteps, getGoalEncouragement, pivotGoalMicroSteps } from '../services/geminiService';
import { sensoryService } from '../services/sensoryService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useGoals = (userData: UserData | null) => {
  const queryClient = useQueryClient();
  const partnerCode = userData?.partnerCode || 'default';
  const STAGNATION_THRESHOLD_MS = 5 * 24 * 60 * 60 * 1000;

  const { data: goals = [], isLoading: loading } = useQuery({
    queryKey: ['goals', partnerCode],
    queryFn: async () => {
      const rawGoals = await cloudService.getGoals(partnerCode);
      const now = Date.now();
      return rawGoals.map(g => ({
        ...g,
        isStagnant: (now - g.lastUpdated > STAGNATION_THRESHOLD_MS) && g.progress < 100
      }));
    },
    enabled: !!userData,
  });

  const addGoalMutation = useMutation({
    mutationFn: async (title: string) => {
      if (!userData) throw new Error('No user data');
      sensoryService.tap();
      const now = Date.now();
      const goal: Goal = { 
          id: now.toString(), 
          title, 
          type: 'Couple', 
          progress: 0, 
          lastUpdated: now,
          createdAt: now,
          encouragement: "Gathering specific micro-steps for this horizon..."
      };
      
      const [stepsRes, encRes] = await Promise.all([
          generateGoalMicroSteps(goal.title),
          getGoalEncouragement(goal.title, 0)
      ]);
      const enrichedGoal = { 
        ...goal, 
        microSteps: stepsRes.data || [], 
        encouragement: encRes.data || undefined 
      };
      await cloudService.saveGoal(partnerCode, enrichedGoal);
      return enrichedGoal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', partnerCode] });
      sensoryService.success();
    },
  });

  const toggleStepMutation = useMutation({
    mutationFn: async ({ goal, stepId }: { goal: Goal, stepId: string }) => {
      const now = Date.now();
      const updatedSteps = (goal.microSteps || []).map(s => s.id === stepId ? { ...s, completed: !s.completed, lastUpdated: now } : s);
      const completedCount = updatedSteps.filter(s => s.completed).length;
      const newProgress = Math.round((completedCount / (updatedSteps.length || 1)) * 100);
      
      if (newProgress > goal.progress) sensoryService.success(); else sensoryService.tap();
      
      const updatedGoal = { ...goal, microSteps: updatedSteps, progress: newProgress, lastUpdated: now, isStagnant: false };
      await cloudService.saveGoal(partnerCode, updatedGoal);
      return updatedGoal;
    },
    onMutate: async ({ goal, stepId }) => {
      await queryClient.cancelQueries({ queryKey: ['goals', partnerCode] });
      const previousGoals = queryClient.getQueryData<Goal[]>(['goals', partnerCode]);

      queryClient.setQueryData<Goal[]>(['goals', partnerCode], (old) => {
        return (old || []).map(g => {
          if (g.id === goal.id) {
            const updatedSteps = (g.microSteps || []).map(s => 
              s.id === stepId ? { ...s, completed: !s.completed, lastUpdated: Date.now() } : s
            );
            const completedCount = updatedSteps.filter(s => s.completed).length;
            const newProgress = Math.round((completedCount / (updatedSteps.length || 1)) * 100);
            return { ...g, microSteps: updatedSteps, progress: newProgress, lastUpdated: Date.now(), isStagnant: false };
          }
          return g;
        });
      });

      return { previousGoals };
    },
    onError: (err, variables, context) => {
      if (context?.previousGoals) {
        queryClient.setQueryData(['goals', partnerCode], context.previousGoals);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', partnerCode] });
    },
  });

  const pivotGoalMutation = useMutation({
    mutationFn: async (goal: Goal) => {
      sensoryService.tap();
      const result = await pivotGoalMicroSteps(goal);
      if (result.error || !result.data) throw new Error(result.error || "Pivot failed.");
      const { steps, reason } = result.data;
      const pivotedGoal: Goal = { ...goal, microSteps: steps, pivotReason: reason, lastUpdated: Date.now(), isStagnant: false, progress: 0 };
      await cloudService.saveGoal(partnerCode, pivotedGoal);
      return pivotedGoal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', partnerCode] });
      sensoryService.success();
    },
  });

  const suggestions = useMemo(() => [
    { category: 'Intimacy', title: 'Ritual of Emotional Exposure', description: 'Dedicate 15 minutes of unedited emotional sharing.' },
    { category: 'Communication', title: 'Architecture of Listening', description: 'Practice reflexive listening cycles during shared coffee.' },
    { category: 'Conflict', title: 'The 20-Minute Safe Harbor', description: 'Implement a mandatory cool-down protocol for friction.' },
    { category: 'Adventure', title: 'Uncharted Synchronicity', description: 'Visit a location neither of you has ever been to.' },
    { category: 'Trust', title: 'The Integrity of Small Promises', description: 'Commit to 100% reliability on minor daily tasks.' },
    { category: 'Growth', title: 'Shared intellectual Expansion', description: 'Read a profound text together and discuss weekly.' }
  ], []);

  const filteredSuggestions = useMemo(() => {
    if (!userData?.focusAreas || userData.focusAreas.length === 0) return suggestions.slice(0, 3);
    return suggestions.filter(s => userData.focusAreas.includes(s.category));
  }, [userData, suggestions]);

  return { 
    goals, 
    isAdding: addGoalMutation.isPending, 
    loading, 
    isPivoting: pivotGoalMutation.isPending ? 'pivoting' : null, 
    addGoal: addGoalMutation.mutateAsync, 
    toggleStep: (goal: Goal, stepId: string) => toggleStepMutation.mutateAsync({ goal, stepId }), 
    pivotGoal: pivotGoalMutation.mutateAsync, 
    filteredSuggestions 
  };
};