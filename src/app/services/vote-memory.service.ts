import { Injectable } from '@angular/core';

import { ENVIRONMENT } from '../../environments/environment';
import { MAX_ANSWERS, MAX_QUESTIONS } from '../models/survey-constants';
import { SavedVote } from '../models/survey';

interface RememberedVote {
  surveyId: number;
  savedVote: SavedVote | null;
  persistent: boolean;
}

/** Remember this browser's submission separately from the database totals. */
@Injectable({ providedIn: 'root' })
export class VoteMemoryService {
  private storagePrefix: string = 'pollapp-vote-' + ENVIRONMENT.supabaseUrl + '-';
  private rememberedVotes: RememberedVote[] = [];

  /**
   * Prefer the latest in-memory value if browser storage could not be changed.
   * @param surveyId - Survey ID whose browser marker should be read.
   * @returns The latest remembered valid submission, or null when no valid selection is available.
   */
  getSavedVote(surveyId: number): SavedVote | null {
    const remembered = this.rememberedVotes.find(vote => vote.surveyId === surveyId);
    if (remembered && !remembered.persistent) return remembered.savedVote;
    try {
      const stored = localStorage.getItem(this.storagePrefix + surveyId);
      return stored ? this.parseVote(stored) : null;
    } catch {
      return remembered?.savedVote || null;
    }
  }

  /**
   * Accept the old answer-only format without inventing missing vote IDs.
   * @param stored - JSON text read from the saved browser marker.
   * @returns A valid current or legacy submission, or null when the parsed structure is invalid.
   */
  private parseVote(stored: string): SavedVote | null {
    const parsed: SavedVote | number[] | null = JSON.parse(stored);
    const vote = Array.isArray(parsed) ? { answerIds: parsed, voteIds: [] } : parsed;
    return this.isSavedVote(vote) ? vote : null;
  }

  /**
   * Validate IDs and lengths before restoring any browser marker.
   * @param vote - Parsed submission or legacy marker to validate.
   * @returns Whether answer IDs and vote IDs have valid counts and contain unique positive integers.
   */
  private isSavedVote(vote: SavedVote | null): boolean {
    return vote !== null && Array.isArray(vote.answerIds) && Array.isArray(vote.voteIds)
      && vote.answerIds.length > 0 && vote.answerIds.length <= MAX_QUESTIONS * MAX_ANSWERS
      && (vote.voteIds.length === 0 || vote.voteIds.length === vote.answerIds.length)
      && this.areUniqueIds(vote.answerIds) && this.areUniqueIds(vote.voteIds);
  }

  /**
   * Require positive, unique database IDs.
   * @param ids - Database IDs to check for positive, safe integers and duplicates.
   * @returns Whether every supplied ID is a positive safe integer appearing only once.
   */
  private areUniqueIds(ids: number[]): boolean {
    return ids.every((id, index) => Number.isSafeInteger(id) && id > 0 && ids.indexOf(id) === index);
  }

  /**
   * Keep a fallback even when setting or removing the persistent marker fails.
   * @param surveyId - Survey ID whose browser selection should be updated.
   * @param savedVote - Submission to remember, or null to remove the saved selection.
   * @returns Whether local storage was updated successfully; the current selection is retained in memory.
   */
  rememberVote(surveyId: number, savedVote: SavedVote | null): boolean {
    this.rememberedVotes = this.rememberedVotes.filter(vote => vote.surveyId !== surveyId);
    const remembered: RememberedVote = {
      surveyId,
      savedVote: savedVote ? { answerIds: [...savedVote.answerIds], voteIds: [...savedVote.voteIds] } : null,
      persistent: false,
    };
    this.rememberedVotes.push(remembered);
    remembered.persistent = this.writeMarker(remembered);
    return remembered.persistent;
  }

  /**
   * Write the marker only after the database operation has succeeded.
   * @param vote - Remembered survey ID and submission to write, or clear when its savedVote is null.
   * @returns Whether the browser marker was written or removed without a storage error.
   */
  private writeMarker(vote: RememberedVote): boolean {
    try {
      if (vote.savedVote) localStorage.setItem(this.storagePrefix + vote.surveyId, JSON.stringify(vote.savedVote));
      else localStorage.removeItem(this.storagePrefix + vote.surveyId);
      return true;
    } catch {
      return false;
    }
  }
}
