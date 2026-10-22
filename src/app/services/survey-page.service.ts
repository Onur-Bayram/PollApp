import { Injectable, signal } from '@angular/core';
import { FormControl } from '@angular/forms';

import { Survey } from '../models/survey';
import { ResultQuestion } from '../models/survey-result';
import { createSurveyPreview } from '../pages/survey-view/survey-preview';
import { SurveyResultsService } from './survey-results.service';
import { SurveyService } from './survey.service';

/** Load the current page separately from voting and result subscriptions. */
@Injectable({ providedIn: 'root' })
export class SurveyPageService {
  isPreview: boolean = false;
  isLoading = signal<boolean>(false);
  loadError = signal<string>('');
  surveyId: number = 0;
  surveyTitle: string = '';
  description: string | null = null;
  endDate: string | null = null;
  category: string | null = null;
  resultQuestions: ResultQuestion[] = [];
  questionRows: ResultQuestion[][] = [];
  answerControls: FormControl<boolean>[][] = [];
  private loadRequest: number = 0;

  /** Use the existing database and question preparation services. */
  constructor(private surveys: SurveyService, private results: SurveyResultsService) {}

  /** Select the design preview or load the requested real survey. */
  async load(id: string | null): Promise<void> {
    const request = ++this.loadRequest;
    this.reset();
    this.isPreview = id === null;
    if (this.isPreview) this.applyPreview();
    else if (this.isValidId(id)) await this.loadSavedSurvey(Number(id), request);
    else this.loadError.set('This survey is not available.');
  }

  /** Clear page-specific data before handling another route. */
  private reset(): void {
    this.surveyId = 0;
    this.isLoading.set(false);
    this.loadError.set('');
    this.resultQuestions = [];
    this.questionRows = [];
    this.answerControls = [];
  }

  /** Accept only positive integer database IDs. */
  private isValidId(id: string | null): boolean {
    return Number.isSafeInteger(Number(id)) && Number(id) > 0;
  }

  /** Keep loading and failure states attached to the newest request. */
  private async loadSavedSurvey(id: number, request: number): Promise<void> {
    this.isLoading.set(true);
    try {
      await this.readSurvey(id, request);
    } catch {
      if (request === this.loadRequest) this.loadError.set('Could not load this survey. Please try again.');
    } finally {
      if (request === this.loadRequest) this.isLoading.set(false);
    }
  }

  /** Ignore a result belonging to a route that has already been left. */
  private async readSurvey(id: number, request: number): Promise<void> {
    const survey = await this.surveys.getSurvey(id);
    if (request !== this.loadRequest) return;
    if (survey) this.applySurvey(survey);
    else this.loadError.set('This survey is not available.');
  }

  /** Display the actual saved metadata and related questions. */
  private applySurvey(survey: Survey): void {
    this.surveyId = survey.id;
    this.surveyTitle = survey.title;
    this.description = survey.description;
    this.category = survey.category;
    this.endDate = survey.end_date;
    this.resultQuestions = this.results.createQuestions(survey);
    this.groupQuestions();
  }

  /** Keep the static Figma example separate from stored surveys. */
  private applyPreview(): void {
    const preview = createSurveyPreview();
    this.surveyTitle = preview.title;
    this.description = preview.description;
    this.endDate = preview.endDate;
    this.category = preview.category;
    this.resultQuestions = preview.questions;
    this.groupQuestions();
  }

  /** Start with empty selections and two question columns on desktop. */
  private groupQuestions(): void {
    this.answerControls = this.resultQuestions.map(question => question.answers.map(() =>
      new FormControl({ value: false, disabled: this.isSurveyClosed() }, { nonNullable: true })
    ));
    this.questionRows = this.results.createQuestionRows(this.resultQuestions);
  }

  /** Allow voting through the stored deadline's complete local calendar day. */
  isSurveyClosed(): boolean {
    return !this.isPreview && this.endDate !== null
      && new Date(this.endDate + 'T23:59:59.999').getTime() < Date.now();
  }

  /** Invalidate outstanding requests when the current page is removed. */
  cancel(): void {
    this.loadRequest++;
  }
}
