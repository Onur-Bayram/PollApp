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

  // Clear the survey name when its delete button is clicked.
  clearSurveyName(): void {
    this.surveyName.setValue('');
  }
}
