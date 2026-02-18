
import { supabase } from '../../services/supabase';
import { Database } from '../../database.types';
import { Goal, BondScore, GrowthLog } from '../../types';

type Tables = Database['public']['Tables'];

/**
 * AUTH HELPERS
 */
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
};

/**
 * AUTH QUERIES
 */
export const signInWithOtp = async (email: string) => {
  try {
    const result = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (result.error) console.error(`[Supabase Auth] Sign-in error for ${email}:`, result.error.message);
    return result;
  } catch (err) {
    console.error(`[Supabase Exception] Unexpected failure during sign-in for ${email}:`, err);
    throw err;
  }
};

export const getSession = async () => {
  try {
    const result = await supabase.auth.getSession();
    if (result.error) console.error(`[Supabase Auth] Session retrieval error:`, result.error.message);
    return result;
  } catch (err) {
    console.error(`[Supabase Exception] Unexpected failure getting session:`, err);
    throw err;
  }
};

export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  try {
    return supabase.auth.onAuthStateChange(callback);
  } catch (err) {
    console.error(`[Supabase Auth] Failed to attach auth state change listener:`, err);
    throw err;
  }
};

export const signOut = async () => {
  try {
    const result = await supabase.auth.signOut();
    if (result.error) console.error(`[Supabase Auth] Sign-out error:`, result.error.message);
    return result;
  } catch (err) {
    console.error(`[Supabase Exception] Unexpected failure during sign-out:`, err);
    throw err;
  }
};

/**
 * PROFILE QUERIES
 */
export const fetchProfile = async (userId: string) => {
  try {
    const result = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (result.error) console.error(`[Supabase Query] Error fetching profile for ${userId}:`, result.error.message);
    return result;
  } catch (err) {
    console.error(`[Supabase Exception] Failed to fetch profile for ${userId}:`, err);
    return { data: null, error: err };
  }
};

export const upsertProfile = async (profile: Tables['profiles']['Insert']) => {
  try {
    const user = await getCurrentUser();
    if (!user || user.id !== profile.id) throw new Error("Unauthorized: Identity mismatch");

    const result = await supabase.from('profiles').upsert({
      ...profile,
      updated_at: new Date().toISOString()
    });
    if (result.error) console.error(`[Supabase Query] Error upserting profile for ${profile.id}:`, result.error.message);
    return result;
  } catch (err) {
    console.error(`[Supabase Exception] Failed to upsert profile for ${profile.id}:`, err);
    throw err;
  }
};

export const updateProfileVibe = async (userId: string, vibe: string) => {
  try {
    const user = await getCurrentUser();
    if (!user || user.id !== userId) throw new Error("Unauthorized: Identity mismatch");

    const result = await supabase.from('profiles').update({ vibe, updated_at: new Date().toISOString() }).eq('id', userId);
    if (result.error) console.error(`[Supabase Query] Error updating vibe for ${userId}:`, result.error.message);
    return result;
  } catch (err) {
    console.error(`[Supabase Exception] Failed to update vibe for ${userId}:`, err);
    throw err;
  }
};

export const updateProfilePartnerCode = async (userId: string, partnerCode: string) => {
  try {
    const user = await getCurrentUser();
    if (!user || user.id !== userId) throw new Error("Unauthorized: Identity mismatch");

    const result = await supabase.from('profiles').update({ partner_code: partnerCode }).eq('id', userId);
    if (result.error) console.error(`[Supabase Query] Error updating partner code for ${userId}:`, result.error.message);
    return result;
  } catch (err) {
    console.error(`[Supabase Exception] Failed to update partner code for ${userId}:`, err);
    throw err;
  }
};

/**
 * GOAL QUERIES
 */
export const fetchRemoteGoals = async (partnerCode: string) => {
  try {
    const result = await supabase.from('goals').select('*').eq('partner_code', partnerCode);
    if (result.error) console.error(`[Supabase Query] Error fetching goals for ${partnerCode}:`, result.error.message);
    return result;
  } catch (err) {
    console.error(`[Supabase Exception] Failed to fetch goals for ${partnerCode}:`, err);
    return { data: null, error: err };
  }
};

export const upsertRemoteGoal = async (partnerCode: string, goal: Goal) => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized: Session required");

    const result = await supabase.from('goals').upsert({
      id: goal.id,
      partner_code: partnerCode,
      title: goal.title,
      progress: goal.progress,
      micro_steps: goal.microSteps as any,
      encouragement: goal.encouragement || null,
      updated_at: new Date(goal.lastUpdated).toISOString()
    });
    if (result.error) console.error(`[Supabase Query] Error upserting goal ${goal.id} for ${partnerCode}:`, result.error.message);
    return result;
  } catch (err) {
    console.error(`[Supabase Exception] Failed to upsert goal ${goal.id} for ${partnerCode}:`, err);
    throw err;
  }
};

