
import { UserData, Goal, BondScore, ChatMessage, Activity, GrowthLog, CourseModule, MicroStep, JournalEntry, WeeklySynthesis, FoundationSummary } from '../types';
import { isSupabaseConfigured } from './supabase';
import * as queries from '../lib/supabase/queries';
import { syncService } from './sync';
import { RealtimeChannel } from '@supabase/supabase-js';

class CloudService {
  private useLocalStorageOnly = !isSupabaseConfigured;
  private presenceChannel: RealtimeChannel | null = null;
  private lastTrackedData: any = {};
  
  constructor() {}

  private getLocal<T>(key: string): T[] {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  private saveLocal<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  private mergeGoals(local: Goal[], remote: Goal[]): Goal[] {
    const mergedMap = new Map<string, Goal>();
    local.forEach(g => mergedMap.set(g.id, g));
    remote.forEach(remoteGoal => {
      const localGoal = mergedMap.get(remoteGoal.id);
      if (!localGoal || remoteGoal.lastUpdated > localGoal.lastUpdated) {
        const localSteps = localGoal?.microSteps || [];
        const remoteSteps = remoteGoal.microSteps || [];
        const mergedSteps = this.mergeMicroSteps(localSteps, remoteSteps);
        mergedMap.set(remoteGoal.id, { ...remoteGoal, microSteps: mergedSteps });
      }
    });
    return Array.from(mergedMap.values());
  }

  private mergeMicroSteps(local: MicroStep[], remote: MicroStep[]): MicroStep[] {
    const stepMap = new Map<string, MicroStep>();
    local.forEach(s => stepMap.set(s.id, s));
    remote.forEach(rs => {
      const ls = stepMap.get(rs.id);
      if (!ls || rs.lastUpdated > ls.lastUpdated) stepMap.set(rs.id, rs);
    });
    return Array.from(stepMap.values());
  }

  async verifyAndSyncSession(): Promise<UserData | null> {
    return syncService.verifyAndSyncSession();
  }

  async signUp(userData: UserData): Promise<UserData> {
    if (this.useLocalStorageOnly) return userData;
    try {
      await queries.upsertProfile({
        id: userData.id,
        user_name: userData.userName,
        partner_name: userData.partnerName,
        partner_code: userData.partnerCode || null,
        focus_areas: userData.focusAreas,
        vibe: userData.vibe || 'Neutral',
        theme: userData.theme,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      await syncService.enqueue('profile', userData, '', userData.id);
    }
    return userData;
  }

  async getProfile(userId: string): Promise<UserData | null> {
    return syncService.getProfile(userId);
  }

  async getGoals(partnerCode: string): Promise<Goal[]> {
    const local = this.getLocal<Goal>(`kindred_goals_${partnerCode}`);
    if (this.useLocalStorageOnly) return local;
    try {
      const { data } = await queries.fetchRemoteGoals(partnerCode);
      if (!data) return local;
      const remote: Goal[] = data.map((d: any) => ({
        id: d.id,
        title: d.title,
        type: 'Couple',
        progress: d.progress,
        lastUpdated: new Date(d.updated_at).getTime(),
        microSteps: (d.micro_steps as any || []).map((ms: any) => ({ ...ms, lastUpdated: ms.lastUpdated || new Date(d.updated_at).getTime() })),
        encouragement: d.encouragement || undefined
      }));
      const reconciled = this.mergeGoals(local, remote);
      this.saveLocal(`kindred_goals_${partnerCode}`, reconciled);
      return reconciled;
    } catch (e) { return local; }
  }

  async saveGoal(partnerCode: string, goal: Goal) {
    const key = `kindred_goals_${partnerCode}`;
    const local = this.getLocal<Goal>(key);
    const existingIdx = local.findIndex(g => g.id === goal.id);
    const updatedLocal = [...local];
    if (existingIdx >= 0) updatedLocal[existingIdx] = goal;
    else updatedLocal.unshift(goal);
    this.saveLocal(key, updatedLocal);

    if (this.useLocalStorageOnly) return;
    try {
      await queries.upsertRemoteGoal(partnerCode, goal);
    } catch (e) {
      await syncService.enqueue('goal', goal, partnerCode, goal.id);
    }
  }

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
    try {
      const { data } = await queries.fetchRemoteScores(partnerCode);
      if (!data || data.length === 0) return this.getLocal<BondScore>(key);
      return data.map((d: any) => ({ category: d.category, score: d.score, timestamp: new Date(d.updated_at).getTime() }));
    } catch (e) { return this.getLocal<BondScore>(key); }
  }

  async updateBondScore(partnerCode: string, category: string, delta: number): Promise<void> {
    const scores = await this.getBondScores(partnerCode);
    const latest = [...scores.filter(s => s.category === category)].sort((a,b) => b.timestamp - a.timestamp)[0];
    const currentVal = latest ? latest.score : 3.5;
    const newVal = Math.min(10, Math.max(1, currentVal + delta));
    const newRecord = { category, score: newVal, timestamp: Date.now() };
    this.saveLocal(`kindred_scores_${partnerCode}`, [...scores, newRecord]);
    
    if (!this.useLocalStorageOnly) {
      try {
        await queries.upsertRemoteScore(partnerCode, category, newVal);
      } catch (e) {
        await syncService.enqueue('score', newRecord, partnerCode, category);
      }
    }
  }

  async batchUpdateScores(partnerCode: string, updates: { category: string, delta: number }[]): Promise<void> {
    for (const update of updates) await this.updateBondScore(partnerCode, update.category, update.delta);
  }

  async updateVibe(userId: string, vibe: string) {
    if (this.useLocalStorageOnly) return;
    try {
      await queries.updateProfileVibe(userId, vibe);
    } catch (e) {
      await syncService.enqueue('vibe', vibe, '', userId);
    }
  }

  async getLearningPath(partnerCode: string): Promise<CourseModule[]> {
    if (this.useLocalStorageOnly) return this.getLocal<CourseModule>(`kindred_path_${partnerCode}`);
    try {
      const { data } = await queries.fetchRemoteLearningPath(partnerCode);
      if (data?.modules) { this.saveLocal(`kindred_path_${partnerCode}`, data.modules as any); return data.modules as any; }
    } catch (e) {}
    return this.getLocal<CourseModule>(`kindred_path_${partnerCode}`);
  }

  async saveLearningPath(partnerCode: string, path: CourseModule[]): Promise<void> {
    this.saveLocal(`kindred_path_${partnerCode}`, path);
    if (!this.useLocalStorageOnly) {
      try { await queries.upsertRemoteLearningPath(partnerCode, path); } catch (e) {}
    }
  }

  async saveGrowthLog(partnerCode: string, log: GrowthLog): Promise<void> {
    const key = `kindred_growth_logs_${partnerCode}`;
    this.saveLocal(key, [log, ...this.getLocal<GrowthLog>(key)].slice(0, 50));
    if (!this.useLocalStorageOnly) {
      try { await queries.insertRemoteGrowthLog(partnerCode, log); } catch (e) {}
    }
  }

  async getGrowthLogs(partnerCode: string): Promise<GrowthLog[]> {
    if (!this.useLocalStorageOnly) {
      try {
        const { data } = await queries.fetchRemoteGrowthLogs(partnerCode);
        if (data) return data.map((d: any) => ({ id: d.id, timestamp: new Date(d.created_at).getTime(), category: d.category, delta: d.delta, context: d.context }));
      } catch (e) {}
    }
    return this.getLocal<GrowthLog>(`kindred_growth_logs_${partnerCode}`);
  }

  subscribeToPresence(partnerCode: string, userId: string, userName: string, vibe: string, onSync: (presenceState: any[]) => void) {
    if (this.useLocalStorageOnly) return () => {};
    const channel = queries.createPresenceChannel(partnerCode, userId);
    this.presenceChannel = channel;
    this.lastTrackedData = { id: userId, userName, vibe: vibe || 'Neutral', online_at: new Date().toISOString() };
    channel.on('presence', { event: 'sync' }, () => { const state = channel.presenceState(); onSync(Object.values(state).flat()); })
      .subscribe(async (status: string) => { if (status === 'SUBSCRIBED') await channel.track(this.lastTrackedData); });
    return () => { channel.unsubscribe(); this.presenceChannel = null; };
  }

  async setActiveActivity(partnerCode: string, activity: Activity | null): Promise<void> {
    if (activity) localStorage.setItem(`kindred_active_${partnerCode}`, JSON.stringify(activity));
    else localStorage.removeItem(`kindred_active_${partnerCode}`);
    if (!this.useLocalStorageOnly) {
      try {
        if (activity) await queries.upsertRemoteActiveSession(partnerCode, activity);
        else await queries.deleteRemoteActiveSession(partnerCode);
      } catch (e) {}
    }
  }

  async getActiveActivity(partnerCode: string): Promise<Activity | null> {
    if (!this.useLocalStorageOnly) {
      try {
        const { data } = await queries.fetchRemoteActiveSession(partnerCode);
        const activity = data?.activity as any;
        if (activity?.type !== 'path_generation') return activity || null;
      } catch (e) {}
    }
    const saved = localStorage.getItem(`kindred_active_${partnerCode}`);
    return saved ? JSON.parse(saved) : null;
  }

  async saveChatMessage(partnerCode: string, message: ChatMessage): Promise<void> {
    this.saveLocal(`kindred_chat_${partnerCode}`, [...this.getLocal<ChatMessage>(`kindred_chat_${partnerCode}`), message].slice(-50));
  }

  async getChatHistory(partnerCode: string): Promise<ChatMessage[]> { return this.getLocal<ChatMessage>(`kindred_chat_${partnerCode}`); }

  async submitPromptAnswer(partnerCode: string, userId: string, answer: string) {
    if (!this.useLocalStorageOnly) {
      try { await queries.upsertRemotePromptAnswer(partnerCode, userId, answer); } catch (e) {}
    }
  }

  async getPartnerByCode(id: string) {
    try { const { data } = await queries.fetchProfile(id); return data ? { id: data.id, userName: data.user_name } : null; } catch (e) { return null; }
  }

  async linkPartner(myId: string, partnerId: string) {
    try { await queries.updateProfilePartnerCode(myId, partnerId); } catch (e) {}
  }

  async checkMutualLink(myId: string, partnerId: string) {
    try { const { data } = await queries.fetchProfile(partnerId); return data?.partner_code === myId; } catch (e) { return false; }
  }

  async sendPulse(partnerCode: string, from: string) {
    const channel = queries.createPulseChannel(partnerCode);
    await channel.subscribe(async (s: string) => { if (s === 'SUBSCRIBED') { await channel.send({ type: 'broadcast', event: 'pulse', payload: { from, timestamp: Date.now() } }); channel.unsubscribe(); } });
  }

  subscribeToPulses(partnerCode: string, onPulse: (p: any) => void) {
    const channel = queries.createPulseChannel(partnerCode).on('broadcast', { event: 'pulse' }, ({ payload }: { payload: any }) => onPulse(payload)).subscribe();
    return () => { channel.unsubscribe(); };
  }

  subscribeToPartnerSpace(partnerCode: string, onUpdate: () => void) {
    if (this.useLocalStorageOnly) return () => {};
    const channel = queries.createSyncChannel(partnerCode)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bond_scores', filter: `partner_code=eq.${partnerCode}` }, onUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'active_sessions', filter: `partner_code=eq.${partnerCode}` }, onUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'learning_paths', filter: `partner_code=eq.${partnerCode}` }, onUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals', filter: `partner_code=eq.${partnerCode}` }, onUpdate)
      .subscribe();
    return () => { channel.unsubscribe(); };
  }

