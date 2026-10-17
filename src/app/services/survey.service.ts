import { Injectable } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { AnswerVoteCount, NewSurvey, SavedVote, Survey } from '../models/survey';
import { SupabaseService } from './supabase.service';

// Save and load surveys through the existing shared Supabase client.
@Injectable({ providedIn: 'root' })
export class SurveyService {
  private voteStoragePrefix = 'pollapp-vote-' + environment.supabaseUrl + '-';
  private rememberedVotes: { surveyId: number; savedVote: SavedVote | null; persistent: boolean }[] = [];

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
  async saveVote(answerIds: number[]): Promise<SavedVote> {
    const rows = answerIds.map(answerId => ({ answer_id: answerId }));
    const { data, error } = await this.supabase.client.from('votes').insert(rows).select('id');
    if (error) {
      throw error;
    }
    return { answerIds: [...answerIds], voteIds: data.map(vote => vote.id) };
  }

  // Withdraw only the rows returned for this browser's last submission.
  async resetVote(voteIds: number[]): Promise<void> {
    if (voteIds.length === 0) {
      throw new Error('The saved vote IDs are missing.');
    }
    const { data, error } = await this.supabase.client
      .from('votes').delete().in('id', voteIds).select('id');
    if (error) {
      throw error;
    }
    // A missing DELETE policy can silently leave rows untouched.
    if (data.length !== voteIds.length) {
      const { data: remaining, error: readError } = await this.supabase.client
        .from('votes').select('id').in('id', voteIds);
      if (readError) {
        throw readError;
      }
      if (remaining.length > 0) {
        throw new Error('The saved votes could not be removed.');
      }
    }
  }

  // Read this browser's last submitted choices, separately from database totals.
  getSavedVote(surveyId: number): SavedVote | null {
    const remembered = this.rememberedVotes.find(vote => vote.surveyId === surveyId);
    // Prefer the latest submitted choices if writing the browser marker failed.
    if (remembered && !remembered.persistent) {
      return remembered.savedVote;
    }
    try {
      const stored = localStorage.getItem(this.voteStoragePrefix + surveyId);
      if (!stored) {
        return null;
      }
      const parsed: SavedVote | number[] | null = JSON.parse(stored);
      // Older markers contain answer IDs but cannot identify their vote rows.
      const vote = Array.isArray(parsed) ? { answerIds: parsed, voteIds: [] } : parsed;
      if (vote && Array.isArray(vote.answerIds) && Array.isArray(vote.voteIds)
        && vote.answerIds.length > 0 && vote.answerIds.length <= 36
        && (vote.voteIds.length === 0 || vote.voteIds.length === vote.answerIds.length)
        && vote.answerIds.every((id, index) => Number.isSafeInteger(id) && id > 0 && vote.answerIds.indexOf(id) === index)
        && vote.voteIds.every((id, index) => Number.isSafeInteger(id) && id > 0 && vote.voteIds.indexOf(id) === index)) {
        return vote;
      }
      return null;
    } catch {
      // Keep navigation working when the browser blocks persistent storage.
      return remembered?.savedVote || null;
    }
  }

  // Change the browser marker only after Supabase confirms saving or resetting.
  rememberVote(surveyId: number, savedVote: SavedVote | null): boolean {
    this.rememberedVotes = this.rememberedVotes.filter(vote => vote.surveyId !== surveyId);
    const remembered = {
      surveyId,
      savedVote: savedVote ? { answerIds: [...savedVote.answerIds], voteIds: [...savedVote.voteIds] } : null,
      persistent: false,
    };
    this.rememberedVotes.push(remembered);
    try {
      if (savedVote) {
        localStorage.setItem(this.voteStoragePrefix + surveyId, JSON.stringify(savedVote));
      } else {
        localStorage.removeItem(this.voteStoragePrefix + surveyId);
      }
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

  // Refresh after new votes and withdrawals, including changes in other windows.
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
      // Deleted rows may contain only their primary key, so omit the answer filter.
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'votes' }, onChange)
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
