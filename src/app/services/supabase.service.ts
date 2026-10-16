import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

// Share one Supabase client with the services that will read and save surveys.
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  client: SupabaseClient;

  constructor() {
    this.client = createClient(environment.supabaseUrl, environment.supabasePublishableKey);
  }
}