  async initializeBondScores(partnerCode: string, scores: Record<string, number>): Promise<void> {
    const records: BondScore[] = Object.entries(scores).map(([category, score]) => ({
      category,
      score,
      timestamp: 1 
    }));
    this.saveLocal(`kindred_scores_${partnerCode}`, records);
    if (!this.useLocalStorageOnly) {
      try {
        for (const record of records) {
          await queries.upsertRemoteScore(partnerCode, record.category, record.score);
        }
      } catch (e) {}
    }
  }

  async getQuizAnswers(partnerCode: string, topic: string): Promise<any[]> {
    const key = `kindred_quiz_answers_${partnerCode}_${topic}`;
    const local = this.getLocal<any>(key);
    if (this.useLocalStorageOnly) return local;
    try {
      const { data } = await queries.fetchRemoteQuizAnswers(partnerCode, topic);
      if (data) {
        const remote = data.map((d: any) => ({ userId: d.user_id, answers: d.answer, topic: d.topic }));
        this.saveLocal(key, remote);
        return remote;
      }
    } catch (e) {}
    return local;
  }

  async getQuizSynthesis(partnerCode: string, topic: string): Promise<string | null> {
    const key = `kindred_quiz_synthesis_${partnerCode}_${topic}`;
    const local = localStorage.getItem(key);
    if (this.useLocalStorageOnly) return local;
    try {
      const { data } = await queries.fetchRemoteQuizSynthesis(partnerCode, topic);
      if (data?.synthesis) {
        localStorage.setItem(key, data.synthesis);
        return data.synthesis;
      }
    } catch (e) {}
    return local;
  }

