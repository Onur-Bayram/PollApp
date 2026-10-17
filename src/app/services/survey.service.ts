import { Injectable } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { AnswerVoteCount, NewSurvey, Survey } from '../models/survey';
import { SupabaseService } from './supabase.service';

// Save and load surveys through the existing shared Supabase client.
@Injectable({ providedIn: 'root' })
export class SurveyService {
  private voteStoragePrefix = 'pollapp-vote-' + environment.supabaseUrl + '-';
  private rememberedVotes: { surveyId: number; answerIds: number[]; persistent: boolean }[] = [];

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

  // Save all selected answers together; one row represents one choice.
  async saveVote(answerIds: number[]): Promise<void> {
    const rows = answerIds.map(answerId => ({ answer_id: answerId }));
    const { error } = await this.supabase.client.from('votes').insert(rows);
    if (error) {
      throw error;
    }
  }

  // Read this browser's last submitted choices, separately from database totals.
  getSavedVote(surveyId: number): number[] {
    const remembered = this.rememberedVotes.find(vote => vote.surveyId === surveyId);
    // Prefer the latest submitted choices if writing the browser marker failed.
    if (remembered && !remembered.persistent) {
      return remembered.answerIds;
    }
    try {
      const stored = localStorage.getItem(this.voteStoragePrefix + surveyId);
      if (!stored) {
        return [];
      }
      const answerIds: unknown = JSON.parse(stored);
      if (Array.isArray(answerIds) && answerIds.length <= 36
        && answerIds.every(id => Number.isSafeInteger(id) && id > 0)) {
        return answerIds;
      }
      return [];
    } catch {
      // Keep navigation working when the browser blocks persistent storage.
      return remembered?.answerIds || [];
    }
  }

  // Call only after Supabase confirms the vote; never store an unsent selection.
  rememberVote(surveyId: number, answerIds: number[]): boolean {
    this.rememberedVotes = this.rememberedVotes.filter(vote => vote.surveyId !== surveyId);
    const remembered = { surveyId, answerIds: [...answerIds], persistent: false };
    this.rememberedVotes.push(remembered);
    try {
      // localStorage stores text, so convert the ID array to JSON and back on read.
      localStorage.setItem(this.voteStoragePrefix + surveyId, JSON.stringify(answerIds));
      remembered.persistent = true;
      return true;
    } catch {
      return false;
    }
  }

  // Count in Supabase so the usual row limit cannot truncate the totals.
  async getVoteCounts(answerIds: number[]): Promise<AnswerVoteCount[]> {
    const { data, error } = await this.supabase.client
      .from('answers')
      .select('id,votes(count)')
      .in('id', answerIds);
    if (error) {
      throw error;
    }
    if (data.length !== answerIds.length) {
      throw new Error('Some answer results are unavailable.');
    }
    return data.map(answer => ({ answerId: answer.id, count: answer.votes[0]?.count ?? 0 }));
  }

  // Listen only to new votes for the answers on the current survey page.
  watchVotes(answerIds: number[], onChange: () => void, onStatus: (status: string) => void): RealtimeChannel {
    return this.supabase.client
      // Show LIVE only after Supabase confirms that database changes are ready.
      .channel('survey-votes-' + answerIds.join('-'), {
        config: { postgres_changes_options: { wait: true } },
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'votes',
        filter: 'answer_id=in.(' + answerIds.join(',') + ')',
      }, onChange)
      .subscribe(status => {
        onStatus(status);
        if (status === 'SUBSCRIBED') {
          onChange();
        }
      });
  }

  // Remove the old subscription when its survey is no longer displayed.
  stopWatchingVotes(channel: RealtimeChannel): void {
    this.supabase.client.removeChannel(channel);
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
