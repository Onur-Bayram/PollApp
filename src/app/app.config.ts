import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

import { APP_ROUTES } from './app.routes';

// Enable navigation between the pages defined in app.routes.ts.
export const APP_CONFIG: ApplicationConfig = {
  providers: [provideRouter(APP_ROUTES)],
};
