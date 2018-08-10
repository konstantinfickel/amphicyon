import { map, fromPairs, mapValues, isNil, reduce } from 'lodash';
import { BayesClassifiers, BayesAmounts, Bayes } from '.';
import { ContractAnalysisResult, AnalysisResults } from '../analyze';

export const buildEmptyClassifiers = (classifierNames: string[]): Bayes => ({
  amounts: {
    harmless: 0,
    honeypot: 0
  },
  classifiers: fromPairs(map(classifierNames, classifierName => [classifierName, {
    honeypot: {
      ifFound: 0,
      ifNotFound: 0,
    },
    harmless: {
      ifFound: 0,
      ifNotFound: 0,
    },
  }] as [string, BayesAmounts])) as BayesClassifiers
});

const oneIfTrue = (value: boolean) => value ? 1 : 0;

const generateCounter = (analysisResults: AnalysisResults, manualAnalysis: Record<string, boolean>) =>
  (filterFunction: (isHoneypot: boolean, analysisResult: ContractAnalysisResult) => boolean) =>
    reduce(
      analysisResults,
      (sumOfPrevious: number, result: ContractAnalysisResult, address: string): number => {
        if (!isNil(manualAnalysis[address]) && filterFunction(manualAnalysis[address], result)) {
          return sumOfPrevious + 1;
        }
        return sumOfPrevious;
      },
      0
    );

export const buildFromAnalysisResults = (
  analysisResults: AnalysisResults,
  manualAnalysis: Record<string, boolean>,
  classifierNames: string[],
): Bayes => {
  const counter = generateCounter(analysisResults, manualAnalysis);
  return {
    amounts: {
      honeypot: counter((isHoneypot) => isHoneypot),
      harmless: counter((isHoneypot) => !isHoneypot)
    },
    classifiers: fromPairs(map(classifierNames, classifierName => [classifierName, {
      honeypot: {
        ifFound: counter((isHoneypot, result) => isHoneypot && result[classifierName] === true),
        ifNotFound: counter((isHoneypot, result) => isHoneypot && result[classifierName] === false),
      },
      harmless: {
        ifFound: counter((isHoneypot, result) => !isHoneypot && result[classifierName] === true),
        ifNotFound: counter((isHoneypot, result) => !isHoneypot && result[classifierName] === false),
      },
    }] as [string, BayesAmounts])) as BayesClassifiers
  }
};

export const addPointToClassifiers = (
  { classifiers, amounts }: Bayes,
  isHoneypot: boolean,
  analysisResults: ContractAnalysisResult
): Bayes => {
  return {
    amounts: {
      honeypot: amounts.honeypot + oneIfTrue(isHoneypot),
      harmless: amounts.harmless + oneIfTrue(!isHoneypot)
    },
    classifiers: mapValues(classifiers, ({ honeypot, harmless }: BayesAmounts, classifierName: string) => {
      const analysisResult: boolean | null = analysisResults[classifierName];
      if (isHoneypot) {
        return {
          honeypot: {
            ifFound: honeypot.ifFound + oneIfTrue(analysisResult === true),
            ifNotFound: honeypot.ifNotFound + oneIfTrue(analysisResult === false)
          },
          harmless
        }
      } else {
        return {
          honeypot,
          harmless: {
            ifFound: harmless.ifFound + oneIfTrue(analysisResult === true),
            ifNotFound: harmless.ifNotFound + oneIfTrue(analysisResult === false)
          }
        }
      }
    }) as any as BayesClassifiers
  }
};
