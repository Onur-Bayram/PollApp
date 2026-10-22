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
  isCreateSurveyOpen: boolean = false;
  areResultsOpen = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  isResetting = signal<boolean>(false);
  voteSaved = signal<boolean>(false);
  voteError = signal<string>('');
  voteMemoryNotice = signal<string>('');
  showVoteValidation: boolean = false;
  isLoadingResults = signal<boolean>(false);
  /** Distinguish loaded zero totals from results that have not arrived yet. */
  resultsLoaded = signal<boolean>(false);
  resultsError = signal<string>('');
  hasVotes = signal<boolean>(false);
  liveStatus = signal<string>('');
  /** Keep stored totals separate from the current unsaved selection. */
  private voteCounts: AnswerVoteCount[] = [];
  /** Retain the exact saved vote IDs for a later withdrawal. */
  private savedVote: SavedVote | null = null;
  private routeSubscription?: Subscription;
  private voteChannel?: RealtimeChannel;
  /** Combine a burst of live events into one totals refresh. */
  private resultsTimer?: ReturnType<typeof setTimeout>;
  /** Ignore survey responses that belong to an earlier route. */
  private loadRequest: number = 0;
  /** Apply only the latest totals response for the current survey. */
  private resultsRequest: number = 0;

  /** Connect the services used by this component.
   * @param route - Current route providing the saved survey ID.
   * @param surveys - Service used to load totals and save or withdraw votes.
   * @param results - Service preparing question data and calculating chart percentages.
   * @param page - Page state containing the current survey, loading status and answer controls. */
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
    this.areResultsOpen.set(true);
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
  /** Allow enough animation space for charts, wrapped headings and result messages.
   * @returns An estimated maximum results height in pixels, including space for wrapped headings. */
  get resultsAnimationLimit(): number {
    return this.page.resultQuestions.reduce((height, question) => {
      const lines = Math.ceil(question.text.length / RESULTS_HEADING_CHARACTERS_PER_LINE);
      const heading = Math.max(question.headingHeight, lines * RESULTS_HEADING_LINE_HEIGHT);
      return height + heading + question.chartHeight + RESULTS_QUESTION_SPACING;
    }, RESULTS_ANIMATION_EXTRA_HEIGHT);
  }
  /** Allow voting until the end of the stored deadline's final day.
   * @returns Whether a saved survey has passed the end of its deadline day. */
  isSurveyClosed(): boolean {
    return this.page.isSurveyClosed();
  }
  /** Keep one checked answer unless the creator enabled multiple answers.
   * @param question - Displayed question containing the changed answer.
   * @param answerIndex - Zero-based position of the changed answer.
   * @param checked - New checked state reported by the answer control. */
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
  /** Mark results that include the current selection before it is submitted.
   * @returns Whether an open saved survey has a local selection that has not been submitted. */
  hasPendingVote(): boolean {
    return !this.page.isPreview && !this.voteSaved() && !this.isSurveyClosed()
      && this.page.answerControls.some(controls => controls.some(control => control.value));
  }
  /** Require at least one selected answer for every question before saving.
   * @param question - Displayed question whose selection should be checked.
   * @returns Whether validation is visible and the question has no checked answer. */
  needsAnswer(question: ResultQuestion): boolean {
    return this.showVoteValidation
      && !this.page.answerControls[question.number - 1].some(control => control.value);
  }
  /** Pass the existing unanswered-question checks to the voting view.
   * @returns Unanswered-question error flags in the displayed question order. */
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
  /** Lock all answer controls while saving or after a completed submission.
   * @param disabled - Whether every answer control should be disabled. */
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
  /** Restore focus after the survey page becomes interactive again.
   * @param button - Create survey button to refocus, or fall back to the visible mobile Home link. */
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
  /** Validate the selection before starting any database write.
   * @returns Whether the current survey and complete selection are ready to be saved. */
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
  /** Keep the selection locked while saving and preserve it on failure.
   * @param request - Survey load number used to ignore updates after navigation.
   * @param surveyId - Database ID of the survey receiving this submission. */
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
  /** Remember successful database IDs even if the user has already left this route.
   * @param request - Survey load number used to protect the current page state.
   * @param surveyId - Original survey ID under which the saved vote is remembered. */
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
  /** Withdraw the old submission before unlocking a replacement selection.
   * @param savedVote - This browser's saved answer IDs and exact vote row IDs.
   * @param request - Survey load number used to ignore updates after navigation.
   * @param surveyId - Original survey ID whose saved browser selection should be cleared. */
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
  /** Only unlock an older marker when none of its selected answers has stored votes.
   * @param savedVote - Saved submission to withdraw, including legacy answer-only markers.
   * @param request - Survey load number used to avoid displaying errors on another survey.
   * @returns Whether the saved vote rows were removed or a legacy selection has no stored votes. */
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
  /** Clear choices only after their saved vote rows have been removed.
   * @param remembered - Whether persistent browser storage successfully cleared its saved selection. */
  private applyReset(remembered: boolean): void {
    this.savedVote = null;
    this.voteSaved.set(false);
    this.showVoteValidation = false;
    this.page.answerControls.forEach(controls => controls.forEach(control => control.reset(false)));
    if (!remembered) this.voteMemoryNotice.set('Your vote was reset, but this browser could not clear its saved selection after a restart.');
  }
  /** Preserve a failed reset and refresh its real totals.
   * @param request - Survey load number whose failed reset should still be displayed. */
  private async showResetError(request: number): Promise<void> {
    if (request !== this.loadRequest) return;
    this.voteError.set('Could not reset your vote. Please try again.');
    await this.loadResults();
  }
  /** Ignore completion from another route and restore the current control state.
   * @param request - Survey load number used to avoid unlocking controls on another survey. */
  private finishSubmission(request: number): void {
    if (request !== this.loadRequest) return;
    this.isSubmitting.set(false);
    this.isResetting.set(false);
    this.setAnswersDisabled(this.voteSaved() || this.isSurveyClosed());
  }
  /** Apply only the newest result response for this survey.
   * @param surveyRequest - Survey load number identifying the route being refreshed.
   * @param request - Result request number identifying the latest totals request. */
  private async readResults(surveyRequest: number, request: number): Promise<void> {
    const counts = await this.surveys.getVoteCounts(this.results.getAnswerIds(this.page.resultQuestions));
    if (!this.isCurrentResult(surveyRequest, request)) return;
    this.voteCounts = counts;
    this.updateResults();
    this.hasVotes.set(counts.some(answer => answer.count > 0));
    this.resultsLoaded.set(true);
  }
  /** Match both the survey route and its latest result request.
   * @param surveyRequest - Survey load number associated with a result response.
   * @param request - Result request number associated with that response.
   * @returns Whether the response belongs to the current survey and its latest result request. */
  private isCurrentResult(surveyRequest: number, request: number): boolean {
    return surveyRequest === this.loadRequest && request === this.resultsRequest;
  }
  /** Keep a current loading failure visible beside the existing results.
   * @param surveyRequest - Survey load number associated with the failed response.
   * @param request - Result request number used to ignore superseded failures. */
  private showResultsError(surveyRequest: number, request: number): void {
    if (this.isCurrentResult(surveyRequest, request)) this.resultsError.set('Could not load the results. Please try again.');
  }
}
