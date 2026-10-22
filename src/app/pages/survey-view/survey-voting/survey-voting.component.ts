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
  questionRows = input<ResultQuestion[][]>([]);

  answerControls = input<FormControl<boolean>[][]>([]);

  answerErrors = input<boolean[]>([]);

  isPreview = input<boolean>(false);

  isClosed = input<boolean>(false);

  isSubmitting = input<boolean>(false);

  isResetting = input<boolean>(false);

  voteSaved = input<boolean>(false);

  voteError = input<string>('');

  voteMemoryNotice = input<string>('');

  answerChanged = output<{ question: ResultQuestion; answerIndex: number; checked: boolean }>();

  voteRequested = output<void>();
}
