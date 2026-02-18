
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_name: string
          partner_name: string
          partner_code: string | null
          focus_areas: string[] | null
          vibe: string | null
          theme: string | null
          updated_at: string
        }
        Insert: {
          id: string
          user_name: string
          partner_name: string
          partner_code?: string | null
          focus_areas?: string[] | null
          vibe?: string | null
          theme?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_name?: string
          partner_name?: string
          partner_code?: string | null
          focus_areas?: string[] | null
          vibe?: string | null
          theme?: string | null
          updated_at?: string
        }
      }
      bond_scores: {
        Row: {
          partner_code: string
          category: string
          score: number
          updated_at: string
        }
        Insert: {
          partner_code: string
          category: string
          score: number
          updated_at?: string
        }
        Update: {
          partner_code?: string
          category?: string
          score?: number
          updated_at?: string
        }
      }
      goals: {
        Row: {
          id: string
          partner_code: string
          title: string
          progress: number
          micro_steps: Json | null
          encouragement: string | null
          updated_at: string
        }
        Insert: {
          id: string
          partner_code: string
          title: string
          progress?: number
          micro_steps?: Json | null
          encouragement?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          partner_code?: string
          title?: string
          progress?: number
          micro_steps?: Json | null
          encouragement?: string | null
          updated_at?: string
        }
      }
      active_sessions: {
        Row: {
          partner_code: string
          activity: Json | null
          updated_at: string
        }
        Insert: {
          partner_code: string
          activity?: Json | null
          updated_at?: string
        }
        Update: {
          partner_code?: string
          activity?: Json | null
          updated_at?: string
        }
      }
      growth_logs: {
        Row: {
          id: string
          partner_code: string
          category: string
          delta: number
          context: string
          created_at: string
        }
        Insert: {
          id: string
          partner_code: string
          category: string
          delta: number
          context: string
          created_at?: string
        }
        Update: {
          id?: string
          partner_code?: string
          category?: string
          delta?: number
          context?: string
          created_at?: string
        }
      }
      quiz_answers: {
        Row: {
          partner_code: string
          user_id: string
          topic: string
          answer: Json
          updated_at: string
        }
        Insert: {
          partner_code: string
          user_id: string
          topic: string
          answer: Json
          updated_at?: string
        }
        Update: {
          partner_code?: string
          user_id?: string
          topic?: string
          answer?: Json
          updated_at?: string
        }
      }
      quiz_synthesis: {
        Row: {
          partner_code: string
          topic: string
          synthesis: string
          updated_at: string
        }
        Insert: {
          partner_code: string
          topic: string
          synthesis: string
          updated_at?: string
        }
        Update: {
          partner_code?: string
          topic?: string
          synthesis?: string
          updated_at?: string
        }
      }
      learning_paths: {
        Row: {
          partner_code: string
          modules: Json | null
          updated_at: string
        }
        Insert: {
          partner_code: string
          modules?: Json | null
          updated_at?: string
        }
        Update: {
          partner_code?: string
          modules?: Json | null
          updated_at?: string
        }
      }
      prompt_answers: {
        Row: {
          partner_code: string
          user_id: string
          answer: string
          updated_at: string
        }
        Insert: {
          partner_code: string
          user_id: string
          answer: string
          updated_at?: string
        }
        Update: {
          partner_code?: string
          user_id?: string
          topic?: string
          answer?: string
          updated_at?: string
        }
      }
    }
  }
}
