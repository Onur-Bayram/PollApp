import { Component } from '@angular/core';

// Connect the home page template and styles to this Angular component.
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
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
