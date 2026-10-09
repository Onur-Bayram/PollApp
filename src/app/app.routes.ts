import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ThumbnailComponent } from './pages/thumbnail/thumbnail.component';
import { CreateSurveyComponent } from './pages/create-survey/create-survey.component';

// Map URL paths to page components.
export const routes: Routes = [
  // Show the home page at the site root.
  { path: '', component: HomeComponent },
  // Show the project thumbnail at /thumbnail.
  { path: 'thumbnail', component: ThumbnailComponent },
  // Open the create survey page from the New survey button.
  { path: 'create-survey', component: CreateSurveyComponent },
  // Redirect unknown URLs to the home page.
  { path: '**', redirectTo: '' },
];
