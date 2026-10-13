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

  // Give every new question its own text, answers and checkbox.
  createQuestion() {
    return {
      text: new FormControl('Choose the activities you prefer'),
      answers: [new FormControl(''), new FormControl('')],
      allowMultipleAnswers: new FormControl(false),
    };
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
      answers.push(new FormControl(''));
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