/**
 * SCORE QUERIES
 */
export const fetchRemoteScores = async (partnerCode: string) => {
  try {
    const result = await supabase.from('bond_scores').select('*').eq('partner_code', partnerCode);
    if (result.error) console.error(`[Supabase Query] Error fetching scores for ${partnerCode}:`, result.error.message);
    return result;
  } catch (err) {
    console.error(`[Supabase Exception] Failed to fetch scores for ${partnerCode}:`, err);
    return { data: null, error: err };
  }
};

export const upsertRemoteScore = async (partnerCode: string, category: string, score: number) => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized: Session required");

    const result = await supabase.from('bond_scores').upsert({
      partner_code: partnerCode,
      category,
      score,
      updated_at: new Date().toISOString()
    }, { onConflict: 'partner_code,category' });
    if (result.error) console.error(`[Supabase Query] Error upserting score for ${category} in ${partnerCode}:`, result.error.message);
    return result;
  } catch (err) {
    console.error(`[Supabase Exception] Failed to upsert score for ${category} in ${partnerCode}:`, err);
    throw err;
  }
};

/**
 * SESSION & ACTIVITY QUERIES
 */
export const fetchRemoteActiveSession = async (partnerCode: string) => {
  try {
    const result = await supabase.from('active_sessions').select('activity').eq('partner_code', partnerCode).maybeSingle();
    if (result.error) console.error(`[Supabase Query] Error fetching session for ${partnerCode}:`, result.error.message);
    return result;
  } catch (err) {
    console.error(`[Supabase Exception] Failed to fetch active session for ${partnerCode}:`, err);
    return { data: null, error: err };
  }
};

export const upsertRemoteActiveSession = async (partnerCode: string, activity: any) => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized: Session required");

    const result = await supabase.from('active_sessions').upsert({
      partner_code: partnerCode,
      activity,
      updated_at: new Date().toISOString()
    });
    if (result.error) console.error(`[Supabase Query] Error upserting session for ${partnerCode}:`, result.error.message);
    return result;
  } catch (err) {
    console.error(`[Supabase Exception] Failed to upsert active session for ${partnerCode}:`, err);
    throw err;
  }
};

export const deleteRemoteActiveSession = async (partnerCode: string) => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized: Session required");

    const result = await supabase.from('active_sessions').delete().eq('partner_code', partnerCode);
    if (result.error) console.error(`[Supabase Query] Error deleting session for ${partnerCode}:`, result.error.message);
    return result;
  } catch (err) {
    console.error(`[Supabase Exception] Failed to delete active session for ${partnerCode}:`, err);
    throw err;
  }
};

/**
 * GROWTH LOG QUERIES
 */
export const fetchRemoteGrowthLogs = async (partnerCode: string) => {
  try {
    const result = await supabase.from('growth_logs').select('*').eq('partner_code', partnerCode).order('created_at', { ascending: false });
    if (result.error) console.error(`[Supabase Query] Error fetching logs for ${partnerCode}:`, result.error.message);
    return result;
  } catch (err) {
    console.error(`[Supabase Exception] Failed to fetch growth logs for ${partnerCode}:`, err);
    return { data: null, error: err };
  }
};

export const insertRemoteGrowthLog = async (partnerCode: string, log: GrowthLog) => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized: Session required");

    const result = await supabase.from('growth_logs').insert({
      id: log.id,
      partner_code: partnerCode,
      category: log.category,
      delta: log.delta,
      context: log.context,
      created_at: new Date(log.timestamp).toISOString()
    });
    if (result.error) console.error(`[Supabase Query] Error inserting log for ${partnerCode}:`, result.error.message);
    return result;
  } catch (err) {
    console.error(`[Supabase Exception] Failed to insert growth log for ${partnerCode}:`, err);
    throw err;
  }
};

/**
 * REALTIME HELPERS
 */
export const createPresenceChannel = (partnerCode: string, userId: string) => {
  try {
    return supabase.channel(`presence:${partnerCode}`, { config: { presence: { key: userId } } });
  } catch (err) {
    console.error(`[Supabase Realtime] Error creating presence channel for ${partnerCode}:`, err);
    throw err;
  }
};

export const createPulseChannel = (partnerCode: string) => {
  try {
    return supabase.channel(`pulses:${partnerCode}`);
  } catch (err) {
    console.error(`[Supabase Realtime] Error creating pulse channel for ${partnerCode}:`, err);
    throw err;
  }
};

