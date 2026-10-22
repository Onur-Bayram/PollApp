import { Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ResultQuestion } from '../../../models/survey-result';

/** Display existing vote controls while the survey view owns validation and saving. */
@Component({
  selector: 'app-survey-voting',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './survey-voting.component.html',
  styleUrls: ['../survey-view-shared.css', './survey-voting.component.css', './survey-voting-mobile.css'],
})
export class SurveyVotingComponent {
  /** Preserve the existing one- or two-column grouping of survey questions. */
  questionRows = input<ResultQuestion[][]>([]);

  /** Bind the original controls so selections and saving locks stay synchronized. */
  answerControls = input<FormControl<boolean>[][]>([]);

  /** Receive each question's validation state from the existing voting rules. */
  answerErrors = input<boolean[]>([]);

  /** Keep the static design example's action separate from real submissions. */
  isPreview = input<boolean>(false);

  /** Explain a passed deadline and offer a return to the survey list. */
  isClosed = input<boolean>(false);

  /** Show progress while the original controls are locked by the parent. */
  isSubmitting = input<boolean>(false);

  /** Distinguish withdrawal progress from saving a new vote. */
  isResetting = input<boolean>(false);

  /** Offer Vote again only after a submission has succeeded. */
  voteSaved = input<boolean>(false);

  /** Keep a failed save or withdrawal beside the selected answers. */
  voteError = input<string>('');

  /** Explain browser memory failures without hiding a successful operation. */
  voteMemoryNotice = input<string>('');

  /** Ask the parent to apply the question's single- or multiple-answer rule. */
  answerChanged = output<{ question: ResultQuestion; answerIndex: number; checked: boolean }>();

  /** Ask the parent to save or withdraw using its current submission state. */
  voteRequested = output<void>();
}
