import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

// Start Angular with the root component and report startup errors in the console.
bootstrapApplication(AppComponent, appConfig)
  .catch((error) => console.error(error));
