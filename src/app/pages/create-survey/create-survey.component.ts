import { Component, OnDestroy, OnInit, output } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

// Connect the creation overlay to its separate template and styles.
@Component({
  selector: 'app-create-survey',
  imports: [ReactiveFormsModule],
  templateUrl: './create-survey.component.html',
  styleUrl: './create-survey.component.css',
})
export class CreateSurveyComponent implements OnInit, OnDestroy {
  // Let the home page know when this overlay should close.
  closed = output<void>();

  // Require a survey name within the existing 60-character limit.
  surveyName = new FormControl('', [Validators.required, Validators.maxLength(60)]);

  // Reveal validation messages only after Publish has been clicked.
  showValidation = false;

  // Connect the optional end date input to a separate form control.
  endDate = new FormControl('');

  // Track incomplete dates and dates rejected by the browser.
  isEndDateInvalid = false;

  // Connect the optional description to its own form control.
  description = new FormControl('');

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

  // Use Angular's router to open the survey detail page.
  constructor(private router: Router) {}

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
    this.closed.emit();
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

  // Let the native date input check the calendar date; an empty value is allowed.
  checkEndDate(field: HTMLInputElement): void {
    this.isEndDateInvalid = !field.validity.valid;
  }

  // Check the optional date and every required question and answer.
  isSurveyComplete(): boolean {
    if (this.isEndDateInvalid || this.isFieldInvalid(this.surveyName)) {
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

  // Open the survey page only when every required field is complete.
  validateSurvey(endDateInput: HTMLInputElement): void {
    this.checkEndDate(endDateInput);
    this.showValidation = true;

    if (this.isSurveyComplete()) {
      this.router.navigate(['/survey']).then(() => {
        window.scrollTo(0, 0);
      });
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
    this.isEndDateInvalid = false;
  }

  // Clear only the description when its delete button is clicked.
  clearDescription(): void {
    this.description.setValue('');
  }

  // Clear only the text of the question passed by its delete button.
  clearQuestion(question: FormControl): void {
    question.setValue('');
  }

  // Clear only the answer belonging to the clicked delete button.
  clearAnswer(answer: FormControl): void {
    answer.setValue('');
  }
}