export const createSyncChannel = (partnerCode: string) => {
  try {
    return supabase.channel(`sync:${partnerCode}`);
  } catch (err) {
    console.error(`[Supabase Realtime] Error creating sync channel for ${partnerCode}:`, err);
    throw err;
  }
};

/**
 * QUIZ QUERIES
 */
export const fetchRemoteQuizAnswers = async (partnerCode: string, topic: string) => {
  try {
    const result = await supabase.from('quiz_answers').select('*').eq('partner_code', partnerCode).eq('topic', topic);
    if (result.error) console.error(`[Supabase Query] Error fetching quiz answers for ${topic} in ${partnerCode}:`, result.error.message);
    return result;
  } catch (err) {
    console.error(`[Supabase Exception] Failed to fetch quiz answers for ${topic} in ${partnerCode}:`, err);
    return { data: null, error: err };
  }
};

export const upsertRemoteQuizAnswer = async (partnerCode: string, userId: string, topic: string, answer: any) => {
  try {
    const user = await getCurrentUser();
    if (!user || user.id !== userId) throw new Error("Unauthorized: Identity mismatch");

    const result = await supabase.from('quiz_answers').upsert({
      partner_code: partnerCode,
      user_id: userId,
      topic,
      answer,
      updated_at: new Date().toISOString()
    }, { onConflict: 'partner_code,user_id,topic' });
    if (result.error) console.error(`[Supabase Query] Error upserting answer for ${topic} by ${userId}:`, result.error.message);
    return result;
  } catch (err) {
    console.error(`[Supabase Exception] Failed to upsert quiz answer for ${topic} by ${userId}:`, err);
    throw err;
  }
};

export const fetchRemoteQuizSynthesis = async (partnerCode: string, topic: string) => {
  try {
    const result = await supabase.from('quiz_synthesis').select('synthesis').eq('partner_code', partnerCode).eq('topic', topic).maybeSingle();
    if (result.error) console.error(`[Supabase Query] Error fetching synthesis for ${topic}:`, result.error.message);
    return result;
  } catch (err) {
    console.error(`[Supabase Exception] Failed to fetch quiz synthesis for ${topic}:`, err);
    return { data: null, error: err };
  }
};

export const upsertRemoteQuizSynthesis = async (partnerCode: string, topic: string, synthesis: string) => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized: Session required");

    const result = await supabase.from('quiz_synthesis').upsert({
      partner_code: partnerCode,
      topic,
      synthesis,
      updated_at: new Date().toISOString()
    }, { onConflict: 'partner_code,topic' });
    if (result.error) console.error(`[Supabase Query] Error upserting synthesis for ${topic}:`, result.error.message);
    return result;
  } catch (err) {
    console.error(`[Supabase Exception] Failed to upsert quiz synthesis for ${topic}:`, err);
    throw err;
  }
};

/**
 * PATH QUERIES
 */
export const fetchRemoteLearningPath = async (partnerCode: string) => {
  try {
    const result = await supabase.from('learning_paths').select('modules').eq('partner_code', partnerCode).maybeSingle();
    if (result.error) console.error(`[Supabase Query] Error fetching learning path for ${partnerCode}:`, result.error.message);
    return result;
  } catch (err) {
    console.error(`[Supabase Exception] Failed to fetch learning path for ${partnerCode}:`, err);
    return { data: null, error: err };
  }
};

export const upsertRemoteLearningPath = async (partnerCode: string, modules: any[]) => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized: Session required");

    const result = await supabase.from('learning_paths').upsert({
      partner_code: partnerCode,
      modules,
      updated_at: new Date().toISOString()
    }, { onConflict: 'partner_code' });
    if (result.error) console.error(`[Supabase Query] Error upserting learning path for ${partnerCode}:`, result.error.message);
    return result;
  } catch (err) {
    console.error(`[Supabase Exception] Failed to upsert learning path for ${partnerCode}:`, err);
    throw err;
  }
};

/**
 * PROMPT QUERIES
 */
export const upsertRemotePromptAnswer = async (partnerCode: string, userId: string, answer: string) => {
  try {
    const user = await getCurrentUser();
    if (!user || user.id !== userId) throw new Error("Unauthorized: Identity mismatch");

    const result = await supabase.from('prompt_answers').upsert({
      partner_code: partnerCode,
      user_id: userId,
      answer,
      updated_at: new Date().toISOString()
    }, { onConflict: 'partner_code,user_id' });
    if (result.error) console.error(`[Supabase Query] Error upserting prompt answer for ${userId}:`, result.error.message);
    return result;
  } catch (err) {
    console.error(`[Supabase Exception] Failed to upsert prompt answer for ${userId}:`, err);
    throw err;
  }
};
