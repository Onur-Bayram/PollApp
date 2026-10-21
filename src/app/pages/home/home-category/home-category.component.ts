import { Component, input, output } from '@angular/core';

/** Render the category filter while Home owns the selection and loaded surveys. */
@Component({
  selector: 'app-home-category',
  templateUrl: './home-category.component.html',
  styleUrl: './home-category.component.css',
})
export class HomeCategoryComponent {
  /** Include the reset option before the six supported survey topics. */
  categories: string[] = [
    'All Surveys',
    'Team Activities',
    'Health & Wellness',
    'Gaming & Entertainment',
    'Education & Learning',
    'Lifestyle & Preferences',
    'Technology & Innovation',
  ];

  /** Receive the category that Home keeps selected across status changes. */
  selectedCategory = input<string>('');

  /** Receive the menu state without maintaining a second copy of it. */
  isOpen = input<boolean>(false);

  /** Ask Home to open or close the menu. */
  toggled = output<void>();

  /** Send the chosen option to Home so it can update its survey cards. */
  categorySelected = output<string>();
}
