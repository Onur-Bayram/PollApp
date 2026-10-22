import { Component, OnDestroy, OnInit, output, signal } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { NewSurvey, NewSurveyQuestion } from '../../models/survey';
import { SurveyQuestionForm } from '../../models/survey-form';
import { ANSWER_LETTERS, DESCRIPTION_LIMIT, MAX_QUESTIONS, MIN_ANSWERS, QUESTION_TEXT_LIMIT, SURVEY_NAME_LIMIT } from '../../models/survey-constants';
import { PublishFeedbackService } from '../../services/publish-feedback.service';
import { SurveyService } from '../../services/survey.service';
import { SurveyDetailsComponent } from './survey-details/survey-details.component';
import { SurveyQuestionsComponent } from './survey-questions/survey-questions.component';

/** Manage the survey controls, validation and publishing inside the creation dialog. */
@Component({
  selector: 'app-create-survey',
  imports: [SurveyDetailsComponent, SurveyQuestionsComponent],
  templateUrl: './create-survey.component.html',
  styleUrls: ['./create-survey-controls.css', './create-survey.component.css', './create-survey-mobile.css'],
})
export class CreateSurveyComponent implements OnInit, OnDestroy {
  /** Let the parent page remove this dialog after cancellation or a successful save. */
  closed = output<void>();

