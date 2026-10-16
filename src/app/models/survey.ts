// Match the three related tables in Supabase.
export interface SurveyAnswer {
  id: number;
  position: number;
  text: string;
}

export interface SurveyQuestion {
  id: number;
  position: number;
  text: string;
  allow_multiple_answers: boolean;
  answers: SurveyAnswer[];
}

export interface Survey {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  end_date: string | null;
  questions: SurveyQuestion[];
}

// Send form values without database-generated IDs.
export interface NewSurvey {
  title: string;
  description: string | null;
  category: string | null;
  end_date: string | null;
  questions: {
    text: string;
    allow_multiple_answers: boolean;
    answers: string[];
  }[];
}

// Return one total per answer without downloading every individual vote.
export interface AnswerVoteCount {
  answerId: number;
  count: number;
}
