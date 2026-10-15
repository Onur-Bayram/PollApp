import { Injectable, signal } from '@angular/core';

// Keep the Publish feedback visible when the form closes and the route changes.
@Injectable({ providedIn: 'root' })
export class PublishFeedbackService {
  isVisible = signal(false);
  private hideTimeout = 0;

  // Restart the display time after each valid Publish action.
  show(): void {
    window.clearTimeout(this.hideTimeout);
    this.isVisible.set(true);
    this.hideTimeout = window.setTimeout(() => this.hide(), 4000);
  }

  // Clear the timer when the feedback is hidden or a new form opens.
  hide(): void {
    window.clearTimeout(this.hideTimeout);
    this.isVisible.set(false);
  }
}
