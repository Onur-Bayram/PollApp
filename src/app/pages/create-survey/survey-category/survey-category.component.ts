import { Component, input, output } from '@angular/core';

/** Share the existing category view while the creation form keeps its state. */
@Component({
  selector: 'app-survey-category',
  templateUrl: './survey-category.component.html',
  styleUrls: ['./survey-category.component.css'],
})
export class SurveyCategoryComponent {
  categories = input<string[]>([]);
  selectedCategory = input<string>('');
  isOpen = input<boolean>(false);

  toggled = output<void>();
  categorySelected = output<string>();
}
