import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Connect the create survey page to its separate template and styles.
@Component({
  selector: 'app-create-survey',
  imports: [RouterLink],
  templateUrl: './create-survey.component.html',
  styleUrl: './create-survey.component.css',
})
export class CreateSurveyComponent {}
