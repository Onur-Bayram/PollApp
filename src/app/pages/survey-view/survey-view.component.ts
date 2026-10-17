import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Subscription } from 'rxjs';
import { AnswerVoteCount, SavedVote } from '../../models/survey';
import { ResultQuestion } from '../../models/survey-result';
import { SurveyResultsService } from '../../services/survey-results.service';
import { SurveyService } from '../../services/survey.service';
import { CreateSurveyComponent } from '../create-survey/create-survey.component';
import { createSurveyPreview } from './survey-preview';

// Connect the survey detail view to its separate template and styles.
@Component({
  selector: 'app-survey-view',
  imports: [DatePipe, RouterLink, ReactiveFormsModule, CreateSurveyComponent],
  templateUrl: './survey-view.component.html',
  styleUrls: ['./survey-view.component.css', './survey-view-content.css'],
})
export class SurveyViewComponent implements OnInit, OnDestroy {
  // Show the existing creation overlay above the survey details.
  isCreateSurveyOpen = false;

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
  isResetting = signal(false);
  voteSaved = signal(false);
  voteError = signal('');
  voteMemoryNotice = signal('');
  showVoteValidation = false;
  isLoadingResults = signal(false);
  resultsLoaded = signal(false);
  resultsError = signal('');
  hasVotes = signal(false);
  liveStatus = signal('');
  private voteCounts: AnswerVoteCount[] = [];
  private savedVote: SavedVote | null = null;
  private surveyId = 0;
  private routeSubscription?: Subscription;
  private voteChannel?: RealtimeChannel;
  private resultsTimer?: ReturnType<typeof setTimeout>;
  private loadRequest = 0;
  private resultsRequest = 0;

  constructor(
    private route: ActivatedRoute,
    private surveys: SurveyService,
    private results: SurveyResultsService,
  ) {}

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
    this.surveyId = 0;
    this.loadError.set('');
    this.resultQuestions = [];
    this.questionRows = [];
    this.answerControls = [];
    this.voteCounts = [];
    this.isSubmitting.set(false);
    this.isResetting.set(false);
    this.savedVote = null;
    this.voteSaved.set(false);
    this.voteError.set('');
    this.voteMemoryNotice.set('');
    this.showVoteValidation = false;
    this.resultsLoaded.set(false);
    this.isLoadingResults.set(false);
    this.resultsError.set('');
    this.hasVotes.set(false);
    this.liveStatus.set('');

