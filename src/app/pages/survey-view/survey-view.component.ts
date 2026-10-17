import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Subscription } from 'rxjs';
import { AnswerVoteCount } from '../../models/survey';
import { SurveyService } from '../../services/survey.service';
import { CreateSurveyComponent } from '../create-survey/create-survey.component';

// Keep the existing chart sizes separate from the stored survey data.
interface ResultQuestion {
  number: number;
  text: string;
  votingText?: string;
  allowMultipleAnswers: boolean;
  headingHeight: number;
  chartHeight: number;
  answers: {
    id?: number;
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
  imports: [DatePipe, RouterLink, ReactiveFormsModule, CreateSurveyComponent],
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
      allowMultipleAnswers: true,
      headingHeight: 46,
      chartHeight: 105,
      answers: this.firstQuestionAnswers,
    },
    {
      number: 2,
      text: 'Choose the activities you prefer?',
      votingText: 'Choose the activities you prefer.',
      allowMultipleAnswers: true,
      headingHeight: 23,
      chartHeight: 134,
      answers: this.secondQuestionAnswers,
    },
    {
      number: 3,
      text: 'What’s most important to you in a team event?',
      allowMultipleAnswers: false,
      headingHeight: 46,
      chartHeight: 97,
      answers: this.thirdQuestionAnswers,
    },
    {
      number: 4,
      text: 'How long would you prefer the event to last?',
      allowMultipleAnswers: false,
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
  // Bind each answer's check mark to its own form control.
  answerControls: FormControl<boolean>[][] = [];
  // Show success only after the selected answers have been saved.
  isSubmitting = signal(false);
  voteSaved = signal(false);
  voteError = signal('');
  showVoteValidation = false;
  isLoadingResults = signal(false);
  resultsLoaded = signal(false);
  resultsError = signal('');
  hasVotes = signal(false);
  liveStatus = signal('');
  private voteCounts: AnswerVoteCount[] = [];
  private routeSubscription?: Subscription;
  private voteChannel?: RealtimeChannel;
  private resultsTimer?: ReturnType<typeof setTimeout>;
  private loadRequest = 0;
  private resultsRequest = 0;

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
    this.stopWatchingResults();
  }

