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
}
