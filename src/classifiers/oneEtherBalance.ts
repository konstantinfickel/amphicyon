import {
  AnalysisResult,
  Classifier,
  ContractInformation,
} from '../analyze/sourceCodeAnalyzer';

export const oneEtherBalance: Classifier = {
  category: 'INTEREST',
  check: (contractInformation: ContractInformation): AnalysisResult => {
    if (!contractInformation.etherscanDetails) {
      return {
        result: 'NOT DECIDABLE',
      };
    }

    if (Math.abs(contractInformation.etherscanDetails.balance - 1) < 0.09) {
      return {
        result: 'FOUND',
        description: `With a balance of ${
          contractInformation.etherscanDetails.balance
          } ether, the contract grabs the attention from users reading the verified contract list.`,
      };
    }

    return {
      result: 'NOT FOUND',
    };
  },
  description:
    'Checks if the balance of the contract is approximately one ether.',
  using: 'ETHERSCAN',
};
