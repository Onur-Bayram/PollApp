import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Subscription } from 'rxjs';

import { AnswerVoteCount, SavedVote } from '../../models/survey';
import { ResultQuestion } from '../../models/survey-result';
import { SurveyResultsService } from '../../services/survey-results.service';
import { SurveyService } from '../../services/survey.service';
import { CreateSurveyComponent } from '../create-survey/create-survey.component';
import { SurveyResultsComponent } from './survey-results/survey-results.component';
import { SurveyVotingComponent } from './survey-voting/survey-voting.component';
import { SurveyPageService } from '../../services/survey-page.service';
import { RESULTS_REFRESH_DELAY } from '../../models/survey-constants';

const RESULTS_ANIMATION_EXTRA_HEIGHT: number = 200;
const RESULTS_HEADING_CHARACTERS_PER_LINE: number = 14;
const RESULTS_HEADING_LINE_HEIGHT: number = 18;
const RESULTS_QUESTION_SPACING: number = 32;

/** Coordinate survey loading, voting and live totals while child views render the data. */
@Component({
  selector: 'app-survey-view',
  imports: [DatePipe, RouterLink, CreateSurveyComponent, SurveyResultsComponent, SurveyVotingComponent],
  templateUrl: './survey-view.component.html',
  styleUrls: ['./survey-view-shared.css', './survey-view.component.css', './survey-view-content.css', './survey-view-mobile.css', './survey-view-results-mobile.css'],
})
export class SurveyViewComponent implements OnInit, OnDestroy {
  /** Show the creation dialog over the current survey. */
  isCreateSurveyOpen: boolean = false;
  /** Keep stacked results collapsed until the voter opens them. */
  areResultsOpen = signal<boolean>(false);
  /** Lock the voting controls while saving or resetting a submission. */
  isSubmitting = signal<boolean>(false);
  /** Distinguish a pending withdrawal from a pending vote save. */
  isResetting = signal<boolean>(false);
  /** Show success only after the selected answers have been saved. */
  voteSaved = signal<boolean>(false);
  /** Keep a failed save or withdrawal visible beside the vote controls. */
  voteError = signal<string>('');
  /** Explain when the vote succeeds but local browser memory cannot be updated. */
  voteMemoryNotice = signal<string>('');
  /** Check unanswered questions only after an attempted submission. */
  showVoteValidation: boolean = false;
  /** Expose an active totals request to the results view. */
  isLoadingResults = signal<boolean>(false);
  /** Distinguish loaded zero totals from results that have not arrived yet. */
  resultsLoaded = signal<boolean>(false);
  /** Preserve a failed totals request until the next retry. */
  resultsError = signal<string>('');
  /** Distinguish an empty survey from one with stored votes. */
  hasVotes = signal<boolean>(false);
  /** Announce live updates only after the subscription is connected. */
  liveStatus = signal<string>('');
  /** Keep stored totals separate from the current unsaved selection. */
  private voteCounts: AnswerVoteCount[] = [];
  /** Retain the exact saved vote IDs for a later withdrawal. */
  private savedVote: SavedVote | null = null;
  /** Release route changes when this survey view is destroyed. */
  private routeSubscription?: Subscription;
  /** Retain the current live channel so another survey can replace it. */
  private voteChannel?: RealtimeChannel;
  /** Combine a burst of live events into one totals refresh. */
  private resultsTimer?: ReturnType<typeof setTimeout>;
  /** Ignore survey responses that belong to an earlier route. */
  private loadRequest: number = 0;
  /** Apply only the latest totals response for the current survey. */
  private resultsRequest: number = 0;

  /** Connect the services used by this component. */
  constructor(
    private route: ActivatedRoute,
    private surveys: SurveyService,
    private results: SurveyResultsService,
    public page: SurveyPageService,
  ) {}

