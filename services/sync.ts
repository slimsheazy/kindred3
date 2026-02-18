
import { UserData, Goal, BondScore } from '../types';
import { isSupabaseConfigured } from './supabase';
import * as queries from '../lib/supabase/queries';

export interface SyncItem {
  id: string;
  type: 'goal' | 'vibe' | 'score' | 'profile' | 'journal' | 'active_session';
  data: any;
  timestamp: number;
  partnerCode: string;
  retries: number;
  nextRetry: number;
}

const MAX_RETRIES = 5;
const BASE_BACKOFF = 1000; // 1 second

class SyncService {
  private useLocalStorageOnly = !isSupabaseConfigured;
  private isProcessing = false;
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.initSyncListeners();
    }
  }

  private initSyncListeners() {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SYNC_FLUSH_REQUIRED') this.processSyncQueue();
    });
    window.addEventListener('online', () => this.processSyncQueue());
    // Periodically check queue if online
    setInterval(() => {
      if (navigator.onLine) this.processSyncQueue();
    }, 30000);
  }

  public getSyncQueue(): SyncItem[] {
    try {
      const saved = localStorage.getItem('kindred_sync_queue');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  private saveSyncQueue(queue: SyncItem[]) {
    localStorage.setItem('kindred_sync_queue', JSON.stringify(queue));
  }

  /**
   * Adds a mutation to the queue for deferred execution.
   */
  async enqueue(type: SyncItem['type'], data: any, partnerCode: string = '', id?: string) {
    const item: SyncItem = {
      id: id || `${type}-${Date.now()}`,
      type,
      data,
      partnerCode,
      timestamp: Date.now(),
      retries: 0,
      nextRetry: Date.now()
    };

    const queue = this.getSyncQueue();
    // Prevent duplicate pending updates for the same entity
    const filtered = queue.filter(q => !(q.id === item.id && q.type === item.type));
    this.saveSyncQueue([...filtered, item]);

    if (navigator.onLine) {
      this.processSyncQueue();
    }
  }

  /**
   * Processes the queue with exponential backoff.
   */
  async processSyncQueue() {
    if (this.isProcessing || !navigator.onLine || this.useLocalStorageOnly) return;
    
    const queue = this.getSyncQueue();
    if (queue.length === 0) return;

    this.isProcessing = true;
    const now = Date.now();
    const successfulIds: string[] = [];
    const failedItems: SyncItem[] = [];

    for (const item of queue) {
      if (item.nextRetry > now) {
        failedItems.push(item);
        continue;
      }

      try {
        let success = false;
        switch (item.type) {
          case 'vibe':
            await queries.updateProfileVibe(item.id, item.data);
            success = true;
            break;
          case 'goal':
            await queries.upsertRemoteGoal(item.partnerCode, item.data);
            success = true;
            break;
          case 'score':
            await queries.upsertRemoteScore(item.partnerCode, item.data.category, item.data.score);
            success = true;
            break;
          case 'profile':
            await queries.upsertProfile(item.data);
            success = true;
            break;
          // Add other types as needed
        }

        if (success) {
          successfulIds.push(item.id + item.type);
        }
      } catch (err) {
        console.warn(`[SyncService] Failed to sync ${item.type} ${item.id}. Retrying later.`, err);
        if (item.retries < MAX_RETRIES) {
          failedItems.push({
            ...item,
            retries: item.retries + 1,
            nextRetry: now + Math.pow(2, item.retries) * BASE_BACKOFF
          });
        }
        // If it's a hard error or max retries reached, we drop it (log in production)
      }
    }

    this.saveSyncQueue(failedItems);
    this.isProcessing = false;

    if (successfulIds.length > 0 && 'serviceWorker' in navigator) {
       // Optional: Notify app that some data was successfully synced
    }
  }

  async verifyAndSyncSession(): Promise<UserData | null> {
    if (this.useLocalStorageOnly) return null;
    try {
      const { data: { session } } = await queries.getSession();
      if (!session) return null;
      return await this.getProfile(session.user.id);
    } catch {
      return null;
    }
  }

  async getProfile(userId: string): Promise<UserData | null> {
    if (this.useLocalStorageOnly) return null;
    const { data } = await queries.fetchProfile(userId);
    if (!data) return null;
    return {
      id: data.id,
      userName: data.user_name,
      partnerName: data.partner_name,
      yearsTogether: '',
      focusAreas: data.focus_areas || [],
      partnerCode: data.partner_code || undefined,
      syncStatus: 'synced',
      vibe: data.vibe || undefined,
      theme: (data.theme as 'light' | 'midnight') || 'midnight'
    };
  }
}

export const syncService = new SyncService();
