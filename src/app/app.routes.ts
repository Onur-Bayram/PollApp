import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { ThumbnailComponent } from './pages/thumbnail/thumbnail.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'thumbnail', component: ThumbnailComponent },
  { path: '**', redirectTo: '' },
];
