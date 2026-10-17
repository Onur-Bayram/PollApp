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
export interface NewSurveyQuestion {
  text: string;
  allow_multiple_answers: boolean;
  answers: string[];
}

export interface NewSurvey {
  title: string;
  description: string | null;
  category: string | null;
  end_date: string | null;
  questions: NewSurveyQuestion[];
}

// Match the IDs and positions returned after a question insert.
export interface SavedQuestionPosition {
  id: number;
  position: number;
}

export interface AnswerInsert {
  question_id: number;
  position: number;
  text: string;
}

// Return one total per answer without downloading every individual vote.
export interface AnswerVoteCount {
  answerId: number;
  count: number;
}

// Remember which database rows belong to this browser's last submission.
export interface SavedVote {
  answerIds: number[];
  voteIds: number[];
}
