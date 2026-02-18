
import { useState } from 'react';
import { JournalEntry, UserData } from '../types';
import { cloudService } from '../services/cloudService';
import { analyzeInteractionForScores, generateJournalEchoes, tagJournalEntry, interpretSynchronicity, updateFoundationSummary } from '../services/geminiService';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useJournal = (userData: UserData | null) => {
  const queryClient = useQueryClient();
  const partnerCode = userData?.partnerCode || 'default';
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [echoSynthesis, setEchoSynthesis] = useState<{ synthesis: string, themes: string[] } | null>(null);

  const { data: entries = [], isLoading: loading } = useQuery({
    queryKey: ['journal', partnerCode],
    queryFn: async () => {
      const data = await cloudService.getJournalEntries(partnerCode);
      if (data.length >= 3) triggerSynthesis(data);
      return data;
    },
    enabled: !!userData,
  });

  const triggerSynthesis = async (history: JournalEntry[]) => {
    setIsSynthesizing(true);
    try {
      const echoes = await generateJournalEchoes(history.slice(0, 10));
      setEchoSynthesis(echoes);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const addEntryMutation = useMutation({
    mutationFn: async ({ text, imageBase64 }: { text: string, imageBase64?: string }) => {
      if (!userData) throw new Error('No user data');
      const tags = await tagJournalEntry(text);
      const entry: JournalEntry = { 
          id: Date.now().toString(), authorId: userData.id, author: userData.userName, 
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), 
          timestamp: Date.now(), text, themeTags: tags, image: imageBase64
      };
      
      await cloudService.saveJournalEntry(partnerCode, entry);
      
      const updatedEntries = [entry, ...entries];
      if (updatedEntries.length > 0 && updatedEntries.length % 10 === 0) {
          const currentFoundation = await cloudService.getLatestFoundationSummary(partnerCode);
          const newContent = await updateFoundationSummary(updatedEntries.slice(0, 10), currentFoundation?.content);
          await cloudService.saveFoundationSummary(partnerCode, { content: newContent, timestamp: Date.now(), entryCountAtSummary: updatedEntries.length });
      }
      
      const analysisResult = await analyzeInteractionForScores(text);
      if (analysisResult.data && analysisResult.data.length > 0) {
          await cloudService.batchUpdateScores(partnerCode, analysisResult.data);
          for (const update of analysisResult.data) {
              await cloudService.saveGrowthLog(partnerCode, { id: `growth-${Date.now()}`, timestamp: Date.now(), category: update.category, delta: update.delta, context: `from reflection by ${userData.userName}` });
          }
      }
      return entry;
    },
    onMutate: async ({ text, imageBase64 }) => {
      await queryClient.cancelQueries({ queryKey: ['journal', partnerCode] });
      const previousEntries = queryClient.getQueryData<JournalEntry[]>(['journal', partnerCode]);

      if (userData) {
        const optimisticEntry: JournalEntry = {
          id: `opt-${Date.now()}`,
          authorId: userData.id,
          author: userData.userName,
          date: 'Just now',
          timestamp: Date.now(),
          text,
          image: imageBase64,
          themeTags: ['Synthesizing...']
        };
        queryClient.setQueryData<JournalEntry[]>(['journal', partnerCode], (old) => [optimisticEntry, ...(old || [])]);
      }

      return { previousEntries };
    },
    onError: (err, newEntry, context) => {
      if (context?.previousEntries) {
        queryClient.setQueryData(['journal', partnerCode], context.previousEntries);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['journal', partnerCode] });
      queryClient.invalidateQueries({ queryKey: ['bondScores', partnerCode] });
    }
  });

  const analyzeImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64String = (reader.result as string).split(',')[1];
          const metaphor = await interpretSynchronicity(base64String);
          resolve(metaphor);
        } catch (e) { reject(e); }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return { 
    entries, 
    isArchiving: addEntryMutation.isPending, 
    loading, 
    isSynthesizing, 
    echoSynthesis, 
    addEntry: (text: string, imageBase64?: string) => addEntryMutation.mutateAsync({ text, imageBase64 }), 
    analyzeImage 
  };
};
