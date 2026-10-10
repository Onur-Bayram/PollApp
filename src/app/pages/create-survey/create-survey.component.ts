import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

// Connect the create survey page to its separate template and styles.
@Component({
  selector: 'app-create-survey',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './create-survey.component.html',
  styleUrl: './create-survey.component.css',
})
export class CreateSurveyComponent {
  // Connect the survey name input to a form control.
  surveyName = new FormControl('');

  // Connect the optional end date input to a separate form control.
  endDate = new FormControl('');

  // Connect the optional description to its own form control.
  description = new FormControl('');

  // Connect the question input to a separate form control.
  question = new FormControl('');

  // Keep the second question separate from the first question.
  secondQuestion = new FormControl('');

  // Connect answer A for the first question to its own form control.
  answerA = new FormControl('');

  // Keep answer B separate from answer A for the first question.
  answerB = new FormControl('');

  // Connect each answer for the second question to its own form control.
  secondAnswerA = new FormControl('');
  secondAnswerB = new FormControl('');

  // Track whether the first question allows multiple answers.
  allowMultipleAnswers = new FormControl(false);

  // Track the multiple answers option for the second question separately.
  secondAllowMultipleAnswers = new FormControl(false);

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
  }

  // Clear only the description when its delete button is clicked.
  clearDescription(): void {
    this.description.setValue('');
  }

  // Clear only the question when its delete button is clicked.
  clearQuestion(): void {
    this.question.setValue('');
  }

  // Clear only the second question when its delete button is clicked.
  clearSecondQuestion(): void {
    this.secondQuestion.setValue('');
  }

  // Clear only answer A for the first question.
  clearAnswerA(): void {
    this.answerA.setValue('');
  }

  // Clear only answer B for the first question.
  clearAnswerB(): void {
    this.answerB.setValue('');
  }

  // Clear only answer A for the second question.
  clearSecondAnswerA(): void {
    this.secondAnswerA.setValue('');
  }

  // Clear only answer B for the second question.
  clearSecondAnswerB(): void {
    this.secondAnswerB.setValue('');
  }
}
