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

  /** Show the parent's required-name error without duplicating its validation rules. */
  nameHasError = input<boolean>(false);

  /** Reveal optional-field errors only after the parent has checked Publish. */
  showValidation = input<boolean>(false);

  /** Display the parent's native date validation message. */
  endDateError = input<string>('');

  /** Keep the date input's minimum synchronized with the parent's current local day. */
  minimumEndDate = input<string>('');

  /** Offer the parent's existing topic list. */
  categories = input<string[]>([]);

  /** Preserve the category menu state owned by the parent. */
  isCategoryMenuOpen = input<boolean>(false);

  /** Display the category that will be included in the saved survey. */
  selectedCategory = input<string>('');

  /** Ask the parent to validate the name after it loses focus. */
  fieldBlurred = output<FormControl<string>>();

  /** Supply the native input so date validity is checked exactly as before. */
  dateChecked = output<HTMLInputElement>();

  /** Ask the parent to clear the existing name control. */
  nameCleared = output<void>();

  /** Ask the parent to clear the date and its validation message. */
  dateCleared = output<void>();

  /** Ask the parent to clear the existing description control. */
  descriptionCleared = output<void>();

  /** Ask the parent to open or close its category menu. */
  categoryToggled = output<void>();

  /** Ask the parent to remember the chosen topic and close the menu. */
  categorySelected = output<string>();

  /** Use only the supplied controls; missing input must not create replacement fields. */
  get form(): SurveyDetailsForm {
    const controls = this.details();
    if (!controls) throw new Error('The survey detail controls are missing.');
    return controls;
  }
}
