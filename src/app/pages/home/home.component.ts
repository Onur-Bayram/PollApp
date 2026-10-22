import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Survey } from '../../models/survey';
import { ENDING_SOON_LIMIT, MILLISECONDS_PER_DAY } from '../../models/survey-constants';
import { SurveyService } from '../../services/survey.service';
import { CreateSurveyComponent } from '../create-survey/create-survey.component';
import { HomeCategoryComponent } from './home-category/home-category.component';

/** Display data shared by the ending-soon and filtered survey cards. */
interface SurveyCard {
  category: string;
  title: string;
  deadline: string;
  link: string;
  isPast: boolean;
}

/** Load and filter saved surveys while keeping the creation dialog on Home. */
@Component({
  selector: 'app-home',
  imports: [RouterLink, CreateSurveyComponent, HomeCategoryComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css', './home-surveys.css', './home-mobile.css'],
})
export class HomeComponent implements OnInit {
  isCreateSurveyOpen: boolean = false;

  surveyCards = signal<SurveyCard[]>([]);

  endingSoonCards = signal<SurveyCard[]>([]);

  isLoading = signal<boolean>(false);

  loadError = signal<string>('');

  selectedSurveyStatus: string = 'active';

  isSortMenuOpen: boolean = false;

  selectedCategory: string = '';

  /** Cache the loaded records so changing filters needs no additional request. */
  private savedSurveys: Survey[] = [];

  /** Identify the latest request so an older response cannot replace its data. */
  private loadRequest: number = 0;

  /** Receive the shared service used to refresh saved survey data. */
  constructor(private surveys: SurveyService) {}

  /** Load the saved surveys when the home page opens. */
  ngOnInit(): void {
    this.loadSurveys();
  }

  /** Refresh cards while keeping loading and failure states visible. */
  async loadSurveys(): Promise<void> {
    const request = ++this.loadRequest;
    this.isLoading.set(true);
    this.loadError.set('');
    try {
      await this.loadSurveyCards(request);
    } catch {
      if (request === this.loadRequest) this.loadError.set('Could not load saved surveys. Please try again.');
    } finally {
      if (request === this.loadRequest) this.isLoading.set(false);
    }
  }

  /** Show only saved surveys with working links to their own detail pages. */
  private updateSurveyCards(): void {
    this.endingSoonCards.set(this.getEndingSoon().map(survey => this.createSurveyCard(survey)));
    const cards = this.savedSurveys.map(survey => this.createSurveyCard(survey));
    this.surveyCards.set(cards.filter(card => this.matchesFilters(card)));
  }

  /** Use the same saved fields and ID links in both home card layouts. */
  private createSurveyCard(survey: Survey): SurveyCard {
    return {
      category: survey.category || 'No category',
      title: survey.title,
      deadline: this.getDeadline(survey.end_date),
      link: '/survey/' + survey.id,
      isPast: survey.end_date !== null && this.getRemainingDays(survey.end_date) < 0,
    };
  }

  /** Keep the deadline label current without borrowing a design example's date. */
  private getDeadline(endDate: string | null): string {
    if (!endDate) return 'No deadline';
    const days = this.getRemainingDays(endDate);
    if (days < 0) return 'Ended';
    if (days === 0) return 'Ends today';
    return 'Ends in ' + days + (days === 1 ? ' Day' : ' Days');
  }

  /** Count local calendar days correctly even when daylight saving time changes. */
  private getRemainingDays(endDate: string): number {
    const today = new Date();
    const end = new Date(endDate + 'T00:00:00');
    return Math.round((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
      - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / MILLISECONDS_PER_DAY);
  }

  /** Open the dialog, which sets its own focus after rendering. */
  openCreateSurvey(): void {
    this.isCreateSurveyOpen = true;
  }

  /** Restore focus after the home page becomes interactive again. */
  closeCreateSurvey(button: HTMLButtonElement): void {
    this.isCreateSurveyOpen = false;
    this.loadSurveys();
    setTimeout(() => button.focus());
  }

  /** Keep active and past surveys separate, including repeated clicks. */
  selectSurveyStatus(status: string): void {
    this.selectedSurveyStatus = status;
    this.updateSurveyCards();
  }

  /** Open or close the category menu and update its arrow. */
  toggleSortMenu(): void {
    this.isSortMenuOpen = !this.isSortMenuOpen;
  }

  /** Save the clicked category and close the menu. */
  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.isSortMenuOpen = false;
    this.updateSurveyCards();
  }

  /** Ignore a response if a newer list request has already started. */
  private async loadSurveyCards(request: number): Promise<void> {
    const surveys = await this.surveys.getSurveys();
    if (request !== this.loadRequest) return;
    this.savedSurveys = surveys;
    this.updateSurveyCards();
  }

  /** Select the nearest active deadlines, excluding undated surveys. */
  private getEndingSoon(): Survey[] {
    const surveys = this.savedSurveys.filter(survey =>
      survey.end_date !== null && this.getRemainingDays(survey.end_date) >= 0
    );
    surveys.sort((first, second) =>
      (first.end_date || '').localeCompare(second.end_date || '') || first.id - second.id
    );
    return surveys.slice(0, ENDING_SOON_LIMIT);
  }

  /** Apply category and status together without mixing active and past surveys. */
  private matchesFilters(card: SurveyCard): boolean {
    const statusMatches = this.selectedSurveyStatus === 'past' ? card.isPast : !card.isPast;
    const categoryMatches = !this.selectedCategory || this.selectedCategory === 'All Surveys'
      || card.category === this.selectedCategory;
    return statusMatches && categoryMatches;
  }
}
