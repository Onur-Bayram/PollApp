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
  questions = input<SurveyQuestionForm[]>([]);

  questionErrors = input<boolean[]>([]);

  answerErrors = input<boolean[][]>([]);

  maxQuestions = input<number>(MAX_QUESTIONS);

  questionTextLimit = input<number>(QUESTION_TEXT_LIMIT);

  answerLetters = input<string[]>(ANSWER_LETTERS);

  minAnswers: number = MIN_ANSWERS;

  fieldBlurred = output<FormControl<string>>();

  questionAdded = output<void>();

  questionRemoved = output<number>();

  answerAdded = output<FormControl<string>[]>();

  answerRemoved = output<{ questionIndex: number; answerIndex: number }>();
}
