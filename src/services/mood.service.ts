import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { Mood } from '../models/mood.model';

@Injectable({
  providedIn: 'root',
})
export class MoodService {
  private supabase = inject(SupabaseService);
  private authService = inject(AuthService);

  readonly moods = signal<Mood[]>([]);

  constructor() {}

  async loadMoods(): Promise<void> {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    try {
      const { data, error } = await this.supabase.client
        .from('moods')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // FIX: Use created_at to match the Mood model property.
      this.moods.set(data.map(m => ({ ...m, created_at: new Date(m.created_at) })));
    } catch (error) {
      console.error('Error loading moods:', error);
    }
  }

  // FIX: Use snake_case properties in Omit to match the Mood model.
  async addMood(moodEntry: Omit<Mood, 'id' | 'user_id' | 'created_at'>): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;

    try {
        const { data, error } = await this.supabase.client
        .from('moods')
        .insert({
            user_id: user.id,
            rating: moodEntry.rating,
            emotions: moodEntry.emotions,
            note: moodEntry.note
        })
        .select()
        .single();

      if (error) throw error;

      if(data) {
        // FIX: Use created_at to match the Mood model property.
        const newMood: Mood = { ...data, created_at: new Date(data.created_at) };
        this.moods.update(currentMoods => [newMood, ...currentMoods]);
      }
      
    } catch (error) {
      console.error('Error adding mood:', error);
    }
  }
}
