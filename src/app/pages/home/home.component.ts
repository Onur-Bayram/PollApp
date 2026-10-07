import { Component } from '@angular/core';

// Connect the home page template and styles to this Angular component.
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  // Store which survey status button is currently selected.
  selectedSurveyStatus = 'active';

  // Select a button, or clear the selection when it is clicked again.
  toggleSurveyStatus(status: string) {
    if (this.selectedSurveyStatus === status) {
      this.selectedSurveyStatus = '';
    } else {
      this.selectedSurveyStatus = status;
    }
  }
}