  async saveQuizSynthesis(partnerCode: string, topic: string, synthesis: string): Promise<void> {
    const key = `kindred_quiz_synthesis_${partnerCode}_${topic}`;
    localStorage.setItem(key, synthesis);
    if (!this.useLocalStorageOnly) {
      try {
        await queries.upsertRemoteQuizSynthesis(partnerCode, topic, synthesis);
      } catch (e) {}
    }
  }

  async saveQuizAnswer(partnerCode: string, userId: string, topic: string, answers: Record<string, string>): Promise<void> {
    const key = `kindred_quiz_answers_${partnerCode}_${topic}`;
    const local = this.getLocal<any>(key);
    const updated = [...local.filter(a => a.userId !== userId), { userId, answers, topic }];
    this.saveLocal(key, updated);
    if (!this.useLocalStorageOnly) {
      try {
        await queries.upsertRemoteQuizAnswer(partnerCode, userId, topic, answers);
      } catch (e) {}
    }
  }

  async sendQuizHandshake(partnerCode: string, userId: string, topic: string) {
    const channel = queries.createPulseChannel(`quiz_handshake:${partnerCode}`);
    await channel.subscribe(async (s: string) => {
      if (s === 'SUBSCRIBED') {
        await channel.send({ type: 'broadcast', event: 'handshake', payload: { userId, topic, timestamp: Date.now() } });
        channel.unsubscribe();
      }
    });
  }

