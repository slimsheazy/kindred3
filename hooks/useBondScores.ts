
import { useEffect, useCallback, useMemo } from 'react';
import { BondScore, UserData } from '../types';
import { cloudService } from '../services/cloudService';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export const useBondScores = (userData: UserData | null) => {
  const queryClient = useQueryClient();
  const partnerCode = userData?.partnerCode || userData?.id || 'default';

  const { data: bondScores = [], isLoading: loading, refetch: refreshScores } = useQuery({
    queryKey: ['bondScores', partnerCode],
    queryFn: () => cloudService.getBondScores(partnerCode),
    enabled: !!userData,
  });

  const onUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['bondScores', partnerCode] });
  }, [queryClient, partnerCode]);

  useEffect(() => {
    if (userData) {
      const unsub = cloudService.subscribeToPartnerSpace(partnerCode, onUpdate);
      return unsub;
    }
  }, [userData, partnerCode, onUpdate]);

  const growthSummary = useMemo(() => {
    const categories = ['Communication', 'Intimacy', 'Trust', 'Conflict', 'Shared Vision'];
    return categories.map(cat => {
        const catArr = bondScores.filter(s => s.category.toLowerCase().trim() === cat.toLowerCase().trim()).sort((a, b) => b.timestamp - a.timestamp);
        const current = catArr[0]?.score || 3.5;
        const origin = bondScores.find(s => s.category.toLowerCase().trim() === cat.toLowerCase().trim() && s.timestamp === 1)?.score || 3.5;
        const delta = current - origin;
        return { cat, delta, current };
    });
  }, [bondScores]);

  return { bondScores, growthSummary, loading, refreshScores };
};
