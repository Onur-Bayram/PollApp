import { Injectable } from '@angular/core';
import { NewSurvey, Survey } from '../models/survey';
import { SupabaseService } from './supabase.service';

// Save and load surveys through the existing shared Supabase client.
@Injectable({ providedIn: 'root' })
export class SurveyService {
  constructor(private supabase: SupabaseService) {}

  async createSurvey(input: NewSurvey): Promise<number> {
    const { data: survey, error: surveyError } = await this.supabase.client
      .from('surveys')
      .insert({
        title: input.title,
        description: input.description,
        category: input.category,
        end_date: input.end_date,
      })
      .select('id')
      .single();

    if (surveyError) {
      throw surveyError;
    }

    // Insert all questions together and keep their returned IDs and positions.
    const questionRows = input.questions.map((question, index) => ({
      survey_id: survey.id,
      position: index + 1,
      text: question.text,
      allow_multiple_answers: question.allow_multiple_answers,
    }));
    const { data: questions, error: questionError } = await this.supabase.client
      .from('questions')
      .insert(questionRows)
      .select('id,position');

    if (questionError) {
      throw questionError;
    }

    // Match by position because returned database rows need not be ordered.
    const answerRows: { question_id: number; position: number; text: string }[] = [];
    for (const question of questions) {
      const answers = input.questions[question.position - 1].answers;
      for (let index = 0; index < answers.length; index++) {
        answerRows.push({
          question_id: question.id,
          position: index + 1,
          text: answers[index],
        });
      }
    }

    // Send every answer in one insert; report success only after it finishes.
    const { error: answerError } = await this.supabase.client.from('answers').insert(answerRows);
    if (answerError) {
      throw answerError;
    }
    return survey.id;
  }

  // Load the related rows together instead of requesting each answer separately.
  async getSurveys(): Promise<Survey[]> {
    const { data, error } = await this.supabase.client
      .from('surveys')
      .select('id,title,description,category,end_date,questions(id,position,text,allow_multiple_answers,answers(id,position,text))')
      .order('id', { ascending: false });
    if (error) {
      throw error;
    }
    return this.prepareSurveys(data);
  }

  async getSurvey(id: number): Promise<Survey | null> {
    const { data, error } = await this.supabase.client
      .from('surveys')
      .select('id,title,description,category,end_date,questions(id,position,text,allow_multiple_answers,answers(id,position,text))')
      .eq('id', id);
    if (error) {
      throw error;
    }
    return this.prepareSurveys(data)[0] || null;
  }

  // Hide unfinished writes and restore question/answer order on every load.
  private prepareSurveys(surveys: Survey[]): Survey[] {
    const completeSurveys: Survey[] = [];
    for (const survey of surveys) {
      if (survey.questions.length < 1 || survey.questions.length > 6) {
        continue;
      }
      let complete = true;
      for (const question of survey.questions) {
        if (question.answers.length < 2 || question.answers.length > 6) {
          complete = false;
        }
        question.answers.sort((first, second) => first.position - second.position);
      }
      if (complete) {
        survey.questions.sort((first, second) => first.position - second.position);
        completeSurveys.push(survey);
      }
    }
    return completeSurveys;
  }
}
