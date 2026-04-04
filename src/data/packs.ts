export interface Question {
  segmentA: string;
  segmentB: string;
  segmentC: string;
}

export interface Pack {
  mode: string;
  label: string;
  createdAt: number;
  answers: string[];
  questions: Question[];
  imageAnswers: any[];
  imageQuestions: any[];
}

export const packs: Pack[] = [];
