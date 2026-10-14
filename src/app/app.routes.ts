import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { SurveyViewComponent } from './pages/survey-view/survey-view.component';
import { ThumbnailComponent } from './pages/thumbnail/thumbnail.component';

// Map URL paths to page components.
export const routes: Routes = [
  // Show the home page at the site root.
  { path: '', component: HomeComponent },
  // Open the survey detail view after a valid Publish action.
  { path: 'survey', component: SurveyViewComponent },
  // Show the project thumbnail at /thumbnail.
  { path: 'thumbnail', component: ThumbnailComponent },
  // Redirect unknown URLs to the home page.
  { path: '**', redirectTo: '' },
];
