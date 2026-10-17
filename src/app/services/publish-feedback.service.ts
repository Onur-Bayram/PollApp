import { Injectable, signal } from '@angular/core';

// Keep the saved survey ID until its confirmation has been closed.
@Injectable({ providedIn: 'root' })
export class PublishFeedbackService {
  isVisible = signal(false);
  surveyId: number | null = null;

  // Wait for the user's confirmation instead of closing after a timer.
  show(surveyId: number): void {
    this.surveyId = surveyId;
    this.isVisible.set(true);
    setTimeout(() => {
      if (this.isVisible()) {
        document.body.style.overflow = 'hidden';
        document.getElementById('publish-confirmation-close')?.focus();
      }
    });
  }

  // Restore page scrolling after the saved survey has opened.
  hide(): void {
    this.isVisible.set(false);
    this.surveyId = null;
    document.body.style.overflow = '';
  }
}