    if (this.isPreview) {
      this.isLoading.set(false);
      const preview = createSurveyPreview();
      this.surveyTitle = preview.title;
      this.description = preview.description;
      this.endDate = preview.endDate;
      this.category = preview.category;
      this.resultQuestions = preview.questions;
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
      this.surveyId = survey.id;
      this.surveyTitle = survey.title;
      this.description = survey.description;
      this.category = survey.category;
      this.endDate = survey.end_date;
      this.resultQuestions = this.results.createQuestions(survey);
      this.groupQuestions();
      this.restoreSavedVote();
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
    if (this.isPreview || this.isLoading() || !this.surveyId || this.isSubmitting() || this.voteSaved()) {
      return;
    }
    this.voteError.set('');
    this.voteMemoryNotice.set('');
    this.showVoteValidation = true;
    if (this.isSurveyClosed()) {
      this.setAnswersDisabled(true);
      this.updateResults();
      return;
    }
    if (this.resultQuestions.some(question => this.needsAnswer(question))) {
      return;
    }

    const checkedAnswers = this.answerControls.map(controls => controls.map(control => control.value));
    const selectedIds = this.results.getSelectedAnswerIds(this.resultQuestions, checkedAnswers);
    const request = this.loadRequest;
    const surveyId = this.surveyId;
    this.isSubmitting.set(true);
    this.setAnswersDisabled(true);
    try {
      const savedVote = await this.surveys.saveVote(selectedIds);
      const remembered = this.surveys.rememberVote(surveyId, savedVote);
      if (request !== this.loadRequest) {
        return;
      }
      this.savedVote = savedVote;
      this.voteSaved.set(true);
      if (!remembered) {
        this.voteMemoryNotice.set('Your vote was saved, but this browser could not remember your selection after a restart.');
      }
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

  // Remove the previous submission before allowing a replacement vote.
  async voteAgain(): Promise<void> {
    if (this.isPreview || !this.voteSaved() || this.isSubmitting() || this.isSurveyClosed()) {
      return;
    }
    this.voteError.set('');
    this.voteMemoryNotice.set('');
    const savedVote = this.savedVote;
    if (!savedVote) {
      return;
    }
    const request = this.loadRequest;
    const surveyId = this.surveyId;
    this.isSubmitting.set(true);
    this.isResetting.set(true);
    try {
      if (savedVote.voteIds.length === savedVote.answerIds.length) {
        await this.surveys.resetVote(savedVote.voteIds);
      } else {
        // An old browser marker can be cleared once its answers have no votes left.
        const counts = await this.surveys.getVoteCounts(savedVote.answerIds);
        if (counts.some(answer => answer.count > 0)) {
          if (request === this.loadRequest) {
            this.voteError.set('This earlier vote cannot be reset automatically. It was saved with an older version of the app.');
          }
          return;
        }
      }
      const remembered = this.surveys.rememberVote(surveyId, null);
      if (request !== this.loadRequest) {
        return;
      }
      this.savedVote = null;
      this.voteSaved.set(false);
      this.showVoteValidation = false;
      this.answerControls.forEach(controls => controls.forEach(control => control.reset(false)));
      if (!remembered) {
        this.voteMemoryNotice.set('Your vote was reset, but this browser could not clear its saved selection after a restart.');
      }
      await this.loadResults();
    } catch {
      if (request === this.loadRequest) {
        this.voteError.set('Could not reset your vote. Please try again.');
        await this.loadResults();
      }
    } finally {
      if (request === this.loadRequest) {
        this.isSubmitting.set(false);
        this.isResetting.set(false);
        this.setAnswersDisabled(this.voteSaved() || this.isSurveyClosed());
      }
    }
  }

  // Restore only a complete submitted selection that still matches this survey.
  private restoreSavedVote(): void {
    const savedVote = this.surveys.getSavedVote(this.surveyId);
    if (!savedVote || !this.results.isCompleteSelection(this.resultQuestions, savedVote.answerIds)) {
      return;
    }
    const selectedIds = savedVote.answerIds;
    this.savedVote = savedVote;
    this.voteSaved.set(true);
    for (const question of this.resultQuestions) {
      question.answers.forEach((answer, index) => {
        this.answerControls[question.number - 1][index].setValue(answer.id !== undefined && selectedIds.includes(answer.id));
      });
    }
    this.setAnswersDisabled(true);
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
      const counts = await this.surveys.getVoteCounts(this.results.getAnswerIds(this.resultQuestions));
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
    const checkedAnswers = this.answerControls.map(controls => controls.map(control => control.value));
    const selectedIds = this.hasPendingVote()
      ? this.results.getSelectedAnswerIds(this.resultQuestions, checkedAnswers) : [];
    this.results.updatePercentages(this.resultQuestions, this.voteCounts, selectedIds);
  }

  // Group a burst of saved or removed vote rows into one results refresh.
  private watchResults(): void {
    const request = this.loadRequest;
    this.voteChannel = this.surveys.watchVotes(this.results.getAnswerIds(this.resultQuestions), () => {
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

  private setAnswersDisabled(disabled: boolean): void {
    this.answerControls.forEach(controls => {
      controls.forEach(control => disabled ? control.disable() : control.enable());
    });
  }

  // Start with empty selections and keep two questions per row.
  private groupQuestions(): void {
    this.answerControls = this.resultQuestions.map(question => question.answers.map(() =>
      new FormControl({ value: false, disabled: this.isSurveyClosed() }, { nonNullable: true })
    ));
    this.questionRows = this.results.createQuestionRows(this.resultQuestions);
  }

  // Focus the name field after Angular has created the overlay.
  openCreateSurvey(): void {
    if (this.isSubmitting()) {
      return;
    }
    this.isCreateSurveyOpen = true;
    setTimeout(() => document.getElementById('survey-name')?.focus());
  }

  // Restore focus after the survey page becomes interactive again.
  closeCreateSurvey(button: HTMLButtonElement): void {
    this.isCreateSurveyOpen = false;
    setTimeout(() => button.focus());
  }
}
