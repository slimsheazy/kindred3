import { useState, useCallback, useEffect } from 'react';
import { Activity, UserData } from '../types';
import { generateActivities } from '../services/geminiService';
import { cloudService } from '../services/cloudService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useActivities = (userData: UserData | null) => {
  const queryClient = useQueryClient();
  const partnerCode = userData?.partnerCode || userData?.id || 'default';
  const [activeVibe, setActiveVibe] = useState('Deep');

  const { data: activities = [], isLoading: loading } = useQuery({
    queryKey: ['activities', activeVibe],
    queryFn: async () => {
      const result = await generateActivities(activeVibe);
      return result.data || [];
    },
    enabled: !!userData,
  });

  const { data: engagedActivity = null, refetch: fetchEngaged } = useQuery({
    queryKey: ['engagedActivity', partnerCode],
    queryFn: () => cloudService.getActiveActivity(partnerCode),
    enabled: !!userData,
  });

  useEffect(() => {
    if (userData) {
      const unsub = cloudService.subscribeToPartnerSpace(partnerCode, () => {
        queryClient.invalidateQueries({ queryKey: ['engagedActivity', partnerCode] });
      });
      return unsub;
    }
  }, [userData, partnerCode, queryClient]);

  const engageMutation = useMutation({
    mutationFn: async (activity: Activity) => {
      if (!userData) return;
      const started = { ...activity, startTime: Date.now(), startedBy: userData.id };
      await cloudService.setActiveActivity(partnerCode, started);
      return started;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagedActivity', partnerCode] });
    }
  });

  const cancelEngageMutation = useMutation({
    mutationFn: async () => {
      if (!userData) return;
      await cloudService.setActiveActivity(partnerCode, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagedActivity', partnerCode] });
    }
  });

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      if (!engagedActivity || !userData) return;
      const targetCat = ({ 'Deep': 'Intimacy', 'Playful': 'Communication', 'Adventurous': 'Shared Vision', 'Romantic': 'Intimacy', 'Relaxing': 'Trust' }[engagedActivity.category]) || 'Communication';
      await cloudService.updateBondScore(partnerCode, targetCat, 0.4);
      await cloudService.setActiveActivity(partnerCode, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagedActivity', partnerCode] });
      queryClient.invalidateQueries({ queryKey: ['bondScores', partnerCode] });
    }
  });

  const loadActivities = useCallback(async (vibe: string) => {
    setActiveVibe(vibe);
    queryClient.invalidateQueries({ queryKey: ['activities', vibe] });
  }, [queryClient]);

  return { 
    activities, 
    engagedActivity, 
    loading, 
    activeVibe, 
    setActiveVibe, 
    loadActivities, 
    engage: engageMutation.mutateAsync, 
    cancelEngage: cancelEngageMutation.mutateAsync, 
    finalize: finalizeMutation.mutateAsync 
  };
};