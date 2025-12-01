import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { User, Session } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private supabase = inject(SupabaseService);
  
  readonly currentUser = signal<User | null>(null);

  constructor() {
    this.supabase.client.auth.onAuthStateChange((event, session) => {
      this.handleAuthStateChange(session);
    });

    // Initial check
    this.supabase.client.auth.getSession().then(({ data }) => {
        if (data.session) {
            this.handleAuthStateChange(data.session);
        }
    });
  }

  private handleAuthStateChange(session: Session | null) {
      const user = session?.user ?? null;
      this.currentUser.set(user);
  }

  async signUp(email: string, password: string): Promise<void> {
    const { data, error } = await this.supabase.client.auth.signUp({
      email,
      password,
    });
    if (error) {
      throw new Error(error.message);
    }
    if (!data.session) {
        throw new Error("Sign up successful, but no session created. Please check your email for a confirmation link.");
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw new Error(error.message);
    }
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.client.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }
}
