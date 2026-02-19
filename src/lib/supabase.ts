import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

export interface Database {
  public: {
    Tables: {
      study_sessions: {
        Row: {
          id: string;
          user_id: string;
          subject: string;
          start_time: string;
          end_time: string | null;
          duration_minutes: number;
          pause_count: number;
          task_switches: number;
          cognitive_load_score: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject: string;
          start_time?: string;
          end_time?: string | null;
          duration_minutes?: number;
          pause_count?: number;
          task_switches?: number;
          cognitive_load_score?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subject?: string;
          start_time?: string;
          end_time?: string | null;
          duration_minutes?: number;
          pause_count?: number;
          task_switches?: number;
          cognitive_load_score?: number;
          created_at?: string;
        };
      };
      session_events: {
        Row: {
          id: string;
          session_id: string;
          event_type: 'pause_start' | 'pause_end' | 'task_switch';
          metadata: Record<string, unknown>;
          timestamp: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          event_type: 'pause_start' | 'pause_end' | 'task_switch';
          metadata?: Record<string, unknown>;
          timestamp?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          event_type?: 'pause_start' | 'pause_end' | 'task_switch';
          metadata?: Record<string, unknown>;
          timestamp?: string;
          created_at?: string;
        };
      };
    };
  };
}
