import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  public client: SupabaseClient;

  constructor() {
    const supabaseUrl = 'https://glqiguzdmxvxpwkuehbl.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdscWlndXpkbXh2eHB3a3VlaGJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTY2ODMsImV4cCI6MjA4MDE3MjY4M30.3y6w5ZyKs9Y-wRfMBDmhCxYnPjzUk8qR8Q7kWLBU3Vg';
    this.client = createClient(supabaseUrl, supabaseKey);
  }
}
