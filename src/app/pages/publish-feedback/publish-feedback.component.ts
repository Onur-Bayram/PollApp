import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';

import { PublishFeedbackService } from '../../services/publish-feedback.service';

// Open the saved survey only after the user closes its confirmation.
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

  /** Retry navigation with the same saved ID if the page could not open. */
  async close(): Promise<void> {
    const surveyId = this.feedback.surveyId;
    if (this.isOpening() || surveyId === null) return;
    this.isOpening.set(true);
    this.openError.set('');
    try {
      await this.openSurvey(surveyId);
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

  /** Keep the confirmation until navigation to this saved ID succeeds. */
  private async openSurvey(surveyId: number): Promise<void> {
    const navigated = await this.router.navigate(['/survey', surveyId]);
    if (!navigated && this.router.url !== '/survey/' + surveyId) {
      throw new Error('The saved survey page could not open.');
    }
    this.feedback.hide();
    window.scrollTo(0, 0);
  }

  /** Preserve the ID for a navigation retry without publishing another copy. */
  private showOpenError(): void {
    this.openError.set('Your survey is saved. Please close this message again to open it.');
    setTimeout(() => document.getElementById('publish-confirmation-close')?.focus());
  }
}
