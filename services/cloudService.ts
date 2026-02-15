
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

  // --- Learning Path (Infinite Generation Sync) ---

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

  // --- Profile & Presence ---

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
    if (this.useLocalStorageOnly) {
        const scores = this.getLocal<BondScore>(`kindred_scores_${partnerCode}`);
        if (scores.length === 0) {
            const initial: BondScore[] = [
                { category: 'Communication', score: 3.5, timestamp: Date.now() },
                { category: 'Intimacy', score: 3.5, timestamp: Date.now() },
                { category: 'Trust', score: 3.5, timestamp: Date.now() },
                { category: 'Conflict', score: 3.5, timestamp: Date.now() },
                { category: 'Shared Vision', score: 3.5, timestamp: Date.now() },
            ];
            this.saveLocal(`kindred_scores_${partnerCode}`, initial);
            return initial;
        }
        return scores;
    }
    const { data } = await supabase.from('bond_scores').select('*').eq('partner_code', partnerCode);
    if (!data || data.length === 0) return this.getLocal<BondScore>(`kindred_scores_${partnerCode}`);
    return data.map(d => ({ category: d.category, score: d.score, timestamp: new Date(d.updated_at).getTime() }));
  }

  async updateBondScore(partnerCode: string, category: string, delta: number): Promise<void> {
    const scores = await this.getBondScores(partnerCode);
    const updated = scores.map(s => s.category === category ? { ...s, score: Math.min(10, Math.max(1, s.score + delta)), timestamp: Date.now() } : s);
    this.saveLocal(`kindred_scores_${partnerCode}`, updated);
    if (!this.useLocalStorageOnly) {
      await supabase.from('bond_scores').upsert({ partner_code: partnerCode, category, score: updated.find(u => u.category === category)?.score || 3.5, updated_at: new Date() }, { onConflict: 'partner_code,category' });
    }
  }

  async batchUpdateScores(partnerCode: string, updates: { category: string, delta: number }[]): Promise<void> {
    for (const update of updates) await this.updateBondScore(partnerCode, update.category, update.delta);
  }

  // --- Journal ---

  async getJournalEntries(partnerCode: string): Promise<JournalEntry[]> {
    if (this.useLocalStorageOnly) return this.getLocal<JournalEntry>(`kindred_journal_${partnerCode}`);
    const { data } = await supabase.from('journal').select('*').eq('partner_code', partnerCode).order('created_at', { ascending: false });
    if (!data) return this.getLocal<JournalEntry>(`kindred_journal_${partnerCode}`);
    return data.map(d => ({ id: d.id, authorId: d.author_id, author: d.author_name, authorImage: '', date: new Date(d.created_at).toLocaleDateString(), timestamp: new Date(d.created_at).getTime(), text: d.text, theme_tags: d.theme_tags, image: d.image_url }));
  }

  async saveJournalEntry(partnerCode: string, entry: JournalEntry): Promise<void> {
    const localKey = `kindred_journal_${partnerCode}`;
    this.saveLocal(localKey, [entry, ...this.getLocal<JournalEntry>(localKey)]);
    if (!this.useLocalStorageOnly) {
      await supabase.from('journal').insert({ id: entry.id, partner_code: partnerCode, author_id: entry.authorId, author_name: entry.author, text: entry.text, theme_tags: entry.themeTags, created_at: new Date(entry.timestamp), image_url: entry.image });
    }
  }

  // --- Activities (Co-Presence Sync) ---

  async setActiveActivity(partnerCode: string, activity: Activity | null): Promise<void> {
    if (activity) {
      localStorage.setItem(`kindred_active_${partnerCode}`, JSON.stringify(activity));
      if (!this.useLocalStorageOnly) {
        await supabase.from('active_sessions').upsert({ partner_code: partnerCode, activity, updated_at: new Date() });
      }
    } else {
      localStorage.removeItem(`kindred_active_${partnerCode}`);
      if (!this.useLocalStorageOnly) {
        await supabase.from('active_sessions').delete().eq('partner_code', partnerCode);
      }
    }
  }

  async getActiveActivity(partnerCode: string): Promise<Activity | null> {
    if (this.useLocalStorageOnly) {
        const saved = localStorage.getItem(`kindred_active_${partnerCode}`);
        return saved ? JSON.parse(saved) : null;
    }
    const { data } = await supabase.from('active_sessions').select('activity').eq('partner_code', partnerCode).maybeSingle();
    return data?.activity || null;
  }

  // --- Realtime ---

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

  // --- Misc ---

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
    const updated = [...this.getLocal<ChatMessage>(`kindred_chat_${partnerCode}`), message].slice(-50);
    this.saveLocal(`kindred_chat_${partnerCode}`, updated);
  }

  async getChatHistory(partnerCode: string): Promise<ChatMessage[]> {
    return this.getLocal<ChatMessage>(`kindred_chat_${partnerCode}`);
  }

  // Fixed error in AICoach.tsx: added missing clearChatHistory method
  async clearChatHistory(partnerCode: string): Promise<void> {
    this.saveLocal(`kindred_chat_${partnerCode}`, []);
  }

  async getPartnerPromptAnswer(partnerCode: string, myId: string): Promise<string | null> {
    if (this.useLocalStorageOnly) return null;
    const { data } = await supabase.from('prompt_answers').select('answer').eq('partner_code', partnerCode).neq('user_id', myId).maybeSingle();
    return data?.answer || null;
  }

  async submitPromptAnswer(partnerCode: string, userId: string, answer: string) {
    if (!this.useLocalStorageOnly) {
      await supabase.from('prompt_answers').upsert({ partner_code: partnerCode, user_id: userId, answer, updated_at: new Date() }, { onConflict: 'partner_code,user_id' });
    }
  }

  async getGoals(partnerCode: string): Promise<Goal[]> {
    const { data } = await supabase.from('goals').select('*').eq('partner_code', partnerCode);
    return (data || []).map(d => ({ id: d.id, title: d.title, type: 'Couple', progress: d.progress, lastUpdated: new Date(d.updated_at).getTime(), microSteps: d.micro_steps, encouragement: d.encouragement }));
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

  async markWeeklySynthesisRead(partnerCode: string, id: string, userId: string) {
    const key = `kindred_weekly_${partnerCode}`;
    const list = this.getLocal<WeeklySynthesis>(key).map(s => s.id === id ? { ...s, readBy: [...new Set([...s.readBy, userId])] } : s);
    this.saveLocal(key, list);
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

  async updateLastActive(userId: string) {
    await supabase.from('profiles').update({ last_active: new Date().toISOString() }).eq('id', userId);
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
}

export const cloudService = new CloudService();
