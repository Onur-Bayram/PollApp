import { FormControl } from '@angular/forms';

// Keep every editable question and its controls explicitly typed.
export interface SurveyQuestionForm {
  text: FormControl<string>;
  answers: FormControl<string>[];
  allowMultipleAnswers: FormControl<boolean>;
}
