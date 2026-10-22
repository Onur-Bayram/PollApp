import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';

import { PublishFeedbackService } from '../../services/publish-feedback.service';

/** Return to Home after the user closes the publishing confirmation. */
@Component({
  selector: 'app-publish-feedback',
  templateUrl: './publish-feedback.component.html',
  styleUrl: './publish-feedback.component.css',
})
export class PublishFeedbackComponent {
  isOpening = signal<boolean>(false);
  openError = signal<string>('');

  /** Connect the services used by this component. */
  constructor(public feedback: PublishFeedbackService, private router: Router) {}

  /** Keep the confirmation available if returning to Home fails. */
  async close(): Promise<void> {
    if (this.isOpening() || !this.feedback.isVisible()) return;
    this.isOpening.set(true);
    this.openError.set('');
    try {
      await this.openHome();
    } catch {
      this.showOpenError();
    } finally {
      this.isOpening.set(false);
    }
  }

  /** The confirmation contains only one interactive control. */
  keepFocusInside(event: KeyboardEvent, button: HTMLButtonElement): void {
    if (event.key === 'Tab') {
      event.preventDefault();
      button.focus();
    }
  }

  /** Close the confirmation once Home is open, including when it was already active. */
  private async openHome(): Promise<void> {
    const navigated = await this.router.navigate(['/']);
    if (!navigated && this.router.url !== '/') {
      throw new Error('The home page could not open.');
    }
    this.feedback.hide();
    window.scrollTo(0, 0);
  }

  /** Retry the return to Home without publishing another copy. */
  private showOpenError(): void {
    this.openError.set('Your survey is saved. Please close this message again to return to the home page.');
    setTimeout(() => document.getElementById('publish-confirmation-close')?.focus());
  }
}
