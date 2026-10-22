import { Injectable } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';

import { AnswerInsert, AnswerVoteCount, NewSurvey, SavedQuestionPosition, SavedVote, Survey } from '../models/survey';
import { MAX_ANSWERS, MAX_QUESTIONS, MIN_ANSWERS } from '../models/survey-constants';
import { SupabaseService } from './supabase.service';
import { VoteMemoryService } from './vote-memory.service';

const SURVEY_FIELDS = 'id,title,description,category,end_date,questions(id,position,text,allow_multiple_answers,answers(id,position,text))';

/** Save and load surveys through the existing shared Supabase client. */
@Injectable({ providedIn: 'root' })
export class SurveyService {
  /**
   * Connect database access and the browser's separate vote memory.
   * @param supabase - Shared client used for database reads, writes and subscriptions.
   * @param memory - Separate service remembering this browser's submitted selections.
   */
  constructor(private supabase: SupabaseService, private memory: VoteMemoryService) {}

  /**
   * Save related rows in order and report success only after the final insert.
   * @param input - Survey details, questions and answers to save in order.
   * @returns The generated survey ID after all related inserts have succeeded.
   */
  async createSurvey(input: NewSurvey): Promise<number> {
    const surveyId = await this.insertSurvey(input);
    const questions = await this.insertQuestions(surveyId, input);
    const { error } = await this.supabase.client.from('answers').insert(this.createAnswerRows(questions, input));
    if (error) throw error;
    return surveyId;
  }

  /**
   * Insert the survey details and read its generated ID.
   * @param input - Survey data supplying the title and optional metadata.
   * @returns The database-generated ID of the inserted survey.
   */
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

  /**
   * Keep question positions because insert responses need not be ordered.
   * @param surveyId - ID of the survey that owns these questions.
   * @param input - Survey data containing the questions in display order.
   * @returns Generated question IDs with their saved positions, without assuming response order.
   */
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

  /**
   * Match each answer list to its question's returned position.
   * @param questions - Inserted question IDs and positions returned by the database.
   * @param input - Original survey data containing the ordered answer texts.
   * @returns Answer rows matched to their saved question IDs and numbered positions.
   */
  private createAnswerRows(questions: SavedQuestionPosition[], input: NewSurvey): AnswerInsert[] {
    const rows: AnswerInsert[] = [];
    for (const question of questions) {
      input.questions[question.position - 1].answers.forEach((text, index) => {
        rows.push({ question_id: question.id, position: index + 1, text });
      });
    }
    return rows;
  }

  /**
   * Load complete surveys and their related questions and answers.
   * @returns Complete surveys, newest ID first, with questions and answers in position order.
   */
  async getSurveys(): Promise<Survey[]> {
    const { data, error } = await this.supabase.client.from('surveys')
      .select(SURVEY_FIELDS).order('id', { ascending: false });
    if (error) throw error;
    return this.prepareSurveys(data);
  }

  /**
   * Load one complete survey by its actual database ID.
   * @param id - Database ID of the requested survey.
   * @returns The complete, ordered survey, or null if it is missing or incomplete.
   */
  async getSurvey(id: number): Promise<Survey | null> {
    const { data, error } = await this.supabase.client.from('surveys').select(SURVEY_FIELDS).eq('id', id);
    if (error) throw error;
    return this.prepareSurveys(data)[0] || null;
  }

  /**
   * Return generated vote IDs so a later reset can target this submission.
   * @param answerIds - Database answer IDs belonging to the complete selection.
   * @returns The selected answer IDs and exact generated vote row IDs for a later withdrawal.
   */
  async saveVote(answerIds: number[]): Promise<SavedVote> {
    const rows = answerIds.map(answerId => ({ answer_id: answerId }));
    const { data, error } = await this.supabase.client.from('votes').insert(rows).select('id');
    if (error) throw error;
    return { answerIds: [...answerIds], voteIds: data.map(vote => vote.id) };
  }

  /**
   * Withdraw only the rows returned for this browser's last submission.
   * @param voteIds - Exact vote row IDs returned for this browser's saved submission.
   */
  async resetVote(voteIds: number[]): Promise<void> {
    if (voteIds.length === 0) throw new Error('The saved vote IDs are missing.');
    const { data, error } = await this.supabase.client.from('votes').delete().in('id', voteIds).select('id');
    if (error) throw error;
    if (data.length !== voteIds.length) await this.checkReset(voteIds);
  }

