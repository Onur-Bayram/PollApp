import { FormControl } from '@angular/forms';

// Keep every editable question and its controls explicitly typed.
export interface SurveyQuestionForm {
  text: FormControl<string>;
  answers: FormControl<string>[];
  allowMultipleAnswers: FormControl<boolean>;
}

/** Pass the original survey detail controls together without copying their values. */
export interface SurveyDetailsForm {
  surveyName: FormControl<string>;
  endDate: FormControl<string>;
  description: FormControl<string>;
}