  /** Start at the heading when a card is opened from further down the home page. */
  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.routeSubscription = this.route.paramMap.subscribe(() => this.loadSurvey());
  }

  /** Ignore an older request when the URL changes or the page is left. */
  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.page.cancel();
    this.loadRequest++;
    this.stopWatchingResults();
  }

  /** Connect freshly loaded page data to this route's voting and results state. */
  async loadSurvey(): Promise<void> {
    this.areResultsOpen.set(false);
    const request = ++this.loadRequest;
    this.stopWatchingResults();
    this.resetVoteState();
    this.resetResultState();
    await this.page.load(this.route.snapshot.paramMap.get('id'));
    if (request !== this.loadRequest || this.page.resultQuestions.length === 0) return;
    this.restoreSavedVote();
    if (!this.page.isPreview) {
      this.watchResults();
      this.loadResults();
    }
  }

  /** Toggle mobile visibility while keeping the live results connected. */
  toggleResults(): void {
    this.areResultsOpen.set(!this.areResultsOpen());
  }

  /** Allow enough animation space for charts, wrapped headings and result messages. */
  get resultsAnimationLimit(): number {
    return this.page.resultQuestions.reduce((height, question) => {
      const lines = Math.ceil(question.text.length / RESULTS_HEADING_CHARACTERS_PER_LINE);
      const heading = Math.max(question.headingHeight, lines * RESULTS_HEADING_LINE_HEIGHT);
      return height + heading + question.chartHeight + RESULTS_QUESTION_SPACING;
    }, RESULTS_ANIMATION_EXTRA_HEIGHT);
  }

  /** Allow voting until the end of the stored deadline's final day. */
  isSurveyClosed(): boolean {
    return this.page.isSurveyClosed();
  }

  /** Keep one checked answer unless the creator enabled multiple answers. */
  selectAnswer(question: ResultQuestion, answerIndex: number, checked: boolean): void {
    const controls = this.page.answerControls[question.number - 1];
    if (this.isSurveyClosed()) {
      controls[answerIndex].setValue(!checked);
      this.setAnswersDisabled(true);
    } else if (checked && !question.allowMultipleAnswers) {
      controls.forEach((control, index) => {
        if (index !== answerIndex) control.setValue(false);
      });
    }
    this.updateResults();
  }

  /** Mark results that include the current selection before it is submitted. */
  hasPendingVote(): boolean {
    return !this.page.isPreview && !this.voteSaved() && !this.isSurveyClosed()
      && this.page.answerControls.some(controls => controls.some(control => control.value));
  }

  /** Require at least one selected answer for every question before saving. */
  needsAnswer(question: ResultQuestion): boolean {
    return this.showVoteValidation
      && !this.page.answerControls[question.number - 1].some(control => control.value);
  }

  /** Pass the existing unanswered-question checks to the voting view. */
  getAnswerErrors(): boolean[] {
    return this.page.resultQuestions.map(question => this.needsAnswer(question));
  }

  /** Submit a complete selection and keep the user on the current survey. */
  async submitVote(): Promise<void> {
    if (!this.prepareSubmission()) return;
    await this.saveSubmission(this.loadRequest, this.page.surveyId);
  }

  /** Remove the previous submission before allowing a replacement vote. */
  async voteAgain(): Promise<void> {
    if (this.page.isPreview || !this.voteSaved() || this.isSubmitting() || this.isSurveyClosed() || !this.savedVote) return;
    this.voteError.set('');
    this.voteMemoryNotice.set('');
    this.isSubmitting.set(true);
    this.isResetting.set(true);
    await this.resetSubmission(this.savedVote, this.loadRequest, this.page.surveyId);
  }

  /** Restore only a complete submitted selection that still matches this survey. */
  private restoreSavedVote(): void {
    const savedVote = this.surveys.getSavedVote(this.page.surveyId);
    if (!savedVote || !this.results.isCompleteSelection(this.page.resultQuestions, savedVote.answerIds)) {
      return;
    }
    this.savedVote = savedVote;
    this.voteSaved.set(true);
    for (const question of this.page.resultQuestions) {
      question.answers.forEach((answer, index) => {
        this.page.answerControls[question.number - 1][index].setValue(answer.id !== undefined && savedVote.answerIds.includes(answer.id));
      });
    }
    this.setAnswersDisabled(true);
  }

  /** Read actual totals and ignore results belonging to a previous route/request. */
  async loadResults(): Promise<void> {
    if (this.page.isPreview || this.page.resultQuestions.length === 0) return;
    const surveyRequest = this.loadRequest;
    const request = ++this.resultsRequest;
    this.isLoadingResults.set(true);
    this.resultsError.set('');
    try {
      await this.readResults(surveyRequest, request);
    } catch {
      this.showResultsError(surveyRequest, request);
    } finally {
      if (this.isCurrentResult(surveyRequest, request)) this.isLoadingResults.set(false);
    }
  }

  /** Preview one extra vote per selected answer without changing stored totals. */
  private updateResults(): void {
    if (this.page.isPreview) {
      return;
    }
    const checkedAnswers = this.page.answerControls.map(controls => controls.map(control => control.value));
    const selectedIds = this.hasPendingVote()
      ? this.results.getSelectedAnswerIds(this.page.resultQuestions, checkedAnswers) : [];
    this.results.updatePercentages(this.page.resultQuestions, this.voteCounts, selectedIds);
  }

  /** Group a burst of saved or removed vote rows into one results refresh. */
  private watchResults(): void {
    const request = this.loadRequest;
    this.voteChannel = this.surveys.watchVotes(this.results.getAnswerIds(this.page.resultQuestions), () => {
      if (request === this.loadRequest) {
        clearTimeout(this.resultsTimer);
        this.resultsTimer = setTimeout(() => this.loadResults(), RESULTS_REFRESH_DELAY);
      }
    }, status => {
      if (request === this.loadRequest) {
        this.liveStatus.set(status);
      }
    });
  }

  /** Cancel pending refreshes and unsubscribe from the previous survey. */
  private stopWatchingResults(): void {
    clearTimeout(this.resultsTimer);
    this.resultsRequest++;
    if (this.voteChannel) {
      this.surveys.stopWatchingVotes(this.voteChannel);
      this.voteChannel = undefined;
    }
  }

  /** Lock all answer controls while saving or after a completed submission. */
  private setAnswersDisabled(disabled: boolean): void {
    this.page.answerControls.forEach(controls => {
      controls.forEach(control => disabled ? control.disable() : control.enable());
    });
  }

  /** Open the dialog, which sets its own focus after rendering. */
  openCreateSurvey(): void {
    if (this.isSubmitting()) {
      return;
    }
    this.isCreateSurveyOpen = true;
  }

  /** Restore focus after the survey page becomes interactive again. */
  closeCreateSurvey(button: HTMLButtonElement): void {
    this.isCreateSurveyOpen = false;
    setTimeout(() => {
      button.focus();
      if (document.activeElement !== button) document.querySelector<HTMLAnchorElement>('.survey-view-header a')?.focus();
    });
  }

  /** Clear submission feedback when another survey is opened. */
  private resetVoteState(): void {
    this.isSubmitting.set(false);
    this.isResetting.set(false);
    this.savedVote = null;
    this.voteSaved.set(false);
    this.voteError.set('');
    this.voteMemoryNotice.set('');
    this.showVoteValidation = false;
  }

  /** Clear result state before connecting the next survey's subscription. */
  private resetResultState(): void {
    this.voteCounts = [];
    this.resultsLoaded.set(false);
    this.isLoadingResults.set(false);
    this.resultsError.set('');
    this.hasVotes.set(false);
    this.liveStatus.set('');
  }

  /** Validate the selection before starting any database write. */
  private prepareSubmission(): boolean {
    if (this.page.isPreview || this.page.isLoading() || !this.page.surveyId || this.isSubmitting() || this.voteSaved()) return false;
    this.voteError.set('');
    this.voteMemoryNotice.set('');
    this.showVoteValidation = true;
    if (this.isSurveyClosed()) {
      this.setAnswersDisabled(true);
      this.updateResults();
      return false;
    }
    return !this.page.resultQuestions.some(question => this.needsAnswer(question));
  }

  /** Keep the selection locked while saving and preserve it on failure. */
  private async saveSubmission(request: number, surveyId: number): Promise<void> {
    this.isSubmitting.set(true);
    this.setAnswersDisabled(true);
    try {
      await this.persistVote(request, surveyId);
    } catch {
      if (request === this.loadRequest) this.voteError.set('Could not save your vote. Please try again.');
    } finally {
      this.finishSubmission(request);
    }
  }

  /** Remember successful database IDs even if the user has already left this route. */
  private async persistVote(request: number, surveyId: number): Promise<void> {
    const choices = this.page.answerControls.map(controls => controls.map(control => control.value));
    const savedVote = await this.surveys.saveVote(this.results.getSelectedAnswerIds(this.page.resultQuestions, choices));
    const remembered = this.surveys.rememberVote(surveyId, savedVote);
    if (request !== this.loadRequest) return;
    this.savedVote = savedVote;
    this.voteSaved.set(true);
    if (!remembered) this.voteMemoryNotice.set('Your vote was saved, but this browser could not remember your selection after a restart.');
    this.showVoteValidation = false;
    await this.loadResults();
  }

  /** Withdraw the old submission before unlocking a replacement selection. */
  private async resetSubmission(savedVote: SavedVote, request: number, surveyId: number): Promise<void> {
    try {
      if (!await this.withdrawVote(savedVote, request)) return;
      const remembered = this.surveys.rememberVote(surveyId, null);
      if (request !== this.loadRequest) return;
      this.applyReset(remembered);
      await this.loadResults();
    } catch {
      await this.showResetError(request);
    } finally {
      this.finishSubmission(request);
    }
  }

  /** Only unlock an older marker when none of its selected answers has stored votes. */
  private async withdrawVote(savedVote: SavedVote, request: number): Promise<boolean> {
    if (savedVote.voteIds.length === savedVote.answerIds.length) {
      await this.surveys.resetVote(savedVote.voteIds);
      return true;
    }
    const counts = await this.surveys.getVoteCounts(savedVote.answerIds);
    if (!counts.some(answer => answer.count > 0)) return true;
    if (request === this.loadRequest) {
      this.voteError.set('This earlier vote cannot be reset automatically. It was saved with an older version of the app.');
    }
    return false;
  }

  /** Clear choices only after their saved vote rows have been removed. */
  private applyReset(remembered: boolean): void {
    this.savedVote = null;
    this.voteSaved.set(false);
    this.showVoteValidation = false;
    this.page.answerControls.forEach(controls => controls.forEach(control => control.reset(false)));
    if (!remembered) this.voteMemoryNotice.set('Your vote was reset, but this browser could not clear its saved selection after a restart.');
  }

  /** Preserve a failed reset and refresh its real totals. */
  private async showResetError(request: number): Promise<void> {
    if (request !== this.loadRequest) return;
    this.voteError.set('Could not reset your vote. Please try again.');
    await this.loadResults();
  }

  /** Ignore completion from another route and restore the current control state. */
  private finishSubmission(request: number): void {
    if (request !== this.loadRequest) return;
    this.isSubmitting.set(false);
    this.isResetting.set(false);
    this.setAnswersDisabled(this.voteSaved() || this.isSurveyClosed());
  }

  /** Apply only the newest result response for this survey. */
  private async readResults(surveyRequest: number, request: number): Promise<void> {
    const counts = await this.surveys.getVoteCounts(this.results.getAnswerIds(this.page.resultQuestions));
    if (!this.isCurrentResult(surveyRequest, request)) return;
    this.voteCounts = counts;
    this.updateResults();
    this.hasVotes.set(counts.some(answer => answer.count > 0));
    this.resultsLoaded.set(true);
  }

  /** Match both the survey route and its latest result request. */
  private isCurrentResult(surveyRequest: number, request: number): boolean {
    return surveyRequest === this.loadRequest && request === this.resultsRequest;
  }

  /** Keep a current loading failure visible beside the existing results. */
  private showResultsError(surveyRequest: number, request: number): void {
    if (this.isCurrentResult(surveyRequest, request)) this.resultsError.set('Could not load the results. Please try again.');
  }
}
