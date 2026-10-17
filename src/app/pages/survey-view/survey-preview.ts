import { ResultAnswer, ResultQuestion, SurveyPreview } from '../../models/survey-result';

// Preserve the supplied Figma values as design data, separate from live surveys.
const FIRST_QUESTION_ANSWERS: ResultAnswer[] = [
  { letter: 'A.', text: '19.09.2025, Friday', fillWidth: 97, percentage: 27 },
  { letter: 'B.', text: '10.10.2025, Friday', fillWidth: 130, percentage: 44 },
  { letter: 'C.', text: '11.10.2025, Saturday', fillWidth: 9, percentage: 3 },
  { letter: 'D.', text: '31.10.2025, Friday', fillWidth: 93, percentage: 26 },
];

const SECOND_QUESTION_ANSWERS: ResultAnswer[] = [
  { letter: 'A.', text: 'Outdoor adventure like kayaking', multiline: true, fillWidth: 163, percentage: 60 },
  { letter: 'B.', text: 'Office Costume Party', multiline: false, fillWidth: 0, percentage: 0 },
  { letter: 'C.', text: 'Bowling, mini-golf, volleyball', multiline: false, fillWidth: 46, percentage: 14 },
  { letter: 'D.', text: 'Beach party, Music & cocktails', multiline: true, fillWidth: 93, percentage: 26 },
  { letter: 'E.', text: 'Escape room', multiline: false, fillWidth: 0, percentage: 0 },
];

const THIRD_QUESTION_ANSWERS: ResultAnswer[] = [
  { letter: 'A.', text: 'Team bonding', multiline: false, fillWidth: 130, percentage: 44 },
  { letter: 'B.', text: 'Food and drinks', multiline: false, fillWidth: 9, percentage: 3 },
  { letter: 'C.', text: 'Trying something new', multiline: false, fillWidth: 93, percentage: 26 },
  { letter: 'D.', text: 'Keeping it low-key and stress-free', multiline: true, fillWidth: 97, percentage: 27 },
];

const FOURTH_QUESTION_ANSWERS: ResultAnswer[] = [
  { letter: 'A.', text: 'Half a day', multiline: false, fillWidth: 46, percentage: 14 },
  { letter: 'B.', text: 'Full day', multiline: false, fillWidth: 214, percentage: 86 },
  { letter: 'C.', text: 'Evening only', multiline: false, fillWidth: 0, percentage: 0 },
];

const PREVIEW_QUESTIONS: ResultQuestion[] = [
  {
    number: 1,
    text: 'Which date would work best for you?',
    allowMultipleAnswers: true,
    headingHeight: 46,
    chartHeight: 105,
    answers: FIRST_QUESTION_ANSWERS,
  },
  {
    number: 2,
    text: 'Choose the activities you prefer?',
    votingText: 'Choose the activities you prefer.',
    allowMultipleAnswers: true,
    headingHeight: 23,
    chartHeight: 134,
    answers: SECOND_QUESTION_ANSWERS,
  },
  {
    number: 3,
    text: 'What’s most important to you in a team event?',
    allowMultipleAnswers: false,
    headingHeight: 46,
    chartHeight: 97,
    answers: THIRD_QUESTION_ANSWERS,
  },
  {
    number: 4,
    text: 'How long would you prefer the event to last?',
    allowMultipleAnswers: false,
    headingHeight: 46,
    chartHeight: 74,
    answers: FOURTH_QUESTION_ANSWERS,
  },
];

/** Create fresh example data whenever the Figma preview is opened. */
export function createSurveyPreview(): SurveyPreview {
  return {
    title: 'Let’s Plan the Next Team Event Together',
    description: 'We want to create team activities that everyone will enjoy – share your preferences and ideas in our survey to help us plan better experiences together.',
    endDate: '2025-09-01',
    category: 'Team activities',
    questions: PREVIEW_QUESTIONS.map(copyPreviewQuestion),
  };
}

/** Copy nested answers so selections never change the shared design data. */
function copyPreviewQuestion(question: ResultQuestion): ResultQuestion {
  return { ...question, answers: question.answers.map(answer => ({ ...answer })) };
}
