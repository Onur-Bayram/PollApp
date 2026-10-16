import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Survey } from '../../models/survey';
import { SurveyService } from '../../services/survey.service';
import { CreateSurveyComponent } from '../create-survey/create-survey.component';

interface SurveyCard {
  category: string;
  title: string;
  deadline: string;
  link: string | null;
  isPast: boolean;
}

// Connect the home page template and styles to this Angular component.
@Component({
  selector: 'app-home',
  imports: [RouterLink, CreateSurveyComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  // Show the creation overlay without leaving the home page.
  isCreateSurveyOpen = false;

  // Keep the six example cards in the order shown in the design.
  private exampleCards = [
    {
      category: 'Team activities',
      title: 'Let’s Plan the Next Team Event Together',
      deadline: 'Ends in 1 Day',
    },
    {
      category: 'Gaming',
      title: 'Gaming habits and favorite games!',
      deadline: 'Ends in 3 Day',
    },
    {
      category: 'Gaming',
      title: 'Gaming habits and favorite games!',
      deadline: 'Ends in 3 Day',
    },
    {
      category: 'Healthy Lifestyle',
      title: 'Healthier future: Fit & wellness survey!',
      deadline: 'Ends in 2 Day',
    },
    {
      category: 'Healthy Lifestyle',
      title: 'Healthier future: Fit & wellness survey!',
      deadline: 'Ends in 2 Day',
    },
    {
      category: 'Team activities',
      title: 'Let’s Plan the Next Team Event Together',
      deadline: 'Ends in 1 Day',
    },
  ];

  // Keep saved surveys in Supabase; only the current list is held on this page.
  surveyCards = signal<SurveyCard[]>([]);
  endingSoonCards = signal<SurveyCard[]>([]);
  private savedSurveys: Survey[] = [];
  isLoading = signal(false);
  loadError = signal('');
  private loadRequest = 0;

  constructor(private surveys: SurveyService) {}

  ngOnInit(): void {
    this.updateSurveyCards();
    this.loadSurveys();
  }

  async loadSurveys(): Promise<void> {
    const request = ++this.loadRequest;
    this.isLoading.set(true);
    this.loadError.set('');
    try {
      const surveys = await this.surveys.getSurveys();
      if (request === this.loadRequest) {
        this.savedSurveys = surveys;
        this.updateSurveyCards();
      }
    } catch {
      if (request === this.loadRequest) {
        this.loadError.set('Could not load saved surveys. Please try again.');
      }
    } finally {
      if (request === this.loadRequest) {
        this.isLoading.set(false);
      }
    }
  }

  // Add real survey links while keeping the existing design examples available.
  private updateSurveyCards(): void {
    const cards = this.savedSurveys.map(survey => this.createSurveyCard(survey));
    // Highlight the three nearest active deadlines without a fixed day limit.
    const endingSoon = this.savedSurveys.filter(survey => {
      if (!survey.end_date) return false;
      return this.getRemainingDays(survey.end_date) >= 0;
    });
    endingSoon.sort((first, second) =>
      (first.end_date || '').localeCompare(second.end_date || '') || first.id - second.id
    );
    this.endingSoonCards.set(endingSoon.slice(0, 3).map(survey => this.createSurveyCard(survey)));

    for (const example of this.exampleCards) {
      cards.push({
        ...example,
        link: example.category === 'Team activities' ? '/survey' : null,
        isPast: false,
      });
    }
    this.surveyCards.set(cards.filter((card) => {
      const statusMatches = this.selectedSurveyStatus === ''
        || (this.selectedSurveyStatus === 'past' ? card.isPast : !card.isPast);
      let category = card.category;
      if (category === 'Team activities') category = 'Team Activities';
      if (category === 'Gaming') category = 'Gaming & Entertainment';
      if (category === 'Healthy Lifestyle') category = 'Health & Wellness';
      const categoryMatches = !this.selectedCategory || this.selectedCategory === 'All Surveys'
        || category === this.selectedCategory;
      return statusMatches && categoryMatches;
    }));
  }

  // Use the same saved fields and ID links in both home card layouts.
  private createSurveyCard(survey: Survey): SurveyCard {
    return {
      category: survey.category || '',
      title: survey.title,
      deadline: this.getDeadline(survey.end_date),
      link: '/survey/' + survey.id,
      isPast: survey.end_date !== null && this.getRemainingDays(survey.end_date) < 0,
    };
  }

  // Keep the deadline label current without borrowing a design example's date.
  private getDeadline(endDate: string | null): string {
    if (!endDate) return 'No deadline';
    const days = this.getRemainingDays(endDate);
    if (days < 0) return 'Ended';
    if (days === 0) return 'Ends today';
    return 'Ends in ' + days + (days === 1 ? ' Day' : ' Days');
  }

  // Count local calendar days correctly even when daylight saving time changes.
  private getRemainingDays(endDate: string): number {
    const today = new Date();
    const end = new Date(endDate + 'T00:00:00');
    return Math.round((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
      - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
  }

  // Store which survey status button is currently selected.
  selectedSurveyStatus = 'active';

  // Track whether the category menu is open.
  isSortMenuOpen = false;

  // Store the category shown below the button and highlighted in the menu.
  selectedCategory = '';

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

  // Restore focus after the home page becomes interactive again.
  closeCreateSurvey(button: HTMLButtonElement): void {
    this.isCreateSurveyOpen = false;
    this.loadSurveys();
    setTimeout(() => button.focus());
  }

  // Select a button, or clear the selection when it is clicked again.
  toggleSurveyStatus(status: string) {
    if (this.selectedSurveyStatus === status) {
      this.selectedSurveyStatus = '';
    } else {
      this.selectedSurveyStatus = status;
    }
    this.updateSurveyCards();
  }

  // Open or close the category menu and update its arrow.
  toggleSortMenu() {
    this.isSortMenuOpen = !this.isSortMenuOpen;
  }

  // Save the clicked category and close the menu.
  selectCategory(category: string) {
    this.selectedCategory = category;
    this.isSortMenuOpen = false;
    this.updateSurveyCards();
  }
}
