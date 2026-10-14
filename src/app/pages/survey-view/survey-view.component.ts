import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CreateSurveyComponent } from '../create-survey/create-survey.component';

// Connect the survey detail view to its separate template and styles.
@Component({
  selector: 'app-survey-view',
  imports: [RouterLink, CreateSurveyComponent],
  templateUrl: './survey-view.component.html',
  styleUrl: './survey-view.component.css',
})
export class SurveyViewComponent {
  // Show the existing creation overlay above the survey details.
  isCreateSurveyOpen = false;

  // Keep the first question's example answers in their Figma order.
  firstQuestionAnswers = [
    { letter: 'A.', text: '19.09.2025, Friday' },
    { letter: 'B.', text: '10.10.2025, Friday' },
    { letter: 'C.', text: '11.10.2025, Saturday' },
    { letter: 'D.', text: '31.10.2025, Friday' },
  ];

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

  // Restore focus after the survey page becomes interactive again.
  closeCreateSurvey(button: HTMLButtonElement): void {
    this.isCreateSurveyOpen = false;
    setTimeout(() => button.focus());
  }
}
