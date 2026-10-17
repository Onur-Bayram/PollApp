import { Injectable } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';

import { AnswerInsert, AnswerVoteCount, NewSurvey, SavedQuestionPosition, SavedVote, Survey } from '../models/survey';
import { MAX_ANSWERS, MAX_QUESTIONS, MIN_ANSWERS } from '../models/survey-constants';
import { SupabaseService } from './supabase.service';
import { VoteMemoryService } from './vote-memory.service';

const SURVEY_FIELDS = 'id,title,description,category,end_date,questions(id,position,text,allow_multiple_answers,answers(id,position,text))';

// Save and load surveys through the existing shared Supabase client.
@Injectable({ providedIn: 'root' })
export class SurveyService {
  /** Connect database access and the browser's separate vote memory. */
  constructor(private supabase: SupabaseService, private memory: VoteMemoryService) {}

  /** Save related rows in order and report success only after the final insert. */
  async createSurvey(input: NewSurvey): Promise<number> {
    const surveyId = await this.insertSurvey(input);
    const questions = await this.insertQuestions(surveyId, input);
    const { error } = await this.supabase.client.from('answers').insert(this.createAnswerRows(questions, input));
    if (error) throw error;
    return surveyId;
  }

  /** Insert the survey details and read its generated ID. */
  private async insertSurvey(input: NewSurvey): Promise<number> {
    const { data, error } = await this.supabase.client.from('surveys').insert({
      title: input.title,
      description: input.description,
      category: input.category,
      end_date: input.end_date,
    }).select('id').single();
    if (error) throw error;
    return data.id;
  }

  /** Keep question positions because insert responses need not be ordered. */
  private async insertQuestions(surveyId: number, input: NewSurvey): Promise<SavedQuestionPosition[]> {
    const rows = input.questions.map((question, index) => ({
      survey_id: surveyId,
      position: index + 1,
      text: question.text,
      allow_multiple_answers: question.allow_multiple_answers,
    }));
    const { data, error } = await this.supabase.client.from('questions').insert(rows).select('id,position');
    if (error) throw error;
    return data;
  }

  /** Match each answer list to its question's returned position. */
  private createAnswerRows(questions: SavedQuestionPosition[], input: NewSurvey): AnswerInsert[] {
    const rows: AnswerInsert[] = [];
    for (const question of questions) {
      input.questions[question.position - 1].answers.forEach((text, index) => {
        rows.push({ question_id: question.id, position: index + 1, text });
      });
    }
    return rows;
  }

  /** Load complete surveys and their related questions and answers. */
  async getSurveys(): Promise<Survey[]> {
    const { data, error } = await this.supabase.client.from('surveys')
      .select(SURVEY_FIELDS).order('id', { ascending: false });
    if (error) throw error;
    return this.prepareSurveys(data);
  }

  /** Load one complete survey by its actual database ID. */
  async getSurvey(id: number): Promise<Survey | null> {
    const { data, error } = await this.supabase.client.from('surveys').select(SURVEY_FIELDS).eq('id', id);
    if (error) throw error;
    return this.prepareSurveys(data)[0] || null;
  }

  /** Return generated vote IDs so a later reset can target this submission. */
  async saveVote(answerIds: number[]): Promise<SavedVote> {
    const rows = answerIds.map(answerId => ({ answer_id: answerId }));
    const { data, error } = await this.supabase.client.from('votes').insert(rows).select('id');
    if (error) throw error;
    return { answerIds: [...answerIds], voteIds: data.map(vote => vote.id) };
  }

  /** Withdraw only the rows returned for this browser's last submission. */
  async resetVote(voteIds: number[]): Promise<void> {
    if (voteIds.length === 0) throw new Error('The saved vote IDs are missing.');
    const { data, error } = await this.supabase.client.from('votes').delete().in('id', voteIds).select('id');
    if (error) throw error;
    if (data.length !== voteIds.length) await this.checkReset(voteIds);
  }

  /** Detect a missing DELETE policy that silently leaves vote rows intact. */
  private async checkReset(voteIds: number[]): Promise<void> {
    const { data, error } = await this.supabase.client.from('votes').select('id').in('id', voteIds);
    if (error) throw error;
    if (data.length > 0) throw new Error('The saved votes could not be removed.');
  }

  /** Read the browser's saved selection separately from aggregate results. */
  getSavedVote(surveyId: number): SavedVote | null {
    return this.memory.getSavedVote(surveyId);
  }

  /** Remember a submission after saving or resetting has succeeded. */
  rememberVote(surveyId: number, savedVote: SavedVote | null): boolean {
    return this.memory.rememberVote(surveyId, savedVote);
  }

  /** Count in the database instead of downloading limited individual rows. */
  async getVoteCounts(answerIds: number[]): Promise<AnswerVoteCount[]> {
    const { data, error } = await this.supabase.client.from('answers')
      .select('id,votes(count)').in('id', answerIds);
    if (error) throw error;
    if (data.length !== answerIds.length) throw new Error('Some answer results are unavailable.');
    return data.map(answer => ({ answerId: answer.id, count: answer.votes[0]?.count ?? 0 }));
  }

  /** Refresh after inserts and withdrawals, including other browser windows. */
  watchVotes(answerIds: number[], onChange: () => void, onStatus: (status: string) => void): RealtimeChannel {
    return this.supabase.client.channel('survey-votes-' + answerIds.join('-'), {
      config: { postgres_changes_options: { wait: true } },
    }).on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'votes', filter: 'answer_id=in.(' + answerIds.join(',') + ')',
    }, onChange)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'votes' }, onChange)
      .subscribe(status => this.handleLiveStatus(status, onChange, onStatus));
  }

  /** Reload once Supabase confirms that database changes are ready. */
  private handleLiveStatus(status: string, onChange: () => void, onStatus: (status: string) => void): void {
    onStatus(status);
    if (status === 'SUBSCRIBED') onChange();
  }

  /** Remove a subscription when its survey is no longer displayed. */
  stopWatchingVotes(channel: RealtimeChannel): void {
    this.supabase.client.removeChannel(channel);
  }

  /** Hide unfinished writes and restore question and answer order. */
  private prepareSurveys(surveys: Survey[]): Survey[] {
    return surveys.filter(survey => this.isCompleteSurvey(survey)).map(survey => this.sortSurvey(survey));
  }

  /** Require the agreed number of questions and answers. */
  private isCompleteSurvey(survey: Survey): boolean {
    return survey.questions.length >= 1 && survey.questions.length <= MAX_QUESTIONS
      && survey.questions.every(question => question.answers.length >= MIN_ANSWERS && question.answers.length <= MAX_ANSWERS);
  }

  /** Keep database insert order independent of the displayed order. */
  private sortSurvey(survey: Survey): Survey {
    survey.questions.sort((first, second) => first.position - second.position);
    survey.questions.forEach(question => question.answers.sort((first, second) => first.position - second.position));
    return survey;
  }
}