  async loadSurvey(): Promise<void> {
    const request = ++this.loadRequest;
    this.stopWatchingResults();
    const id = this.route.snapshot.paramMap.get('id');
    this.isPreview = id === null;
    this.loadError.set('');
    this.resultQuestions = [];
    this.questionRows = [];
    this.answerControls = [];
    this.voteCounts = [];
    this.isSubmitting.set(false);
    this.voteSaved.set(false);
    this.voteError.set('');
    this.showVoteValidation = false;
    this.resultsLoaded.set(false);
    this.isLoadingResults.set(false);
    this.resultsError.set('');
    this.hasVotes.set(false);
    this.liveStatus.set('');

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
        allowMultipleAnswers: question.allow_multiple_answers,
        headingHeight: 46,
        chartHeight: (question.answers.length - 1) * 30 + 14,
        answers: question.answers.map((answer, answerIndex) => ({
          id: answer.id,
          letter: letters[answerIndex],
          text: answer.text,
          fillWidth: 0,
          percentage: 0,
        })),
      }));
      this.groupQuestions();
      this.watchResults();
      this.loadResults();
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

  // Allow voting until the end of the stored deadline's final day.
  isSurveyClosed(): boolean {
    return !this.isPreview && this.endDate !== null
      && new Date(this.endDate + 'T23:59:59.999').getTime() < Date.now();
  }

  // Keep one checked answer unless the creator enabled multiple answers.
  selectAnswer(question: ResultQuestion, answerIndex: number, checked: boolean): void {
    const controls = this.answerControls[question.number - 1];
    if (this.isSurveyClosed()) {
      controls[answerIndex].setValue(!checked);
      this.answerControls.forEach(questionControls => questionControls.forEach(control => control.disable()));
      this.updateResults();
      return;
    }
    if (checked && !question.allowMultipleAnswers) {
      controls.forEach((control, index) => {
        if (index !== answerIndex) {
          control.setValue(false);
        }
      });
    }
    this.updateResults();
  }

  // Mark results that include the current selection before it is submitted.
  hasPendingVote(): boolean {
    return !this.isPreview && !this.voteSaved() && !this.isSurveyClosed()
      && this.answerControls.some(controls => controls.some(control => control.value));
  }

  // Require at least one selected answer for every question before saving.
  needsAnswer(question: ResultQuestion): boolean {
    return this.showVoteValidation
      && !this.answerControls[question.number - 1].some(control => control.value);
  }

  async submitVote(): Promise<void> {
    if (this.isPreview || this.isSubmitting() || this.voteSaved()) {
      return;
    }
    this.voteError.set('');
    this.showVoteValidation = true;
    if (this.isSurveyClosed()) {
      this.setAnswersDisabled(true);
      this.updateResults();
      return;
    }
    if (this.resultQuestions.some(question => this.needsAnswer(question))) {
      return;
    }

    const selectedIds: number[] = [];
    for (const question of this.resultQuestions) {
      question.answers.forEach((answer, index) => {
        if (this.answerControls[question.number - 1][index].value && answer.id !== undefined) {
          selectedIds.push(answer.id);
        }
      });
    }
    const request = this.loadRequest;
    this.isSubmitting.set(true);
    this.setAnswersDisabled(true);
    try {
      await this.surveys.saveVote(selectedIds);
      if (request !== this.loadRequest) {
        return;
      }
      this.voteSaved.set(true);
      this.showVoteValidation = false;
      await this.loadResults();
    } catch {
      if (request === this.loadRequest) {
        this.voteError.set('Could not save your vote. Please try again.');
      }
    } finally {
      if (request === this.loadRequest) {
        this.isSubmitting.set(false);
        this.setAnswersDisabled(this.voteSaved() || this.isSurveyClosed());
      }
    }
  }

  // Start another explicit submission without counting the previous vote twice.
  voteAgain(): void {
    if (this.isSubmitting() || this.isSurveyClosed()) {
      return;
    }
    this.voteSaved.set(false);
    this.voteError.set('');
    this.showVoteValidation = false;
    this.answerControls.forEach(controls => controls.forEach(control => control.reset(false)));
    this.setAnswersDisabled(false);
    this.updateResults();
  }

  // Read actual totals and ignore results belonging to a previous route/request.
  async loadResults(): Promise<void> {
    if (this.isPreview || this.resultQuestions.length === 0) {
      return;
    }
    const surveyRequest = this.loadRequest;
    const request = ++this.resultsRequest;
    this.isLoadingResults.set(true);
    this.resultsError.set('');
    try {
      const counts = await this.surveys.getVoteCounts(this.getAnswerIds());
      if (surveyRequest !== this.loadRequest || request !== this.resultsRequest) {
        return;
      }
      this.voteCounts = counts;
      this.updateResults();
      this.hasVotes.set(counts.some(answer => answer.count > 0));
      this.resultsLoaded.set(true);
    } catch {
      if (surveyRequest === this.loadRequest && request === this.resultsRequest) {
        this.resultsError.set('Could not load the results. Please try again.');
      }
    } finally {
      if (surveyRequest === this.loadRequest && request === this.resultsRequest) {
        this.isLoadingResults.set(false);
      }
    }
  }

  // Preview one extra vote per selected answer without changing stored totals.
  private updateResults(): void {
    if (this.isPreview) {
      return;
    }
    const preview = this.hasPendingVote();
    for (const question of this.resultQuestions) {
      const totals = question.answers.map((answer, index) => {
        const stored = this.voteCounts.find(row => row.answerId === answer.id)?.count ?? 0;
        const selected = this.answerControls[question.number - 1][index].value;
        return stored + (preview && selected ? 1 : 0);
      });
      const total = totals.reduce((sum, count) => sum + count, 0);
      question.answers.forEach((answer, index) => {
        const share = total > 0 ? totals[index] / total : 0;
        answer.percentage = Math.round(share * 100);
        answer.fillWidth = Math.round(share * 255);
      });
    }
  }

  // Group a burst of inserted answer rows into one results refresh.
  private watchResults(): void {
    const request = this.loadRequest;
    this.voteChannel = this.surveys.watchVotes(this.getAnswerIds(), () => {
      if (request === this.loadRequest) {
        clearTimeout(this.resultsTimer);
        this.resultsTimer = setTimeout(() => this.loadResults(), 100);
      }
    }, status => {
      if (request === this.loadRequest) {
        this.liveStatus.set(status);
      }
    });
  }

  private stopWatchingResults(): void {
    clearTimeout(this.resultsTimer);
    this.resultsRequest++;
    if (this.voteChannel) {
      this.surveys.stopWatchingVotes(this.voteChannel);
      this.voteChannel = undefined;
    }
  }

  private getAnswerIds(): number[] {
    const ids: number[] = [];
    for (const question of this.resultQuestions) {
      for (const answer of question.answers) {
        if (answer.id !== undefined) {
          ids.push(answer.id);
        }
      }
    }
    return ids;
  }

  private setAnswersDisabled(disabled: boolean): void {
    this.answerControls.forEach(controls => controls.forEach(control => {
      if (disabled) {
        control.disable();
      } else {
        control.enable();
      }
    }));
  }

  // Start with empty selections and keep two questions per row.
  private groupQuestions(): void {
    this.answerControls = this.resultQuestions.map(question => question.answers.map(() =>
      new FormControl({ value: false, disabled: this.isSurveyClosed() }, { nonNullable: true })
    ));
    for (let index = 0; index < this.resultQuestions.length; index += 2) {
      this.questionRows.push(this.resultQuestions.slice(index, index + 2));
    }
  }

  // Focus the name field after Angular has created the overlay.
  openCreateSurvey(): void {
    if (this.isSubmitting()) {
      return;
    }
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
