import { Injectable } from '@angular/core';

import { AnswerVoteCount, Survey, SurveyAnswer, SurveyQuestion } from '../models/survey';
import { ResultAnswer, ResultQuestion } from '../models/survey-result';
import { ANSWER_LETTERS, DESKTOP_QUESTION_COLUMNS, PERCENTAGE_TOTAL, QUESTION_HEADING_HEIGHT, RESULT_ROW_SPACING, RESULT_TRACK_HEIGHT, RESULT_TRACK_WIDTH } from '../models/survey-constants';

/** Prepare the displayed questions and percentages without changing stored votes. */
@Injectable({ providedIn: 'root' })
export class SurveyResultsService {
  /**
   * Prepare live questions with empty chart values and their stored answer IDs.
   * @param survey - Saved survey containing ordered questions and answers.
   * @returns Displayed questions with real answer IDs and initially empty charts.
   */
  createQuestions(survey: Survey): ResultQuestion[] {
    return survey.questions.map((question, index) => this.createQuestion(question, index));
  }

  /**
   * Keep two questions per desktop row while sharing the displayed answer data.
   * @param questions - Displayed questions whose existing objects should be shared.
   * @returns Rows of up to two questions for the desktop voting layout.
   */
  createQuestionRows(questions: ResultQuestion[]): ResultQuestion[][] {
    const rows: ResultQuestion[][] = [];
    for (let index = 0; index < questions.length; index += DESKTOP_QUESTION_COLUMNS) {
      rows.push(questions.slice(index, index + DESKTOP_QUESTION_COLUMNS));
    }
    return rows;
  }

  /**
   * Collect only database IDs; the Figma example has no stored answer rows.
   * @param questions - Displayed questions that may include unsaved preview answers.
   * @returns All available database answer IDs in question and answer order.
   */
  getAnswerIds(questions: ResultQuestion[]): number[] {
    const ids: number[] = [];
    for (const question of questions) {
      for (const answer of question.answers) {
        if (answer.id !== undefined) {
          ids.push(answer.id);
        }
      }
    }
    return ids;
  }

  /**
   * Match the checked fields to their saved answer IDs in the same order.
   * @param questions - Displayed questions containing the real answer IDs.
   * @param checkedAnswers - Checked states grouped by question number and answer position.
   * @returns Database IDs of checked answers, excluding answers without stored IDs.
   */
  getSelectedAnswerIds(questions: ResultQuestion[], checkedAnswers: boolean[][]): number[] {
    const ids: number[] = [];
    for (const question of questions) {
      question.answers.forEach((answer, index) => {
        if (checkedAnswers[question.number - 1][index] && answer.id !== undefined) {
          ids.push(answer.id);
        }
      });
    }
    return ids;
  }

  /**
   * Restore only selections that belong here and satisfy each question's rules.
   * @param questions - Current survey questions and their multiple-answer rules.
   * @param selectedIds - Saved or current answer IDs to validate against these questions.
   * @returns Whether every question has a valid selection that respects its single-answer rule.
   */
  isCompleteSelection(questions: ResultQuestion[], selectedIds: number[]): boolean {
    const answerIds = this.getAnswerIds(questions);
    if (selectedIds.length === 0 || selectedIds.some(id => !answerIds.includes(id))) {
      return false;
    }
    for (const question of questions) {
      const count = question.answers.filter(answer => answer.id !== undefined && selectedIds.includes(answer.id)).length;
      if (count === 0 || (!question.allowMultipleAnswers && count > 1)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Add the unsent selection only for the local preview, then calculate each share.
   * @param questions - Displayed question objects whose chart values are updated in place.
   * @param counts - Stored vote totals for the survey answers.
   * @param previewIds - Unsubmitted local choices to add only to the displayed preview.
   */
  updatePercentages(questions: ResultQuestion[], counts: AnswerVoteCount[], previewIds: number[]): void {
    questions.forEach(question => this.updateQuestionPercentages(question, counts, previewIds));
  }

  /**
   * Convert one stored question without mixing in the Figma sample values.
   * @param question - Saved question with its ordered answers.
   * @param index - Zero-based position used for the displayed question number.
   * @returns Displayed question data with initial chart dimensions and empty answer percentages.
   */
  private createQuestion(question: SurveyQuestion, index: number): ResultQuestion {
    return {
      number: index + 1,
      text: question.text,
      allowMultipleAnswers: question.allow_multiple_answers,
      headingHeight: QUESTION_HEADING_HEIGHT,
      chartHeight: (question.answers.length - 1) * RESULT_ROW_SPACING + RESULT_TRACK_HEIGHT,
      answers: question.answers.map((answer, answerIndex) => this.createAnswer(answer, answerIndex)),
    };
  }

  /**
   * Give each answer its letter and an initially empty chart.
   * @param answer - Saved answer whose ID and text should be retained.
   * @param index - Zero-based position used to assign the answer letter.
   * @returns Displayed answer data with its letter and initially empty chart values.
   */
  private createAnswer(answer: SurveyAnswer, index: number): ResultAnswer {
    return { id: answer.id, letter: ANSWER_LETTERS[index] + '.', text: answer.text, fillWidth: 0, percentage: 0 };
  }

  /**
   * Calculate each answer's share of the selected question's total.
   * @param question - Question whose existing answer chart values should be updated.
   * @param counts - Stored vote totals for all survey answers.
   * @param previewIds - Local unsent answer IDs to include in the displayed totals.
   */
  private updateQuestionPercentages(question: ResultQuestion, counts: AnswerVoteCount[], previewIds: number[]): void {
    const totals = question.answers.map(answer => this.getAnswerTotal(answer, counts, previewIds));
    const total = totals.reduce((sum, count) => sum + count, 0);
    question.answers.forEach((answer, index) => {
      const share = total > 0 ? totals[index] / total : 0;
      answer.percentage = Math.round(share * PERCENTAGE_TOTAL);
      answer.fillWidth = Math.round(share * RESULT_TRACK_WIDTH);
    });
  }

  /**
   * Add at most one unsent local choice to the stored answer count.
   * @param answer - Displayed answer whose total should be calculated.
   * @param counts - Stored vote totals searched by answer ID.
   * @param previewIds - Local unsent answer IDs counted once when selected.
   * @returns Stored votes for this answer plus at most one unsent local choice.
   */
  private getAnswerTotal(answer: ResultAnswer, counts: AnswerVoteCount[], previewIds: number[]): number {
    const stored = counts.find(row => row.answerId === answer.id)?.count ?? 0;
    const selected = answer.id !== undefined && previewIds.includes(answer.id);
    return stored + (selected ? 1 : 0);
  }
}
