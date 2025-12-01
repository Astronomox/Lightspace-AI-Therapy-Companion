export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  // FIX: Use snake_case for user_id to match database schema
  user_id?: string;
}

export type TherapyMode = 'general' | 'venting' | 'problem-solving' | 'gratitude' | 'anxiety';

export interface TherapyModeDetails {
  id: TherapyMode;
  label: string;
  description: string;
  icon: string;
}
