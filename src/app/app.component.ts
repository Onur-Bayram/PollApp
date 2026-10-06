import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

// Make the router outlet available in the application's root component.
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
})
export class AppComponent {}
