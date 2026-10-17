import { Injectable } from '@angular/core';

import { ENVIRONMENT } from '../../environments/environment';
import { MAX_ANSWERS, MAX_QUESTIONS } from '../models/survey-constants';
import { SavedVote } from '../models/survey';

interface RememberedVote {
  surveyId: number;
  savedVote: SavedVote | null;
  persistent: boolean;
}

// Remember this browser's submission separately from the database totals.
@Injectable({ providedIn: 'root' })
export class VoteMemoryService {
  private storagePrefix: string = 'pollapp-vote-' + ENVIRONMENT.supabaseUrl + '-';
  private rememberedVotes: RememberedVote[] = [];

  /** Prefer the latest in-memory value if browser storage could not be changed. */
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

  /** Accept the old answer-only format without inventing missing vote IDs. */
  private parseVote(stored: string): SavedVote | null {
    const parsed: SavedVote | number[] | null = JSON.parse(stored);
    const vote = Array.isArray(parsed) ? { answerIds: parsed, voteIds: [] } : parsed;
    return this.isSavedVote(vote) ? vote : null;
  }

  /** Validate IDs and lengths before restoring any browser marker. */
  private isSavedVote(vote: SavedVote | null): boolean {
    return vote !== null && Array.isArray(vote.answerIds) && Array.isArray(vote.voteIds)
      && vote.answerIds.length > 0 && vote.answerIds.length <= MAX_QUESTIONS * MAX_ANSWERS
      && (vote.voteIds.length === 0 || vote.voteIds.length === vote.answerIds.length)
      && this.areUniqueIds(vote.answerIds) && this.areUniqueIds(vote.voteIds);
  }

  /** Require positive, unique database IDs. */
  private areUniqueIds(ids: number[]): boolean {
    return ids.every((id, index) => Number.isSafeInteger(id) && id > 0 && ids.indexOf(id) === index);
  }

  /** Keep a fallback even when setting or removing the persistent marker fails. */
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

  /** Write the marker only after the database operation has succeeded. */
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
