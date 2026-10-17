import { Routes } from '@angular/router';

import { HomeComponent } from './pages/home/home.component';
import { SurveyViewComponent } from './pages/survey-view/survey-view.component';
import { ThumbnailComponent } from './pages/thumbnail/thumbnail.component';

// Map URL paths to page components.
export const APP_ROUTES: Routes = [
  // Show the home page at the site root.
  { path: '', component: HomeComponent },
  // Keep the Team Activities design preview separate from saved surveys.
  { path: 'survey', component: SurveyViewComponent },
  // Load a saved survey by the ID returned from Supabase.
  { path: 'survey/:id', component: SurveyViewComponent },
  // Show the project thumbnail at /thumbnail.
  { path: 'thumbnail', component: ThumbnailComponent },
  // Redirect unknown URLs to the home page.
  { path: '**', redirectTo: '' },
];
