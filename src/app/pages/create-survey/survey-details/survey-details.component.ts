import { Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { SurveyDetailsForm } from '../../../models/survey-form';
import { SurveyCategoryComponent } from '../survey-category/survey-category.component';

/** Display survey details while the creation dialog manages their controls and validation. */
@Component({
  selector: 'app-survey-details',
  imports: [ReactiveFormsModule, SurveyCategoryComponent],
  templateUrl: './survey-details.component.html',
  styleUrls: ['../create-survey-controls.css', './survey-details.component.css', './survey-details-mobile.css'],
})
export class SurveyDetailsComponent {
  /** Receive the original name, date and description controls as one typed object. */
  details = input<SurveyDetailsForm | null>(null);

  nameHasError = input<boolean>(false);

  showValidation = input<boolean>(false);

  endDateError = input<string>('');

  minimumEndDate = input<string>('');

  categories = input<string[]>([]);

  isCategoryMenuOpen = input<boolean>(false);

  selectedCategory = input<string>('');

  fieldBlurred = output<FormControl<string>>();

  /** Supply the native input so date validity is checked exactly as before. */
  dateChecked = output<HTMLInputElement>();

  nameCleared = output<void>();

  dateCleared = output<void>();

  descriptionCleared = output<void>();

  categoryToggled = output<void>();

  categorySelected = output<string>();

  /** Use only the supplied controls; missing input must not create replacement fields. */
  get form(): SurveyDetailsForm {
    const controls = this.details();
    if (!controls) throw new Error('The survey detail controls are missing.');
    return controls;
  }
}
