import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { SurveyService } from '../../services/survey.service';
import { CreateSurveyComponent } from '../create-survey/create-survey.component';

// Keep the existing chart sizes separate from the stored survey data.
interface ResultQuestion {
  number: number;
  text: string;
  votingText?: string;
  showHint: boolean;
  headingHeight: number;
  chartHeight: number;
  answers: {
    letter: string;
    text: string;
    multiline?: boolean;
    fillWidth: number;
    percentage: number;
  }[];
}

// Connect the survey detail view to its separate template and styles.
@Component({
  selector: 'app-survey-view',
  imports: [DatePipe, RouterLink, CreateSurveyComponent],
  templateUrl: './survey-view.component.html',
  styleUrl: './survey-view.component.css',
})
export class SurveyViewComponent implements OnInit, OnDestroy {
  // Show the existing creation overlay above the survey details.
  isCreateSurveyOpen = false;

  // Keep the first question's answers and screenshot results together.
  private firstQuestionAnswers = [
    { letter: 'A.', text: '19.09.2025, Friday', fillWidth: 97, percentage: 27 },
    { letter: 'B.', text: '10.10.2025, Friday', fillWidth: 130, percentage: 44 },
    { letter: 'C.', text: '11.10.2025, Saturday', fillWidth: 9, percentage: 3 },
    { letter: 'D.', text: '31.10.2025, Friday', fillWidth: 93, percentage: 26 },
  ];

  // Share the second question's answers between voting and example results.
  private secondQuestionAnswers = [
    { letter: 'A.', text: 'Outdoor adventure like kayaking', multiline: true, fillWidth: 163, percentage: 60 },
    { letter: 'B.', text: 'Office Costume Party', multiline: false, fillWidth: 0, percentage: 0 },
    { letter: 'C.', text: 'Bowling, mini-golf, volleyball', multiline: false, fillWidth: 46, percentage: 14 },
    { letter: 'D.', text: 'Beach party, Music & cocktails', multiline: true, fillWidth: 93, percentage: 26 },
    { letter: 'E.', text: 'Escape room', multiline: false, fillWidth: 0, percentage: 0 },
  ];

  // Share the third question's answers and example results in the same way.
  private thirdQuestionAnswers = [
    { letter: 'A.', text: 'Team bonding', multiline: false, fillWidth: 130, percentage: 44 },
    { letter: 'B.', text: 'Food and drinks', multiline: false, fillWidth: 9, percentage: 3 },
    { letter: 'C.', text: 'Trying something new', multiline: false, fillWidth: 93, percentage: 26 },
    { letter: 'D.', text: 'Keeping it low-key and stress-free', multiline: true, fillWidth: 97, percentage: 27 },
  ];

  // Share the final question's answers and example results.
  private fourthQuestionAnswers = [
    { letter: 'A.', text: 'Half a day', multiline: false, fillWidth: 46, percentage: 14 },
    { letter: 'B.', text: 'Full day', multiline: false, fillWidth: 214, percentage: 86 },
    { letter: 'C.', text: 'Evening only', multiline: false, fillWidth: 0, percentage: 0 },
  ];

  // Reuse one results layout with the supplied sizes for each question.
  private previewQuestions: ResultQuestion[] = [
    {
      number: 1,
      text: 'Which date would work best for you?',
      showHint: true,
      headingHeight: 46,
      chartHeight: 105,
      answers: this.firstQuestionAnswers,
    },
    {
      number: 2,
      text: 'Choose the activities you prefer?',
      votingText: 'Choose the activities you prefer.',
      showHint: true,
      headingHeight: 23,
      chartHeight: 134,
      answers: this.secondQuestionAnswers,
    },
    {
      number: 3,
      text: 'What’s most important to you in a team event?',
      showHint: false,
      headingHeight: 46,
      chartHeight: 97,
      answers: this.thirdQuestionAnswers,
    },
    {
      number: 4,
      text: 'How long would you prefer the event to last?',
      showHint: false,
      headingHeight: 46,
      chartHeight: 74,
      answers: this.fourthQuestionAnswers,
    },
  ];

  // Load real fields for an ID route; use the Figma example only at /survey.
  isPreview = false;
  isLoading = signal(false);
  loadError = signal('');
  surveyTitle = '';
  description: string | null = null;
  endDate: string | null = null;
  category: string | null = null;
  resultQuestions: ResultQuestion[] = [];
  questionRows: ResultQuestion[][] = [];
  private routeSubscription?: Subscription;
  private loadRequest = 0;

  constructor(private route: ActivatedRoute, private surveys: SurveyService) {}

  // Start at the heading when a card is opened from further down the home page.
  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.routeSubscription = this.route.paramMap.subscribe(() => this.loadSurvey());
  }

  // Ignore an older request when the URL changes or the page is left.
  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.loadRequest++;
  }

  async loadSurvey(): Promise<void> {
    const request = ++this.loadRequest;
    const id = this.route.snapshot.paramMap.get('id');
    this.isPreview = id === null;
    this.loadError.set('');
    this.resultQuestions = [];
    this.questionRows = [];

    if (this.isPreview) {
      this.isLoading.set(false);
      this.surveyTitle = 'Let’s Plan the Next Team Event Together';
      this.description = 'We want to create team activities that everyone will enjoy – share your preferences and ideas in our survey to help us plan better experiences together.';
      this.endDate = '2025-09-01';
      this.category = 'Team activities';
      this.resultQuestions = this.previewQuestions;
      this.groupQuestions();
      return;
    }

    const surveyId = Number(id);
    if (!Number.isSafeInteger(surveyId) || surveyId < 1) {
      this.isLoading.set(false);
      this.loadError.set('This survey is not available.');
      return;
    }

    this.isLoading.set(true);
    try {
      const survey = await this.surveys.getSurvey(surveyId);
      if (request !== this.loadRequest) {
        return;
      }
      if (!survey) {
        this.loadError.set('This survey is not available.');
        return;
      }
      this.surveyTitle = survey.title;
      this.description = survey.description;
      this.category = survey.category;
      this.endDate = survey.end_date;
      // New surveys start without the Team Activities example percentages.
      const letters = ['A.', 'B.', 'C.', 'D.', 'E.', 'F.'];
      this.resultQuestions = survey.questions.map((question, index) => ({
        number: index + 1,
        text: question.text,
        showHint: question.allow_multiple_answers,
        headingHeight: 46,
        chartHeight: (question.answers.length - 1) * 30 + 14,
        answers: question.answers.map((answer, answerIndex) => ({
          letter: letters[answerIndex],
          text: answer.text,
          fillWidth: 0,
          percentage: 0,
        })),
      }));
      this.groupQuestions();
    } catch {
      if (request === this.loadRequest) {
        this.loadError.set('Could not load this survey. Please try again.');
      }
    } finally {
      if (request === this.loadRequest) {
        this.isLoading.set(false);
      }
    }
  }

  // Keep two questions per row, including surveys with up to six questions.
  private groupQuestions(): void {
    for (let index = 0; index < this.resultQuestions.length; index += 2) {
      this.questionRows.push(this.resultQuestions.slice(index, index + 2));
    }
  }

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
