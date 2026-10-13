import { Component } from '@angular/core';
import { CreateSurveyComponent } from '../create-survey/create-survey.component';

// Connect the home page template and styles to this Angular component.
@Component({
  selector: 'app-home',
  imports: [CreateSurveyComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  // Show the creation overlay without leaving the home page.
  isCreateSurveyOpen = false;

  // Keep the six example cards in the order shown in the design.
  surveyCards = [
    {
      category: 'Team activities',
      title: 'Let’s Plan the Next Team Event Together',
      deadline: 'Ends in 1 Day',
    },
    {
      category: 'Gaming',
      title: 'Gaming habits and favorite games!',
      deadline: 'Ends in 3 Day',
    },
    {
      category: 'Gaming',
      title: 'Gaming habits and favorite games!',
      deadline: 'Ends in 3 Day',
    },
    {
      category: 'Healthy Lifestyle',
      title: 'Healthier future: Fit & wellness survey!',
      deadline: 'Ends in 2 Day',
    },
    {
      category: 'Healthy Lifestyle',
      title: 'Healthier future: Fit & wellness survey!',
      deadline: 'Ends in 2 Day',
    },
    {
      category: 'Team activities',
      title: 'Let’s Plan the Next Team Event Together',
      deadline: 'Ends in 1 Day',
    },
  ];

  // Store which survey status button is currently selected.
  selectedSurveyStatus = 'active';

  // Track whether the category menu is open.
  isSortMenuOpen = false;

  // Store the category shown below the button and highlighted in the menu.
  selectedCategory = '';

  // Focus the name field after Angular has created the overlay.
  openCreateSurvey(): void {
    this.isCreateSurveyOpen = true;
    setTimeout(() => {
      const nameInput = document.getElementById('survey-name');
      if (nameInput) {
        nameInput.focus();
      }
    });
  }

  // Restore focus after the home page becomes interactive again.
  closeCreateSurvey(button: HTMLButtonElement): void {
    this.isCreateSurveyOpen = false;
    setTimeout(() => button.focus());
  }

  // Select a button, or clear the selection when it is clicked again.
  toggleSurveyStatus(status: string) {
    if (this.selectedSurveyStatus === status) {
      this.selectedSurveyStatus = '';
    } else {
      this.selectedSurveyStatus = status;
    }
  }

  // Open or close the category menu and update its arrow.
  toggleSortMenu() {
    this.isSortMenuOpen = !this.isSortMenuOpen;
  }

  // Save the clicked category and close the menu.
  selectCategory(category: string) {
    this.selectedCategory = category;
    this.isSortMenuOpen = false;
  }
}
