import {
  AnalysisResult,
  Classifier,
  ContractInformation,
} from '../analyze/sourceCodeAnalyzer';

const isUpperCase = (word: string) => word.toUpperCase() === word;

export const uppercaseName: Classifier = {
  category: 'INTEREST',
  check: (contractInformation: ContractInformation): AnalysisResult => {
    if (!contractInformation.name) {
      return {
        result: 'NOT DECIDABLE',
      }
    }
    if (isUpperCase(contractInformation.name)) {
      return {
        description: `The contract name '${
          contractInformation.name
          }' is completely in upper case.`,
        result: 'FOUND',
      };
    }

    return {
      result: 'NOT FOUND',
    };
  },
  description: 'Checks if the contract name is completely upper case.',
  using: 'NAME',
};
