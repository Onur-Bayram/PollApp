import { bootstrapApplication } from '@angular/platform-browser';

import { AppComponent } from './app/app.component';
import { APP_CONFIG } from './app/app.config';

// Start Angular with the root component and report startup errors in the console.
bootstrapApplication(AppComponent, APP_CONFIG)
  .catch((error) => console.error(error));
