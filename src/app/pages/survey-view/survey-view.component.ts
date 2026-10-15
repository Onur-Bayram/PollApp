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

  // Keep the first question's answers and screenshot results together.
  firstQuestionAnswers = [
    { letter: 'A.', text: '19.09.2025, Friday', fillWidth: 97, percentage: 27 },
    { letter: 'B.', text: '10.10.2025, Friday', fillWidth: 130, percentage: 44 },
    { letter: 'C.', text: '11.10.2025, Saturday', fillWidth: 9, percentage: 3 },
    { letter: 'D.', text: '31.10.2025, Friday', fillWidth: 93, percentage: 26 },
  ];

  // Share the second question's answers between voting and example results.
  secondQuestionAnswers = [
    { letter: 'A.', text: 'Outdoor adventure like kayaking', multiline: true, fillWidth: 163, percentage: 60 },
    { letter: 'B.', text: 'Office Costume Party', multiline: false, fillWidth: 0, percentage: 0 },
    { letter: 'C.', text: 'Bowling, mini-golf, volleyball', multiline: false, fillWidth: 46, percentage: 14 },
    { letter: 'D.', text: 'Beach party, Music & cocktails', multiline: true, fillWidth: 93, percentage: 26 },
    { letter: 'E.', text: 'Escape room', multiline: false, fillWidth: 0, percentage: 0 },
  ];

  // Share the third question's answers and example results in the same way.
  thirdQuestionAnswers = [
    { letter: 'A.', text: 'Team bonding', multiline: false, fillWidth: 130, percentage: 44 },
    { letter: 'B.', text: 'Food and drinks', multiline: false, fillWidth: 9, percentage: 3 },
    { letter: 'C.', text: 'Trying something new', multiline: false, fillWidth: 93, percentage: 26 },
    { letter: 'D.', text: 'Keeping it low-key and stress-free', multiline: true, fillWidth: 97, percentage: 27 },
  ];

  // Reuse one results layout with the supplied sizes for each question.
  resultQuestions = [
    {
      number: 1,
      text: 'Which date would work best for you?',
      headingHeight: 46,
      chartHeight: 105,
      answers: this.firstQuestionAnswers,
    },
    {
      number: 2,
      text: 'Choose the activities you prefer?',
      headingHeight: 23,
      chartHeight: 134,
      answers: this.secondQuestionAnswers,
    },
    {
      number: 3,
      text: 'What’s most important to you in a team event?',
      headingHeight: 46,
      chartHeight: 97,
      answers: this.thirdQuestionAnswers,
    },
  ];

  // Keep the lower questions and their example answers in screenshot order.
  additionalQuestions = [
    {
      number: 3,
      text: 'What’s most important to you in a team event?',
      answers: this.thirdQuestionAnswers,
    },
    {
      number: 4,
      text: 'How long would you prefer the event to last?',
      answers: [
        { letter: 'A.', text: 'Half a day', multiline: false },
        { letter: 'B.', text: 'Full day', multiline: false },
        { letter: 'C.', text: 'Evening only', multiline: false },
      ],
    },
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
