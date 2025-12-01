export interface Mood {
  id: string;
  user_id: string;
  rating: number; // 1-5
  emotions: string[];
  note?: string;
  created_at: Date;
}
