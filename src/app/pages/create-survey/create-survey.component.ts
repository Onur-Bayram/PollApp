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

const NOT_NULL_ERROR_CODE: string = '23502';
const TEXT_LENGTH_ERROR_CODE: string = '22001';
const PERMISSION_ERROR_CODE: string = '42501';
const DEFAULT_PUBLISH_ERROR: string = 'Could not save your survey. Your entries are still here. Please try again.';

/** Manage the survey controls, validation and publishing inside the creation dialog. */
@Component({
  selector: 'app-create-survey',
  imports: [SurveyDetailsComponent, SurveyQuestionsComponent],
  templateUrl: './create-survey.component.html',
  styleUrls: ['./create-survey-controls.css', './create-survey.component.css', './create-survey-mobile.css'],
})
export class CreateSurveyComponent implements OnInit, OnDestroy {
  closed = output<void>();
  surveyName = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(SURVEY_NAME_LIMIT)] });
  showValidation: boolean = false;
  /** Remember which required controls have been checked by blur or Publish. */
  private validatedFields: FormControl<string>[] = [];
  isSaving = signal<boolean>(false);
  publishError = signal<string>('');
  endDate = new FormControl('', { nonNullable: true });
  minimumEndDate: string = this.getToday();
  endDateError: string = '';
  description = new FormControl('', { nonNullable: true, validators: Validators.maxLength(DESCRIPTION_LIMIT) });
  maxQuestions: number = MAX_QUESTIONS;
  questionTextLimit: number = QUESTION_TEXT_LIMIT;
  questions: SurveyQuestionForm[] = [this.createQuestion()];
  answerLetters: string[] = ANSWER_LETTERS;
  categories: string[] = [
    'Team Activities',
    'Health & Wellness',
    'Gaming & Entertainment',
    'Education & Learning',
    'Lifestyle & Preferences',
    'Technology & Innovation',
  ];
  isCategoryMenuOpen: boolean = false;
  selectedCategory: string = '';

  /** Receive the services used to save, confirm and navigate from this dialog.
   * @param publishFeedback - Shared confirmation shown after a successful save.
   * @param surveys - Service that saves the survey and its related rows.
   * @param router - Router used to return to Home from the mobile logo. */
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

  /** Keep Tab and Shift+Tab inside the dialog's first and last buttons.
   * @param event - Keyboard event checked for Tab or Shift+Tab.
   * @param first - Desktop Cancel button at the start of the dialog.
   * @param last - Publish button at the end of the dialog.
   * @param home - Mobile Home button, hidden on desktop. */
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

  /** Try the mobile Home button; CSS hides it on desktop.
   * @param button - Home button to focus if it is visible.
   * @returns Whether the button became the active element. */
  private focusHomeButton(button: HTMLButtonElement): boolean {
    button.focus();
    return document.activeElement === button;
  }

  /** Give every new question blank text, independent answers and its own checkbox.
   * @returns Blank question controls with two independent answers and multiple selection disabled. */
  createQuestion(): SurveyQuestionForm {
    return {
      text: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(QUESTION_TEXT_LIMIT)] }),
      answers: [this.createAnswer(), this.createAnswer()],
      allowMultipleAnswers: new FormControl(false, { nonNullable: true }),
    };
  }

  /** Apply the same required rule to initial and newly added answers.
   * @returns A blank, non-nullable answer control with required validation. */
  createAnswer(): FormControl<string> {
    return new FormControl('', { nonNullable: true, validators: Validators.required });
  }

  /** Treat spaces as empty text as well as checking Angular's validators.
   * @param control - Required text control to check.
   * @returns Whether Angular validation fails or the value contains only whitespace. */
  isFieldInvalid(control: FormControl<string>): boolean {
    return control.invalid || !control.value.trim();
  }

  /** Check a required field after blur if it still belongs to the form.
   * @param control - Current required field whose value should be validated. */
  validateField(control: FormControl<string>): void {
    if (!this.getRequiredFields().includes(control)) return;
    if (!this.validatedFields.includes(control)) this.validatedFields.push(control);
  }

  /** Keep untouched new fields quiet until they are checked individually or by Publish.
   * @param control - Required field whose error visibility should be checked.
   * @returns Whether this field has been checked and currently has an invalid value. */
  hasError(control: FormControl<string>): boolean {
    return this.validatedFields.includes(control) && this.isFieldInvalid(control);
  }

  /** Give the question view the current visibility of each question's error.
   * @returns Error visibility flags in the current question order. */
  getQuestionErrors(): boolean[] {
    return this.questions.map(question => this.hasError(question.text));
  }

  /** Keep answer validation in the form while the question view displays its results.
   * @returns Error visibility flags grouped by question and answer order. */
  getAnswerErrors(): boolean[][] {
    return this.questions.map(question => question.answers.map(answer => this.hasError(answer)));
  }

  /** Announce only errors that are currently highlighted in the form.
   * @returns Whether any checked required field or revealed optional field has an error. */
  hasValidationErrors(): boolean {
    return this.validatedFields.some(control => this.isFieldInvalid(control))
      || (this.showValidation && (!!this.endDateError || this.description.invalid));
  }

  /** Collect the required controls that currently belong to the form.
   * @returns The existing name, question and answer controls that still belong to the form. */
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

  /** Format the local date without shifting it to another day in UTC.
   * @returns The local calendar date in YYYY-MM-DD format. */
  private getToday(): string {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    return today.getFullYear() + '-' + (month < 10 ? '0' : '') + month
      + '-' + (day < 10 ? '0' : '') + day;
  }

  /** Allow an empty date, but reject past deadlines before saving a new survey.
   * @param field - Native date input supplying its value and browser validation state. */
  checkEndDate(field: HTMLInputElement): void {
    this.minimumEndDate = this.getToday();
    if (field.value.length === 10 && field.value < this.minimumEndDate) {
      this.endDateError = 'Choose today or a future date.';
    } else {
      this.endDateError = field.validity.valid ? '' : 'Enter a valid date.';
    }
  }

  /** Check the optional date and every required question and answer.
   * @returns Whether all current required fields and the optional date and description are valid. */
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

  /** Add a blank field only to the answer list passed by its button.
   * @param answers - Existing answer controls belonging to the selected question. */
  addAnswer(answers: FormControl<string>[]): void {
    if (answers.length < this.answerLetters.length) {
      answers.push(this.createAnswer());
    }
  }

  /** Open or close the category menu and update its arrow. */
  toggleCategoryMenu(): void {
    this.isCategoryMenuOpen = !this.isCategoryMenuOpen;
  }

  /** Save the chosen category and close the menu.
   * @param category - Category name to include in the new survey. */
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

  /** Remove a question, or clear its fields when it is the only one left.
   * @param questionIndex - Zero-based position of the question to remove or clear. */
  removeQuestion(questionIndex: number): void {
    if (this.isSaving()) return;
    if (this.questions.length === 1) {
      this.questions[0].text.setValue('');
      this.questions[0].answers.forEach(answer => answer.setValue(''));
      return;
    }
    this.questions = this.questions.filter((_, index) => index !== questionIndex);
    this.discardRemovedFields();
    const nextIndex = Math.min(questionIndex, this.questions.length - 1);
    setTimeout(() => document.getElementById('survey-question-' + nextIndex)?.focus());
  }

  /** Remove any answer while preserving at least two fields in its question.
   * @param questionIndex - Zero-based position of the containing question.
   * @param answerIndex - Zero-based position of the answer to remove or clear. */
  removeAnswer(questionIndex: number, answerIndex: number): void {
    if (this.isSaving()) return;
    const question = this.questions[questionIndex];
    if (question.answers.length <= MIN_ANSWERS) {
      question.answers[answerIndex].setValue('');
      return;
    }
    question.answers = question.answers.filter((_, index) => index !== answerIndex);
    this.discardRemovedFields();
    const nextIndex = Math.min(answerIndex, question.answers.length - 1);
    setTimeout(() => document.getElementById('survey-answer-' + questionIndex + '-' + nextIndex)?.focus());
  }

  /** Require text in the question and every currently visible answer row.
   * @param question - Question controls whose text and answers must be checked.
   * @returns Whether the question text and every remaining answer are valid. */
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
    } catch (error) {
      this.reportPublishError(error);
    } finally {
      this.isSaving.set(false);
    }
  }

  /** Preserve the server response for diagnosis and display a readable save error.
   * @param error - Error returned while saving the survey, questions or answers. */
  private reportPublishError(error: unknown): void {
    console.error('Survey publishing failed:', error);
    this.publishError.set(this.getPublishErrorMessage(error));
  }

  /** Describe network failures and database rejections without exposing internal details.
   * @param error - Save failure whose code and message may identify the cause.
   * @returns A readable failure message that confirms the user's entries are preserved. */
  private getPublishErrorMessage(error: unknown): string {
    if (this.isNetworkError(error)) return 'Could not reach the server. Check your internet connection or VPN/proxy and try again. Your entries are still here.';
    if (typeof error !== 'object' || error === null || !('code' in error)) return DEFAULT_PUBLISH_ERROR;
    if (error.code === NOT_NULL_ERROR_CODE && 'message' in error && typeof error.message === 'string') {
      if (error.message.includes('"end_date"')) return 'Saving without an end date is currently unavailable. Your entries are still here.';
      return 'The server rejected a missing value. Your entries are still here. Please try again later.';
    }
    if (error.code === TEXT_LENGTH_ERROR_CODE) {
      return 'One of your entries is longer than the server allows. Shorten the text and try again. Your entries are still here.';
    }
    if (error.code === PERMISSION_ERROR_CODE) return 'Publishing is currently unavailable. Your entries are still here. Please try again later.';
    return DEFAULT_PUBLISH_ERROR;
  }

  /** Recognize connection failures that arrive without a database error code.
   * @param error - Failure returned by the browser or the Supabase client.
   * @returns Whether the message identifies a failed network request without a database error code. */
  private isNetworkError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('message' in error) || typeof error.message !== 'string') return false;
    if ('code' in error && error.code) return false;
    return error.message.includes('Failed to fetch') || error.message.includes('fetch failed')
      || error.message.includes('NetworkError when attempting to fetch resource') || error.message.includes('Load failed');
  }

  /** Send only the current form values, trimming required text fields.
   * @returns Current survey data with trimmed text and null for empty optional fields. */
  private createSurveyInput(): NewSurvey {
    return {
      title: this.surveyName.value.trim(),
      description: this.description.value.trim() || null,
      category: this.selectedCategory || null,
      end_date: this.endDate.value || null,
      questions: this.questions.map(question => this.createQuestionInput(question)),
    };
  }

  /** Keep each question's answers and multiple-answer setting together.
   * @param question - Original form controls for one question and its answers.
   * @returns Question data with trimmed text, trimmed answers and the current multiple-answer setting. */
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
