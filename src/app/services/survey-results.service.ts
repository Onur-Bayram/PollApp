import { Injectable } from '@angular/core';
import { AnswerVoteCount, Survey } from '../models/survey';
import { ResultQuestion } from '../models/survey-result';

// Prepare the displayed questions and percentages without changing stored votes.
@Injectable({ providedIn: 'root' })
export class SurveyResultsService {
  createQuestions(survey: Survey): ResultQuestion[] {
    const letters = ['A.', 'B.', 'C.', 'D.', 'E.', 'F.'];
    return survey.questions.map((question, index) => ({
      number: index + 1,
      text: question.text,
      allowMultipleAnswers: question.allow_multiple_answers,
      headingHeight: 46,
      chartHeight: (question.answers.length - 1) * 30 + 14,
      answers: question.answers.map((answer, answerIndex) => ({
        id: answer.id,
        letter: letters[answerIndex],
        text: answer.text,
        fillWidth: 0,
        percentage: 0,
      })),
    }));
  }

  // Keep two questions per desktop row while sharing the displayed answer data.
  createQuestionRows(questions: ResultQuestion[]): ResultQuestion[][] {
    const rows: ResultQuestion[][] = [];
    for (let index = 0; index < questions.length; index += 2) {
      rows.push(questions.slice(index, index + 2));
    }
    return rows;
  }

  // Collect only database IDs; the Figma example has no stored answer rows.
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

  // Match the checked fields to their saved answer IDs in the same order.
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

  // Restore only selections that belong here and satisfy each question's rules.
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

  // Add the unsent selection only for the local preview, then calculate each share.
  updatePercentages(questions: ResultQuestion[], counts: AnswerVoteCount[], previewIds: number[]): void {
    for (const question of questions) {
      const totals = question.answers.map(answer => {
        const stored = counts.find(row => row.answerId === answer.id)?.count ?? 0;
        const selected = answer.id !== undefined && previewIds.includes(answer.id);
        return stored + (selected ? 1 : 0);
      });
      const total = totals.reduce((sum, count) => sum + count, 0);
      question.answers.forEach((answer, index) => {
        const share = total > 0 ? totals[index] / total : 0;
        answer.percentage = Math.round(share * 100);
        answer.fillWidth = Math.round(share * 255);
      });
    }
  }
}
