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
  questions = input<ResultQuestion[]>([]);

  isPreview = input<boolean>(false);

  liveStatus = input<string>('');

  resultsLoaded = input<boolean>(false);

  isLoadingResults = input<boolean>(false);

  resultsError = input<string>('');

  hasPendingVote = input<boolean>(false);

  hasVotes = input<boolean>(false);

  /** Convert the existing calculated fill widths into relative track widths. */
  resultTrackWidth: number = RESULT_TRACK_WIDTH;

  retryRequested = output<void>();
}
