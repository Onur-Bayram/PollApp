import { Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { SurveyQuestionForm } from '../../../models/survey-form';
import { ANSWER_LETTERS, MAX_QUESTIONS, MIN_ANSWERS, QUESTION_TEXT_LIMIT } from '../../../models/survey-constants';

/** Display the question controls while the creation dialog manages their state. */
@Component({
  selector: 'app-survey-questions',
  imports: [ReactiveFormsModule],
  templateUrl: './survey-questions.component.html',
  styleUrls: ['../create-survey-controls.css', './survey-questions.component.css', './survey-questions-mobile.css'],
})
export class SurveyQuestionsComponent {
  /** Receive the original controls so adding or removing fields preserves their values. */
  questions = input<SurveyQuestionForm[]>([]);

  /** Receive the form's validation results without duplicating its rules. */
  questionErrors = input<boolean[]>([]);

  /** Match each answer error to its current question and answer position. */
  answerErrors = input<boolean[][]>([]);

  /** Use the form's configured limits and labels for the existing controls. */
  maxQuestions = input<number>(MAX_QUESTIONS);

  /** Show the same text limit as the question controls' validators. */
  questionTextLimit = input<number>(QUESTION_TEXT_LIMIT);

  /** Label the answers in their current order after removals. */
  answerLetters = input<string[]>(ANSWER_LETTERS);

  /** Keep the first two answer fields available when their contents are cleared. */
  minAnswers: number = MIN_ANSWERS;

  /** Ask the form to validate only the control that has lost focus. */
  fieldBlurred = output<FormControl<string>>();

  /** Ask the form to append another independent question. */
  questionAdded = output<void>();

  /** Ask the form to clear the first question or remove an added question. */
  questionRemoved = output<number>();

  /** Ask the form to append an answer to the original answer list. */
  answerAdded = output<FormControl<string>[]>();

  /** Identify the answer to clear or remove without changing the controls locally. */
  answerRemoved = output<{ questionIndex: number; answerIndex: number }>();
}