  /** Require a survey name within the agreed character limit. */
  surveyName = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(SURVEY_NAME_LIMIT)] });

  /** Reveal optional-field validation after Publish has been clicked. */
  showValidation: boolean = false;

  /** Remember which required controls have been checked by blur or Publish. */
  private validatedFields: FormControl<string>[] = [];

  /** Prevent duplicate submissions while a save is in progress. */
  isSaving = signal<boolean>(false);

  /** Keep a failed save visible without losing the current form values. */
  publishError = signal<string>('');

  /** Keep the deadline optional while retaining the user's current value. */
  endDate = new FormControl('', { nonNullable: true });

  /** Keep new surveys open at least until the end of the current local day. */
  minimumEndDate: string = this.getToday();

  /** Describe a malformed or past date without changing the date control's value. */
  endDateError: string = '';

  /** Limit the optional description to the agreed length. */
  description = new FormControl('', { nonNullable: true, validators: Validators.maxLength(DESCRIPTION_LIMIT) });

  /** Limit the number of question groups offered by the child view. */
  maxQuestions: number = MAX_QUESTIONS;

  /** Share the question validator's length limit with the child view. */
  questionTextLimit: number = QUESTION_TEXT_LIMIT;

  /** Retain the original question and answer controls when the list changes. */
  questions: SurveyQuestionForm[] = [this.createQuestion()];

  /** Label the available answers and limit how many can be added. */
  answerLetters: string[] = ANSWER_LETTERS;

  /** Offer the same six topic categories as the home page. */
  categories: string[] = [
    'Team Activities',
    'Health & Wellness',
    'Gaming & Entertainment',
    'Education & Learning',
    'Lifestyle & Preferences',
    'Technology & Innovation',
  ];

  /** Preserve the category menu's open state while other fields change. */
  isCategoryMenuOpen: boolean = false;

  /** Store the category to include in the saved survey. */
  selectedCategory: string = '';

  /** Receive the services used to save, confirm and navigate from this dialog. */
  constructor(
    private publishFeedback: PublishFeedbackService,
    private surveys: SurveyService,
    private router: Router,
  ) {}

  /** Lock background scrolling and focus the first visible control after rendering. */
  ngOnInit(): void {
    document.body.style.overflow = 'hidden';
    setTimeout(() => this.focusInitialControl());
  }

  /** Restore page scrolling when the overlay is removed. */
  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  /** Close the overlay without navigating to another page. */
  close(): void {
    if (!this.isSaving()) {
      this.closed.emit();
    }
  }

  /** Close the creation dialog and return to Home when the mobile logo is pressed. */
  goHome(): void {
    if (this.isSaving()) return;
    this.closed.emit();
    void this.router.navigate(['/']);
  }

  /** Keep Tab and Shift+Tab inside the dialog's first and last buttons. */
  keepFocusInside(event: KeyboardEvent, first: HTMLButtonElement, last: HTMLButtonElement, home: HTMLButtonElement): void {
    if (event.key !== 'Tab') return;
    const atContainer = event.target === event.currentTarget;
    const atHome = event.shiftKey && event.target === home;
    const atFirst = event.shiftKey && event.target === first;
    const atLast = !event.shiftKey && event.target === last;
    if (atFirst && this.focusHomeButton(home)) { event.preventDefault(); return; }
    if (!atContainer && !atHome && !atFirst && !atLast) return;
    event.preventDefault();
    if (event.shiftKey) last.focus();
    else if (!this.focusHomeButton(home)) first.focus();
  }

  /** Keep the mobile logo in view; use the name field when the logo is hidden. */
  private focusInitialControl(): void {
    const home = document.querySelector<HTMLButtonElement>('#create-survey-home-button');
    if (home && this.focusHomeButton(home)) return;
    document.getElementById('survey-name')?.focus();
  }

  /** Try the mobile Home button; CSS hides it on desktop. */
  private focusHomeButton(button: HTMLButtonElement): boolean {
    button.focus();
    return document.activeElement === button;
  }

  /** Give every new question blank text, independent answers and its own checkbox. */
  createQuestion(): SurveyQuestionForm {
    return {
      text: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(QUESTION_TEXT_LIMIT)] }),
      answers: [this.createAnswer(), this.createAnswer()],
      allowMultipleAnswers: new FormControl(false, { nonNullable: true }),
    };
  }

  /** Apply the same required rule to initial and newly added answers. */
  createAnswer(): FormControl<string> {
    return new FormControl('', { nonNullable: true, validators: Validators.required });
  }

  /** Treat spaces as empty text as well as checking Angular's validators. */
  isFieldInvalid(control: FormControl<string>): boolean {
    return control.invalid || !control.value.trim();
  }

  /** Check a required field after it loses focus. */
  validateField(control: FormControl<string>): void {
    if (!this.validatedFields.includes(control)) this.validatedFields.push(control);
  }

  /** Keep untouched new fields quiet until they are checked individually or by Publish. */
  hasError(control: FormControl<string>): boolean {
    return this.validatedFields.includes(control) && this.isFieldInvalid(control);
  }

  /** Give the question view the current visibility of each question's error. */
  getQuestionErrors(): boolean[] {
    return this.questions.map(question => this.hasError(question.text));
  }

  /** Keep answer validation in the form while the question view displays its results. */
  getAnswerErrors(): boolean[][] {
    return this.questions.map(question => question.answers.map(answer => this.hasError(answer)));
  }

  /** Announce only errors that are currently highlighted in the form. */
  hasValidationErrors(): boolean {
    return this.validatedFields.some(control => this.isFieldInvalid(control))
      || (this.showValidation && (!!this.endDateError || this.description.invalid));
  }

  /** Collect the required controls that currently belong to the form. */
  private getRequiredFields(): FormControl<string>[] {
    const fields = [this.surveyName];
    this.questions.forEach(question => fields.push(question.text, ...question.answers));
    return fields;
  }

  /** Forget removed controls while keeping the remaining fields' validation state. */
  private discardRemovedFields(): void {
    const fields = this.getRequiredFields();
    this.validatedFields = this.validatedFields.filter(control => fields.includes(control));
  }

  /** Format the local date without shifting it to another day in UTC. */
  private getToday(): string {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    return today.getFullYear() + '-' + (month < 10 ? '0' : '') + month
      + '-' + (day < 10 ? '0' : '') + day;
  }

  /** Allow an empty date, but reject past deadlines before saving a new survey. */
  checkEndDate(field: HTMLInputElement): void {
    this.minimumEndDate = this.getToday();
    if (field.value.length === 10 && field.value < this.minimumEndDate) {
      this.endDateError = 'Choose today or a future date.';
    } else {
      this.endDateError = field.validity.valid ? '' : 'Enter a valid date.';
    }
  }

  /** Check the optional date and every required question and answer. */
  isSurveyComplete(): boolean {
    return !this.endDateError && !this.description.invalid && !this.isFieldInvalid(this.surveyName)
      && this.questions.every(question => this.isQuestionComplete(question));
  }

  /** Save valid values before closing the form or showing success feedback. */
  async validateSurvey(): Promise<void> {
    if (this.isSaving()) return;
    const endDateInput = document.querySelector<HTMLInputElement>('#survey-end-date');
    if (!endDateInput) return;
    this.checkEndDate(endDateInput);
    this.showValidation = true;
    this.validatedFields = this.getRequiredFields();
    this.publishError.set('');
    if (this.isSurveyComplete()) await this.publishSurvey();
    else this.focusInvalidField();
  }

  /** Add a question without replacing any existing form controls. */
  addNextQuestion(): void {
    if (this.questions.length < this.maxQuestions) {
      this.questions.push(this.createQuestion());
    }
  }

  /** Add a blank field only to the answer list passed by its button. */
  addAnswer(answers: FormControl<string>[]): void {
    if (answers.length < this.answerLetters.length) {
      answers.push(this.createAnswer());
    }
  }

  /** Open or close the category menu and update its arrow. */
  toggleCategoryMenu(): void {
    this.isCategoryMenuOpen = !this.isCategoryMenuOpen;
  }

  /** Save the chosen category and close the menu. */
  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.isCategoryMenuOpen = false;
  }

  /** Clear the survey name when its delete button is clicked. */
  clearSurveyName(): void {
    this.surveyName.setValue('');
  }

  /** Clear only the end date when its delete button is clicked. */
  clearEndDate(): void {
    this.endDate.setValue('');
    this.endDateError = '';
  }

  /** Clear only the description when its delete button is clicked. */
  clearDescription(): void {
    this.description.setValue('');
  }

  /** Clear the first question and its answers; remove added questions completely. */
  removeQuestion(questionIndex: number): void {
    if (this.isSaving()) return;
    if (questionIndex === 0) {
      this.questions[0].text.setValue('');
      this.questions[0].answers.forEach(answer => answer.setValue(''));
      return;
    }
    this.questions = this.questions.filter((_, index) => index !== questionIndex);
    this.discardRemovedFields();
    const nextIndex = Math.min(questionIndex, this.questions.length - 1);
    setTimeout(() => document.getElementById('survey-question-' + nextIndex)?.focus());
  }

  /** Remove extra answer rows; keep A and B available for every question. */
  removeAnswer(questionIndex: number, answerIndex: number): void {
    if (this.isSaving()) return;
    const question = this.questions[questionIndex];
    if (answerIndex < MIN_ANSWERS) {
      question.answers[answerIndex].setValue('');
      return;
    }
    question.answers = question.answers.filter((_, index) => index !== answerIndex);
    this.discardRemovedFields();
    const nextIndex = Math.min(answerIndex, question.answers.length - 1);
    setTimeout(() => document.getElementById('survey-answer-' + questionIndex + '-' + nextIndex)?.focus());
  }

  /** Require text in the question and every currently visible answer row. */
  private isQuestionComplete(question: SurveyQuestionForm): boolean {
    return !this.isFieldInvalid(question.text) && question.answers.every(answer => !this.isFieldInvalid(answer));
  }

  /** Preserve the inputs on failure and show success only after all rows are saved. */
  private async publishSurvey(): Promise<void> {
    this.isSaving.set(true);
    try {
      await this.surveys.createSurvey(this.createSurveyInput());
      this.closed.emit();
      this.publishFeedback.show();
    } catch {
      this.publishError.set('Could not save your survey. Your entries are still here. Please try again.');
    } finally {
      this.isSaving.set(false);
    }
  }

  /** Send only the current form values, trimming required text fields. */
  private createSurveyInput(): NewSurvey {
    return {
      title: this.surveyName.value.trim(),
      description: this.description.value.trim() || null,
      category: this.selectedCategory || null,
      end_date: this.endDate.value || null,
      questions: this.questions.map(question => this.createQuestionInput(question)),
    };
  }

  /** Keep each question's answers and multiple-answer setting together. */
  private createQuestionInput(question: SurveyQuestionForm): NewSurveyQuestion {
    return {
      text: question.text.value.trim(),
      allow_multiple_answers: question.allowMultipleAnswers.value,
      answers: question.answers.map(answer => answer.value.trim()),
    };
  }

  /** Wait for validation messages before focusing the first invalid field. */
  private focusInvalidField(): void {
    setTimeout(() => document.querySelector<HTMLInputElement>('.input-error')?.focus());
  }
}
