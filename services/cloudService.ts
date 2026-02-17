import { UserData, JournalEntry, Goal, BondScore, Lesson, ChatMessage, Activity, WeeklySynthesis, GrowthLog, FoundationSummary, CourseModule } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

class CloudService {
  private useLocalStorageOnly = !isSupabaseConfigured;
  private presenceChannel: RealtimeChannel | null = null;
  private lastTrackedData: any = {};

  private getLocal<T>(key: string): T[] {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  private saveLocal<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // --- Profile & Authentication ---

  async signUp(userData: UserData): Promise<UserData> {
    if (this.useLocalStorageOnly) return userData;
    try {
      await supabase.from('profiles').upsert({
        id: userData.id,
        user_name: userData.userName,
        partner_name: userData.partnerName,
        partner_code: userData.partnerCode,
        focus_areas: userData.focusAreas,
        vibe: userData.vibe || 'Neutral',
        last_active: new Date().toISOString(),
        updated_at: new Date()
      });
    } catch (err) {
      console.error("Supabase signup failed", err);
    }
    return userData;
  }

  async getProfile(userId: string): Promise<UserData | null> {
    if (this.useLocalStorageOnly) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error || !data) return null;
      
      return {
        id: data.id,
        userName: data.user_name,
        partnerName: data.partner_name,
        yearsTogether: '', // Not stored in schema currently
        focusAreas: data.focus_areas || [],
        partnerCode: data.partner_code,
        syncStatus: 'synced',
        vibe: data.vibe,
        theme: 'midnight' // Default
      };
    } catch (err) {
      return null;
    }
  }

  // --- Foundation Summary ---

  async getLatestFoundationSummary(partnerCode: string): Promise<FoundationSummary | null> {
    const key = `kindred_foundation_${partnerCode}`;
    const saved = localStorage.getItem(key);
    const local = saved ? JSON.parse(saved) : null;

    if (!this.useLocalStorageOnly) {
      const { data, error } = await supabase
        .from('summaries')
        .select('*')
        .eq('partner_code', partnerCode)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (data && (!local || new Date(data.created_at).getTime() > local.timestamp)) {
        const remote = {
          content: data.content,
          timestamp: new Date(data.created_at).getTime(),
          entryCountAtSummary: data.entry_count
        };
        localStorage.setItem(key, JSON.stringify(remote));
        return remote;
      }
    }
    return local;
  }

  async saveFoundationSummary(partnerCode: string, summary: FoundationSummary): Promise<void> {
    const key = `kindred_foundation_${partnerCode}`;
    localStorage.setItem(key, JSON.stringify(summary));

    if (!this.useLocalStorageOnly) {
      await supabase.from('summaries').insert({
        partner_code: partnerCode,
        content: summary.content,
        entry_count: summary.entryCountAtSummary,
        created_at: new Date(summary.timestamp)
      });
    }
  }

  // --- Learning Path ---

  async getLearningPath(partnerCode: string): Promise<CourseModule[]> {
    if (this.useLocalStorageOnly) return this.getLocal<CourseModule>(`kindred_path_${partnerCode}`);

    const { data } = await supabase
      .from('learning_paths')
      .select('modules')
      .eq('partner_code', partnerCode)
      .maybeSingle();
    
    if (data?.modules) {
        this.saveLocal(`kindred_path_${partnerCode}`, data.modules);
        return data.modules;
    }
    return this.getLocal<CourseModule>(`kindred_path_${partnerCode}`);
  }

  async saveLearningPath(partnerCode: string, path: CourseModule[]): Promise<void> {
    this.saveLocal(`kindred_path_${partnerCode}`, path);
    if (!this.useLocalStorageOnly) {
      await supabase.from('learning_paths').upsert({
        partner_code: partnerCode,
        modules: path,
        updated_at: new Date()
      }, { onConflict: 'partner_code' });
    }
  }

  async setPathGenerationLock(partnerCode: string, isGenerating: boolean, userId: string): Promise<void> {
    const key = `kindred_path_lock_${partnerCode}`;
    if (isGenerating) {
      localStorage.setItem(key, JSON.stringify({ userId, timestamp: Date.now() }));
    } else {
      localStorage.removeItem(key);
    }

    if (!this.useLocalStorageOnly) {
      if (isGenerating) {
        await supabase.from('active_sessions').upsert({
          partner_code: partnerCode,
          activity: { type: 'path_generation', userId, startedAt: Date.now() },
          updated_at: new Date()
        });
      } else {
        const { data } = await supabase.from('active_sessions').select('activity').eq('partner_code', partnerCode).maybeSingle();
        if (data?.activity?.type === 'path_generation') {
           await supabase.from('active_sessions').delete().eq('partner_code', partnerCode);
        }
      }
    }
  }

  async getPathGenerationStatus(partnerCode: string): Promise<{ isGenerating: boolean, userId: string } | null> {
    const key = `kindred_path_lock_${partnerCode}`;
    const local = localStorage.getItem(key);
    const localData = local ? JSON.parse(local) : null;

    if (!this.useLocalStorageOnly) {
      const { data } = await supabase.from('active_sessions').select('activity').eq('partner_code', partnerCode).maybeSingle();
      if (data?.activity?.type === 'path_generation') {
        return { isGenerating: true, userId: data.activity.userId };
      }
    }
    
    return localData ? { isGenerating: true, userId: localData.userId } : null;
  }

  // --- Growth Logs ---

  async saveGrowthLog(partnerCode: string, log: GrowthLog): Promise<void> {
    const key = `kindred_growth_logs_${partnerCode}`;
    const logs = this.getLocal<GrowthLog>(key);
    const updated = [log, ...logs].slice(0, 50);
    this.saveLocal(key, updated);

    if (!this.useLocalStorageOnly) {
      await supabase.from('growth_logs').insert({
        id: log.id,
        partner_code: partnerCode,
        category: log.category,
        delta: log.delta,
        context: log.context,
        created_at: new Date(log.timestamp)
      });
    }
  }

  async getGrowthLogs(partnerCode: string): Promise<GrowthLog[]> {
    if (this.useLocalStorageOnly) return this.getLocal<GrowthLog>(`kindred_growth_logs_${partnerCode}`);

    const { data, error } = await supabase
      .from('growth_logs')
      .select('*')
      .eq('partner_code', partnerCode)
      .order('created_at', { ascending: false });

    if (error || !data) return this.getLocal<GrowthLog>(`kindred_growth_logs_${partnerCode}`);
    return data.map(d => ({
        id: d.id,
        timestamp: new Date(d.created_at).getTime(),
        category: d.category,
        delta: d.delta,
        context: d.context
    }));
  }

  async updatePresence(data: any): Promise<void> {
    if (this.presenceChannel) {
      this.lastTrackedData = { ...this.lastTrackedData, ...data };
      await this.presenceChannel.track(this.lastTrackedData);
    }
  }

  subscribeToPresence(partnerCode: string, userId: string, userName: string, vibe: string, onSync: (presenceState: any[]) => void) {
    if (this.useLocalStorageOnly) return () => {};
    const channel = supabase.channel(`presence:${partnerCode}`, { config: { presence: { key: userId } } });
    this.presenceChannel = channel;
    this.lastTrackedData = { id: userId, userName, vibe: vibe || 'Neutral', online_at: new Date().toISOString() };
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      onSync(Object.values(state).flat());
    }).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await channel.track(this.lastTrackedData);
    });
    return () => { channel.unsubscribe(); this.presenceChannel = null; };
  }

  // --- Bond Scores ---

  async getBondScores(partnerCode: string): Promise<BondScore[]> {
    const key = `kindred_scores_${partnerCode}`;
    if (this.useLocalStorageOnly) {
        const scores = this.getLocal<BondScore>(key);
        if (scores.length === 0) {
            const initial: BondScore[] = [
                { category: 'Communication', score: 3.5, timestamp: 1 },
                { category: 'Intimacy', score: 3.5, timestamp: 1 },
                { category: 'Trust', score: 3.5, timestamp: 1 },
                { category: 'Conflict', score: 3.5, timestamp: 1 },
                { category: 'Shared Vision', score: 3.5, timestamp: 1 },
            ];
            this.saveLocal(key, initial);
            return initial;
        }
        return scores;
    }
    const { data } = await supabase.from('bond_scores').select('*').eq('partner_code', partnerCode);
    if (!data || data.length === 0) return this.getLocal<BondScore>(key);
    return data.map(d => ({ category: d.category, score: d.score, timestamp: new Date(d.updated_at).getTime() }));
  }

  async initializeBondScores(partnerCode: string, scores: Record<string, number>): Promise<void> {
    const key = `kindred_scores_${partnerCode}`;
    const initialRecords: BondScore[] = [];
    
    for (const [category, score] of Object.entries(scores)) {
        initialRecords.push({ category, score: Number(score), timestamp: 1 });
        initialRecords.push({ category, score: Number(score), timestamp: Date.now() });
    }
    
    this.saveLocal(key, initialRecords);
    
    if (!this.useLocalStorageOnly) {
        await supabase.from('bond_scores').delete().eq('partner_code', partnerCode);
        for (const record of initialRecords) {
            await supabase.from('bond_scores').insert({ 
                partner_code: partnerCode, 
                category: record.category, 
                score: record.score, 
                updated_at: new Date(record.timestamp === 1 ? '1970-01-01' : Date.now()) 
            });
        }
    }
  }

  async updateBondScore(partnerCode: string, category: string, delta: number): Promise<void> {
    const scores = await this.getBondScores(partnerCode);
    const catRecords = scores.filter(s => s.category.toLowerCase().trim() === category.toLowerCase().trim());
    const latest = [...catRecords].sort((a,b) => b.timestamp - a.timestamp)[0];
    const currentVal = latest ? latest.score : 3.5;
    const newVal = Math.min(10, Math.max(1, currentVal + delta));
    
    const newRecord: BondScore = { category, score: newVal, timestamp: Date.now() };
    const updatedHistory = [...scores, newRecord];
    
    this.saveLocal(`kindred_scores_${partnerCode}`, updatedHistory);
    
    if (!this.useLocalStorageOnly) {
      await supabase.from('bond_scores').upsert({ 
        partner_code: partnerCode, 
        category, 
        score: newVal, 
        updated_at: new Date() 
      }, { onConflict: 'partner_code,category' });
    }
  }

  async setBondScore(partnerCode: string, category: string, score: number): Promise<void> {
    const scores = await this.getBondScores(partnerCode);
    const newRecord: BondScore = { category, score: Math.min(10, Math.max(1, score)), timestamp: Date.now() };
    const updated = [...scores, newRecord];

    this.saveLocal(`kindred_scores_${partnerCode}`, updated);
    if (!this.useLocalStorageOnly) {
      await supabase.from('bond_scores').upsert({ 
        partner_code: partnerCode, 
        category, 
        score: Math.min(10, Math.max(1, score)), 
        updated_at: new Date() 
      }, { onConflict: 'partner_code,category' });
    }
  }

  async batchUpdateScores(partnerCode: string, updates: { category: string, delta: number }[]): Promise<void> {
    for (const update of updates) await this.updateBondScore(partnerCode, update.category, update.delta);
  }

  async getJournalEntries(partnerCode: string): Promise<JournalEntry[]> {
    const key = `kindred_journal_${partnerCode}`;
    if (this.useLocalStorageOnly) return this.getLocal<JournalEntry>(key);
    const { data } = await supabase.from('journal').select('*').eq('partner_code', partnerCode).order('created_at', { ascending: false });
    if (!data) return this.getLocal<JournalEntry>(key);
    return data.map(d => ({ id: d.id, authorId: d.author_id, author: d.author_name, authorImage: '', date: new Date(d.created_at).toLocaleDateString(), timestamp: new Date(d.created_at).getTime(), text: d.text, theme_tags: d.theme_tags, image: d.image_url }));
  }

  async saveJournalEntry(partnerCode: string, entry: JournalEntry): Promise<void> {
    const localKey = `kindred_journal_${partnerCode}`;
    this.saveLocal(localKey, [entry, ...this.getLocal<JournalEntry>(localKey)]);
    if (!this.useLocalStorageOnly) {
      await supabase.from('journal').insert({ id: entry.id, partner_code: partnerCode, author_id: entry.authorId, author_name: entry.author, text: entry.text, theme_tags: entry.themeTags, created_at: new Date(entry.timestamp), image_url: entry.image });
    }
  }

  async setActiveActivity(partnerCode: string, activity: Activity | null): Promise<void> {
    const key = `kindred_active_${partnerCode}`;
    if (activity) {
      localStorage.setItem(key, JSON.stringify(activity));
      if (!this.useLocalStorageOnly) {
        await supabase.from('active_sessions').upsert({ partner_code: partnerCode, activity, updated_at: new Date() });
      }
    } else {
      localStorage.removeItem(key);
      if (!this.useLocalStorageOnly) {
        await supabase.from('active_sessions').delete().eq('partner_code', partnerCode);
      }
    }
  }

  async getActiveActivity(partnerCode: string): Promise<Activity | null> {
    const key = `kindred_active_${partnerCode}`;
    if (this.useLocalStorageOnly) {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : null;
    }
    const { data } = await supabase.from('active_sessions').select('activity').eq('partner_code', partnerCode).maybeSingle();
    if (data?.activity?.type === 'path_generation') return null;
    return data?.activity || null;
  }

  async markLessonComplete(lessonId: string): Promise<void> {
    const completed = JSON.parse(localStorage.getItem('kindred_completed_lessons') || '[]');
    if (!completed.includes(lessonId)) {
      completed.push(lessonId);
      localStorage.setItem('kindred_completed_lessons', JSON.stringify(completed));
    }
  }

  getCompletedLessons(): string[] {
    return JSON.parse(localStorage.getItem('kindred_completed_lessons') || '[]');
  }

  async saveChatMessage(partnerCode: string, message: ChatMessage): Promise<void> {
    const key = `kindred_chat_${partnerCode}`;
    const updated = [...this.getLocal<ChatMessage>(key), message].slice(-50);
    this.saveLocal(key, updated);
  }

  async getChatHistory(partnerCode: string): Promise<ChatMessage[]> {
    return this.getLocal<ChatMessage>(`kindred_chat_${partnerCode}`);
  }

  async clearChatHistory(partnerCode: string): Promise<void> {
    this.saveLocal(`kindred_chat_${partnerCode}`, []);
  }

  async submitPromptAnswer(partnerCode: string, userId: string, answer: string) {
    if (!this.useLocalStorageOnly) {
      await supabase.from('prompt_answers').upsert({ partner_code: partnerCode, user_id: userId, answer, updated_at: new Date() }, { onConflict: 'partner_code,user_id' });
    }
  }

  async getPartnerPromptAnswer(partnerCode: string, myId: string): Promise<string | null> {
    if (this.useLocalStorageOnly) return null;
    const { data } = await supabase.from('prompt_answers').select('answer').eq('partner_code', partnerCode).neq('user_id', myId).maybeSingle();
    return data?.answer || null;
  }

  async getGoals(partnerCode: string): Promise<Goal[]> {
    const { data } = await supabase.from('goals').select('*').eq('partner_code', partnerCode);
    return (data || []).map(d => ({ id: d.id, title: d.title, type: 'Couple', progress: d.progress, lastUpdated: new Date(d.updated_at).getTime(), micro_steps: d.micro_steps, encouragement: d.encouragement }));
  }

  async saveGoal(partnerCode: string, goal: Goal) {
    await supabase.from('goals').upsert({ id: goal.id, partner_code: partnerCode, title: goal.title, progress: goal.progress, micro_steps: goal.microSteps, encouragement: goal.encouragement, updated_at: new Date(goal.lastUpdated) });
  }

  async getLatestWeeklySynthesis(partnerCode: string): Promise<WeeklySynthesis | null> {
    const list = this.getLocal<WeeklySynthesis>(`kindred_weekly_${partnerCode}`);
    return list.sort((a, b) => b.timestamp - a.timestamp)[0] || null;
  }

  async saveWeeklySynthesis(partnerCode: string, synthesis: WeeklySynthesis) {
    const key = `kindred_weekly_${partnerCode}`;
    this.saveLocal(key, [synthesis, ...this.getLocal<WeeklySynthesis>(key)]);
  }

  async getQuizAnswers(partnerCode: string, topic: string) {
    const { data } = await supabase.from('quiz_answers').select('user_id, answers').eq('partner_code', partnerCode).eq('topic', topic);
    return (data || []).map(d => ({ userId: d.user_id, answers: d.answers }));
  }

  async getQuizSynthesis(partnerCode: string, topic: string) {
    const { data } = await supabase.from('quiz_syntheses').select('synthesis').eq('partner_code', partnerCode).eq('topic', topic).maybeSingle();
    return data?.synthesis || null;
  }

  async saveQuizAnswer(partnerCode: string, userId: string, topic: string, answers: any) {
    await supabase.from('quiz_answers').upsert({ partner_code: partnerCode, user_id: userId, topic, answers, updated_at: new Date() }, { onConflict: 'partner_code,user_id,topic' });
  }

  async saveQuizSynthesis(partnerCode: string, topic: string, synthesis: string) {
    await supabase.from('quiz_syntheses').upsert({ partner_code: partnerCode, topic, synthesis, updated_at: new Date() }, { onConflict: 'partner_code,topic' });
  }

  async updateVibe(userId: string, vibe: string) {
    await supabase.from('profiles').update({ vibe, updated_at: new Date() }).eq('id', userId);
  }

  async getPartnerByCode(id: string) {
    const { data } = await supabase.from('profiles').select('id, user_name').eq('id', id).maybeSingle();
    return data ? { id: data.id, userName: data.user_name } : null;
  }

  async linkPartner(myId: string, partnerId: string) {
    await supabase.from('profiles').update({ partner_code: partnerId }).eq('id', myId);
  }

  async checkMutualLink(myId: string, partnerId: string) {
    const { data } = await supabase.from('profiles').select('partner_code').eq('id', partnerId).maybeSingle();
    return data?.partner_code === myId;
  }

  async sendPulse(partnerCode: string, from: string) {
    const channel = supabase.channel(`pulses:${partnerCode}`);
    await channel.subscribe(async (s) => {
      if (s === 'SUBSCRIBED') {
        await channel.send({ type: 'broadcast', event: 'pulse', payload: { from, timestamp: Date.now() } });
        channel.unsubscribe();
      }
    });
  }

  subscribeToPulses(partnerCode: string, onPulse: (p: any) => void) {
    const channel = supabase.channel(`pulses:${partnerCode}`).on('broadcast', { event: 'pulse' }, ({ payload }) => onPulse(payload)).subscribe();
    return () => channel.unsubscribe();
  }

  subscribeToPartnerSpace(partnerCode: string, onUpdate: () => void) {
    if (this.useLocalStorageOnly) return () => {};
    const channel = supabase.channel(`sync:${partnerCode}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'journal', filter: `partner_code=eq.${partnerCode}` }, onUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bond_scores', filter: `partner_code=eq.${partnerCode}` }, onUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'active_sessions', filter: `partner_code=eq.${partnerCode}` }, onUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'learning_paths', filter: `partner_code=eq.${partnerCode}` }, onUpdate)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }
}

export const cloudService = new CloudService();