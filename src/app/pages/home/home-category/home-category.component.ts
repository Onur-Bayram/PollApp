import { Component, input, output } from '@angular/core';

/** Render the category filter while Home owns the selection and loaded surveys. */
@Component({
  selector: 'app-home-category',
  templateUrl: './home-category.component.html',
  styleUrl: './home-category.component.css',
})
export class HomeCategoryComponent {
  categories: string[] = [
    'All Surveys',
    'Team Activities',
    'Health & Wellness',
    'Gaming & Entertainment',
    'Education & Learning',
    'Lifestyle & Preferences',
    'Technology & Innovation',
  ];

  selectedCategory = input<string>('');

  isOpen = input<boolean>(false);

  toggled = output<void>();

  categorySelected = output<string>();
}
