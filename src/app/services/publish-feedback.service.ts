import { Injectable, signal } from '@angular/core';

/** Keep the publishing confirmation visible until the user closes it. */
@Injectable({ providedIn: 'root' })
export class PublishFeedbackService {
  isVisible = signal<boolean>(false);

  /** Wait for the user's confirmation instead of closing after a timer. */
  show(): void {
    this.isVisible.set(true);
    setTimeout(() => {
      if (this.isVisible()) {
        document.body.style.overflow = 'hidden';
        document.getElementById('publish-confirmation-close')?.focus();
      }
    });
  }

  /** Restore page scrolling after returning to Home. */
  hide(): void {
    this.isVisible.set(false);
    document.body.style.overflow = '';
  }
}
