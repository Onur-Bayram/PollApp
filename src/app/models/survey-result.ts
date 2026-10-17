// Keep the existing chart sizes separate from the stored survey data.
export interface ResultAnswer {
  id?: number;
  letter: string;
  text: string;
  multiline?: boolean;
  fillWidth: number;
  percentage: number;
}

export interface ResultQuestion {
  number: number;
  text: string;
  votingText?: string;
  allowMultipleAnswers: boolean;
  headingHeight: number;
  chartHeight: number;
  answers: ResultAnswer[];
}

// Keep the static design example separate from real survey data.
export interface SurveyPreview {
  title: string;
  description: string;
  endDate: string;
  category: string;
  questions: ResultQuestion[];
}
