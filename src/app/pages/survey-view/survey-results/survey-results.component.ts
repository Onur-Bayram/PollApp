import { Component, input, output } from '@angular/core';

import { RESULT_TRACK_WIDTH } from '../../../models/survey-constants';
import { ResultQuestion } from '../../../models/survey-result';

/** Render result charts and feedback while the survey view owns totals and subscriptions. */
@Component({
  selector: 'app-survey-results',
  templateUrl: './survey-results.component.html',
  styleUrls: ['../survey-view-shared.css', './survey-results.component.css'],
})
export class SurveyResultsComponent {
  /** Receive a fresh list so changes to existing chart objects are displayed too. */
  questions = input<ResultQuestion[]>([]);

  /** Preserve the static design preview's heading sizes and example totals. */
  isPreview = input<boolean>(false);

  /** Show LIVE only when the current subscription has connected. */
  liveStatus = input<string>('');

  /** Distinguish loaded zero totals from an unfinished initial request. */
  resultsLoaded = input<boolean>(false);

  /** Keep request progress visible without discarding the existing charts. */
  isLoadingResults = input<boolean>(false);

  /** Show a failed totals request beside its retry action. */
  resultsError = input<string>('');

  /** Label totals that include the voter's current unsaved selection. */
  hasPendingVote = input<boolean>(false);

  /** Show the empty-state message only when no stored or preview votes exist. */
  hasVotes = input<boolean>(false);

  /** Convert the existing calculated fill widths into relative track widths. */
  resultTrackWidth: number = RESULT_TRACK_WIDTH;

  /** Ask the survey view to retry its current results request. */
  retryRequested = output<void>();
}
