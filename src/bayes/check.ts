import { Bayes, BayesAmounts } from '.';
import { map, reduce, Dictionary } from 'lodash';
import { AnalysisResults, ContractAnalysisResult } from '../analyze';

const multiply = (a: number, b: number) => a * b;

const calculateProbability = (bayes: Bayes, analysisResults: ContractAnalysisResult, forType: 'honeypot' | 'harmless'): number =>
  reduce(
    map(
      bayes.classifiers,
      (amounts: BayesAmounts, classifierName: string): number => {
        if (amounts[forType].ifFound + amounts[forType].ifNotFound === 0) {
          return 1;
        }
        if (analysisResults[classifierName] === true) {
          if (amounts[forType].ifFound + amounts[forType].ifNotFound === 0) { }
          return amounts[forType].ifFound / (amounts[forType].ifFound + amounts[forType].ifNotFound);
        } else if (analysisResults[classifierName] === false) {
          return amounts[forType].ifNotFound / (amounts[forType].ifFound + amounts[forType].ifNotFound);
        }
        return 1;
      }),
    multiply as any,
    bayes.amounts[forType] / (bayes.amounts.harmless + bayes.amounts.honeypot)
  );

export const classifyContract = (bayes: Bayes, analysisResult: ContractAnalysisResult): number => {
  const probabilityOfHoneypot = calculateProbability(bayes, analysisResult, 'honeypot');
  const probabilityOfHarmless = calculateProbability(bayes, analysisResult, 'harmless');

  if (probabilityOfHoneypot === 0) {
    return 0;
  }

  return probabilityOfHarmless === 0
    ? Number.POSITIVE_INFINITY
    : probabilityOfHoneypot / probabilityOfHarmless;
};
