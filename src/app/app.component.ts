import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { PublishFeedbackComponent } from './pages/publish-feedback/publish-feedback.component';
import { PublishFeedbackService } from './services/publish-feedback.service';

/** Keep the current page and Publish feedback available across route changes. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PublishFeedbackComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  /**
   * Connect the services used by this component.
   * @param publishFeedback - Shared publishing confirmation state displayed by the app.
   */
  constructor(public publishFeedback: PublishFeedbackService) {}
}
