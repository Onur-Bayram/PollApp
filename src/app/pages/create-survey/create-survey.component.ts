import { Component, OnDestroy, OnInit, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { PublishFeedbackService } from '../../services/publish-feedback.service';
import { SurveyService } from '../../services/survey.service';

// Connect the creation overlay to its separate template and styles.
@Component({
  selector: 'app-create-survey',
  imports: [ReactiveFormsModule],
  templateUrl: './create-survey.component.html',
  styleUrls: ['./create-survey.component.css', './create-survey-fields.css'],
})
export class CreateSurveyComponent implements OnInit, OnDestroy {
  // Let the parent page know when this overlay should close.
  closed = output<void>();

  // Require a survey name within the existing 60-character limit.
  surveyName = new FormControl('', [Validators.required, Validators.maxLength(60)]);

  // Reveal validation messages only after Publish has been clicked.
  showValidation = false;

  // Prevent repeated submissions and keep failures visible inside the form.
  isSaving = signal(false);
  publishError = signal('');

  // Connect the optional end date input to a separate form control.
  endDate = new FormControl('');

  // Keep new surveys open at least until the end of the current local day.
  minimumEndDate = this.getToday();
  endDateError = '';

  // Connect the optional description to its own form control.
  description = new FormControl('', Validators.maxLength(300));

  // Allow up to six questions and start with only one question.
  maxQuestions = 6;
  questions = [this.createQuestion()];

  // Label up to six answers per question as shown in the design.
  answerLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

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
  isCategoryMenuOpen = false;

  // Store the category shown below the button.
  selectedCategory = '';

  // Save the form and share its confirmation with the outer component.
  constructor(
    private publishFeedback: PublishFeedbackService,
    private surveys: SurveyService,
  ) {}

  // Lock background scrolling while this overlay is on screen.
  ngOnInit(): void {
    document.body.style.overflow = 'hidden';
  }

  // Restore page scrolling when the overlay is removed.
  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  // Close the overlay without navigating to another page.
  close(): void {
    if (!this.isSaving()) {
      this.closed.emit();
    }
  }

  // Keep Tab and Shift+Tab inside the dialog's first and last buttons.
  keepFocusInside(event: KeyboardEvent, first: HTMLButtonElement, last: HTMLButtonElement): void {
    if (event.key !== 'Tab') {
      return;
    }

    if (event.target === event.currentTarget) {
      event.preventDefault();
      if (event.shiftKey) {
        last.focus();
      } else {
        first.focus();
      }
    } else if (event.shiftKey && event.target === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && event.target === last) {
      event.preventDefault();
      first.focus();
    }
  }

  // Give every new question its own text, answers and checkbox.
  createQuestion() {
    return {
      text: new FormControl('Choose the activities you prefer', Validators.required),
      answers: [this.createAnswer(), this.createAnswer()],
      allowMultipleAnswers: new FormControl(false),
    };
  }

  // Apply the same required rule to initial and newly added answers.
  createAnswer(): FormControl {
    return new FormControl('', Validators.required);
  }

  // Treat spaces as empty text as well as checking Angular's validators.
  isFieldInvalid(control: FormControl): boolean {
    return control.invalid || !control.value?.trim();
  }

  // Keep field errors hidden until the first validation attempt.
  hasError(control: FormControl): boolean {
    return this.showValidation && this.isFieldInvalid(control);
  }

  // Format the local date without shifting it to another day in UTC.
  private getToday(): string {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    return today.getFullYear() + '-' + (month < 10 ? '0' : '') + month
      + '-' + (day < 10 ? '0' : '') + day;
  }

  // Allow an empty date, but reject past deadlines before saving a new survey.
  checkEndDate(field: HTMLInputElement): void {
    this.minimumEndDate = this.getToday();
    if (field.value.length === 10 && field.value < this.minimumEndDate) {
      this.endDateError = 'Choose today or a future date.';
    } else {
      this.endDateError = field.validity.valid ? '' : 'Enter a valid date.';
    }
  }

  // Check the optional date and every required question and answer.
  isSurveyComplete(): boolean {
    if (this.endDateError || this.description.invalid || this.isFieldInvalid(this.surveyName)) {
      return false;
    }

    for (const question of this.questions) {
      if (this.isFieldInvalid(question.text)) {
        return false;
      }
      for (const answer of question.answers) {
        if (this.isFieldInvalid(answer)) {
          return false;
        }
      }
    }
    return true;
  }

  // Save valid values before closing the form or showing success feedback.
  async validateSurvey(endDateInput: HTMLInputElement): Promise<void> {
    if (this.isSaving()) {
      return;
    }
    this.checkEndDate(endDateInput);
    this.showValidation = true;
    this.publishError.set('');

    if (this.isSurveyComplete()) {
      this.isSaving.set(true);
      try {
        const surveyId = await this.surveys.createSurvey({
          title: this.surveyName.value!.trim(),
          description: this.description.value?.trim() || null,
          category: this.selectedCategory || null,
          end_date: this.endDate.value || null,
          questions: this.questions.map((question) => ({
            text: question.text.value!.trim(),
            allow_multiple_answers: question.allowMultipleAnswers.value === true,
            answers: question.answers.map((answer) => answer.value.trim()),
          })),
        });
        this.closed.emit();
        this.publishFeedback.show(surveyId);
      } catch {
        this.publishError.set('Could not save your survey. Your entries are still here. Please try again.');
      } finally {
        this.isSaving.set(false);
      }
      return;
    }

    // Keep the form open and focus the first error after the messages render.
    setTimeout(() => {
      const field = document.querySelector<HTMLInputElement>('.input-error');
      if (field) {
        field.focus();
      }
    });
  }

  // Add a question without replacing any existing form controls.
  addNextQuestion(): void {
    if (this.questions.length < this.maxQuestions) {
      this.questions.push(this.createQuestion());
    }
  }

  // Add a blank field only to the answer list passed by its button.
  addAnswer(answers: FormControl[]): void {
    if (answers.length < this.answerLetters.length) {
      answers.push(this.createAnswer());
    }
  }

  // Open or close the category menu and update its arrow.
  toggleCategoryMenu(): void {
    this.isCategoryMenuOpen = !this.isCategoryMenuOpen;
  }

  // Save the chosen category and close the menu.
  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.isCategoryMenuOpen = false;
  }

  // Clear the survey name when its delete button is clicked.
  clearSurveyName(): void {
    this.surveyName.setValue('');
  }

  // Clear only the end date when its delete button is clicked.
  clearEndDate(): void {
    this.endDate.setValue('');
    this.endDateError = '';
  }

  // Clear only the description when its delete button is clicked.
  clearDescription(): void {
    this.description.setValue('');
  }

  // Clear the first question and its answers; remove added questions completely.
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

  // Remove extra answer rows; keep A and B available for every question.
  removeAnswer(questionIndex: number, answerIndex: number): void {
    if (this.isSaving()) return;
    const question = this.questions[questionIndex];
    if (answerIndex < 2) {
      question.answers[answerIndex].setValue('');
      return;
    }
    question.answers = question.answers.filter((_, index) => index !== answerIndex);
    const nextIndex = Math.min(answerIndex, question.answers.length - 1);
    setTimeout(() => document.getElementById('survey-answer-' + questionIndex + '-' + nextIndex)?.focus());
  }
}
