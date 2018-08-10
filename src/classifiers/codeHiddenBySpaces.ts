import {
  AnalysisResult,
  Classifier,
  ContractInformation,
  AnalysisResultOccurrence,
} from '../analyze/sourceCodeAnalyzer';
import { matchAll } from '../utils/regexp';
import { map } from 'lodash';

export const codeHiddenBySpaces: Classifier = {
  category: 'UNDERHANDED SOLIDITY',
  check: (contractInformation: ContractInformation): AnalysisResult => {
    if (!contractInformation.sourceCode) {
      return {
        result: 'NOT DECIDABLE',
      };
    }

    const spaceLocations = matchAll(/([\t\f ]{200,})[^\s].*$/m, contractInformation.sourceCode);

    if (spaceLocations.length > 0) {
      return {
        result: 'FOUND',
        occurrences: map(spaceLocations, (match): AnalysisResultOccurrence => ({ start: match.index, end: match.index + match[1].length })),
      };
    }

    return {
      result: 'NOT FOUND',
    };
  },
  description: 'Checks if contract tries to hide by spaces.',
  using: 'SOURCECODE',
};
