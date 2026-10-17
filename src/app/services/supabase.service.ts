import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { ENVIRONMENT } from '../../environments/environment';

// Share one Supabase client with the services that will read and save surveys.
@Injectable({ providedIn: 'root' })
export class SupabaseService {
  client: SupabaseClient;

  /** Initialize the shared public Supabase client for database access. */
  constructor() {
    this.client = createClient(ENVIRONMENT.supabaseUrl, ENVIRONMENT.supabasePublishableKey);
  }
}