  /**
   * Detect a missing DELETE policy that silently leaves vote rows intact.
   * @param voteIds - Vote row IDs that must no longer exist after withdrawal.
   */
  private async checkReset(voteIds: number[]): Promise<void> {
    const { data, error } = await this.supabase.client.from('votes').select('id').in('id', voteIds);
    if (error) throw error;
    if (data.length > 0) throw new Error('The saved votes could not be removed.');
  }

  /**
   * Read the browser's saved selection separately from aggregate results.
   * @param surveyId - Survey ID whose submitted selection should be restored.
   * @returns This browser's saved selection, or null when no valid marker is available.
   */
  getSavedVote(surveyId: number): SavedVote | null {
    return this.memory.getSavedVote(surveyId);
  }

  /**
   * Remember a submission after saving or resetting has succeeded.
   * @param surveyId - Survey ID to associate with the saved browser selection.
   * @param savedVote - Submission to remember, or null to clear its browser marker.
   * @returns Whether persistent browser storage was updated; an in-memory fallback is still retained.
   */
  rememberVote(surveyId: number, savedVote: SavedVote | null): boolean {
    return this.memory.rememberVote(surveyId, savedVote);
  }

  /**
   * Count in the database instead of downloading limited individual rows.
   * @param answerIds - Database answer IDs whose aggregate vote totals are required.
   * @returns Each requested answer ID paired with its stored vote count.
   */
  async getVoteCounts(answerIds: number[]): Promise<AnswerVoteCount[]> {
    const { data, error } = await this.supabase.client.from('answers')
      .select('id,votes(count)').in('id', answerIds);
    if (error) throw error;
    if (data.length !== answerIds.length) throw new Error('Some answer results are unavailable.');
    return data.map(answer => ({ answerId: answer.id, count: answer.votes[0]?.count ?? 0 }));
  }

  /**
   * Refresh after inserts and withdrawals, including other browser windows.
   * @param answerIds - Answer IDs used to filter inserted votes for this survey.
   * @param onChange - Callback requesting a totals refresh after vote changes or subscription readiness.
   * @param onStatus - Callback receiving the current realtime subscription status.
   * @returns The realtime channel to remove when the displayed survey changes.
   */
  watchVotes(answerIds: number[], onChange: () => void, onStatus: (status: string) => void): RealtimeChannel {
    return this.supabase.client.channel('survey-votes-' + answerIds.join('-'), {
      config: { postgres_changes_options: { wait: true } },
    }).on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'votes', filter: 'answer_id=in.(' + answerIds.join(',') + ')',
    }, onChange)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'votes' }, onChange)
      .subscribe(status => this.handleLiveStatus(status, onChange, onStatus));
  }

  /**
   * Reload once Supabase confirms that database changes are ready.
   * @param status - Current status reported by the realtime channel.
   * @param onChange - Callback refreshing totals after the channel becomes ready.
   * @param onStatus - Callback that displays the latest connection status.
   */
  private handleLiveStatus(status: string, onChange: () => void, onStatus: (status: string) => void): void {
    onStatus(status);
    if (status === 'SUBSCRIBED') onChange();
  }

  /**
   * Remove a subscription when its survey is no longer displayed.
   * @param channel - Realtime channel belonging to a survey that is no longer displayed.
   */
  stopWatchingVotes(channel: RealtimeChannel): void {
    this.supabase.client.removeChannel(channel);
  }

  /**
   * Hide unfinished writes and restore question and answer order.
   * @param surveys - Database survey records that may contain incomplete writes.
   * @returns Complete records with their existing nested question and answer arrays sorted in place.
   */
  private prepareSurveys(surveys: Survey[]): Survey[] {
    return surveys.filter(survey => this.isCompleteSurvey(survey)).map(survey => this.sortSurvey(survey));
  }

  /**
   * Require the agreed number of questions and answers.
   * @param survey - Saved survey whose question and answer counts should be checked.
   * @returns Whether it has one to six questions and two to six answers per question.
   */
  private isCompleteSurvey(survey: Survey): boolean {
    return survey.questions.length >= 1 && survey.questions.length <= MAX_QUESTIONS
      && survey.questions.every(question => question.answers.length >= MIN_ANSWERS && question.answers.length <= MAX_ANSWERS);
  }

  /**
   * Keep database insert order independent of the displayed order.
   * @param survey - Survey whose existing question and answer arrays should be sorted by position.
   * @returns The same survey object with its nested arrays in display order.
   */
  private sortSurvey(survey: Survey): Survey {
    survey.questions.sort((first, second) => first.position - second.position);
    survey.questions.forEach(question => question.answers.sort((first, second) => first.position - second.position));
    return survey;
  }
}
