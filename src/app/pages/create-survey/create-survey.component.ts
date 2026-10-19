import { Component, OnDestroy, OnInit, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { NewSurvey, NewSurveyQuestion } from '../../models/survey';
import { SurveyQuestionForm } from '../../models/survey-form';
import { ANSWER_LETTERS, DESCRIPTION_LIMIT, MAX_QUESTIONS, MIN_ANSWERS, SURVEY_NAME_LIMIT } from '../../models/survey-constants';
import { PublishFeedbackService } from '../../services/publish-feedback.service';
import { SurveyService } from '../../services/survey.service';
import { SurveyCategoryComponent } from './survey-category/survey-category.component';

// Connect the creation overlay to its separate template and styles.
@Component({
  selector: 'app-create-survey',
  imports: [ReactiveFormsModule, SurveyCategoryComponent],
  templateUrl: './create-survey.component.html',
  styleUrls: ['./create-survey.component.css', './create-survey-fields.css', './create-survey-mobile.css'],
})
export class CreateSurveyComponent implements OnInit, OnDestroy {
  // Let the parent page know when this overlay should close.
  closed = output<void>();

  // Require a survey name within the existing 60-character limit.
  surveyName = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(SURVEY_NAME_LIMIT)] });

  // Reveal validation messages only after Publish has been clicked.
  showValidation: boolean = false;

  // Prevent repeated submissions and keep failures visible inside the form.
  isSaving = signal<boolean>(false);
  publishError = signal<string>('');

  // Connect the optional end date input to a separate form control.
  endDate = new FormControl('', { nonNullable: true });

  // Keep new surveys open at least until the end of the current local day.
  minimumEndDate = this.getToday();
  endDateError: string = '';

  // Connect the optional description to its own form control.
  description = new FormControl('', { nonNullable: true, validators: Validators.maxLength(DESCRIPTION_LIMIT) });

  // Allow up to six questions and start with only one question.
  maxQuestions: number = MAX_QUESTIONS;
  questions: SurveyQuestionForm[] = [this.createQuestion()];

  // Label up to six answers per question as shown in the design.
  answerLetters: string[] = ANSWER_LETTERS;

  // Use the same topic categories as the home page.
  categories = [
    'Team Activities',
    'Health & Wellness',
    'Gaming & Entertainment',
    'Education & Learning',
    'Lifestyle & Preferences',
    'Technology & Innovation',
  ];

  // Track whether the category menu is open.
  isCategoryMenuOpen: boolean = false;

  // Store the category shown below the button.
  selectedCategory: string = '';

  /** Save the form and share its confirmation with the outer component. */
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

  /** Give every new question its own text, answers and checkbox. */
  createQuestion(): SurveyQuestionForm {
    return {
      text: new FormControl('Choose the activities you prefer', { nonNullable: true, validators: Validators.required }),
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

  /** Keep field errors hidden until the first validation attempt. */
  hasError(control: FormControl<string>): boolean {
    return this.showValidation && this.isFieldInvalid(control);
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
  async validateSurvey(endDateInput: HTMLInputElement): Promise<void> {
    if (this.isSaving()) return;
    this.checkEndDate(endDateInput);
    this.showValidation = true;
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
      const surveyId = await this.surveys.createSurvey(this.createSurveyInput());
      this.closed.emit();
      this.publishFeedback.show(surveyId);
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
