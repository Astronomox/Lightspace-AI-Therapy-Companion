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

  async sendPasswordResetEmail(email: string): Promise<void> {
    const { error } = await this.supabase.client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin, // URL to redirect to after password reset
    });
    if (error) {
      // Don't reveal if an email doesn't exist for security reasons
      console.error('Password reset error:', error);
      // For the user, we can pretend it always works unless it's a server error
      if (error.status && error.status >= 500) {
        throw new Error("Could not send password reset email. Please try again later.");
      }
    }
  }

  async uploadAvatar(file: File): Promise<string> {
    const user = this.currentUser();
    if (!user) throw new Error('You must be logged in to upload an avatar.');

    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await this.supabase.client.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Failed to upload avatar: ${uploadError.message}`);
    }

    const { data } = this.supabase.client.storage.from('avatars').getPublicUrl(filePath);
    
    if (!data?.publicUrl) {
      throw new Error('Could not get public URL for avatar.');
    }
    
    await this.updateUserAvatar(data.publicUrl);
    return data.publicUrl;
  }

  private async updateUserAvatar(avatarUrl: string): Promise<void> {
    const { data, error } = await this.supabase.client.auth.updateUser({
      data: { avatar_url: avatarUrl },
    });
    if (error) throw new Error('Failed to update user avatar.');
    if (data.user) {
        // Manually update the signal to reflect the change immediately
        this.currentUser.set(data.user);
    }
  }
}