  subscribeToQuizHandshake(partnerCode: string, onHandshake: (payload: any) => void) {
    const channel = queries.createPulseChannel(`quiz_handshake:${partnerCode}`)
      .on('broadcast', { event: 'handshake' }, ({ payload }: { payload: any }) => onHandshake(payload))
      .subscribe();
    return () => { channel.unsubscribe(); };
  }

  /**
   * Journaling Methods
   */
  async saveJournalEntry(partnerCode: string, entry: JournalEntry): Promise<void> {
    const key = `kindred_journal_${partnerCode}`;
    const list = this.getLocal<JournalEntry>(key);
    this.saveLocal(key, [entry, ...list]);
  }

  async getJournalEntries(partnerCode: string): Promise<JournalEntry[]> {
    return this.getLocal<JournalEntry>(`kindred_journal_${partnerCode}`);
  }

  /**
   * Weekly Synthesis Methods
   */
  async getLatestWeeklySynthesis(partnerCode: string): Promise<WeeklySynthesis | null> {
    const key = `kindred_weekly_${partnerCode}`;
    const list = this.getLocal<WeeklySynthesis>(key);
    return list.length > 0 ? list.sort((a,b) => b.timestamp - a.timestamp)[0] : null;
  }

  async saveWeeklySynthesis(synthesis: WeeklySynthesis): Promise<void> {
    const key = `kindred_weekly_${synthesis.partnerCode}`;
    const list = this.getLocal<WeeklySynthesis>(key);
    this.saveLocal(key, [synthesis, ...list]);
  }

  /**
   * Foundation Summary Methods
   */
  async getLatestFoundationSummary(partnerCode: string): Promise<FoundationSummary | null> {
    const data = localStorage.getItem(`kindred_foundation_${partnerCode}`);
    return data ? JSON.parse(data) : null;
  }

  async saveFoundationSummary(partnerCode: string, summary: FoundationSummary): Promise<void> {
    localStorage.setItem(`kindred_foundation_${partnerCode}`, JSON.stringify(summary));
  }
}

export const cloudService = new CloudService();
