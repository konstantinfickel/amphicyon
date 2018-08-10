import {
  AnalysisResult,
  Classifier,
  ContractInformation,
} from '../analyze/sourceCodeAnalyzer';
import { reduce, toPairs, filter } from 'lodash';
import { SmartContractTransaction } from '../crawler/etherscan';

export const honeypotLatched: Classifier = {
  category: 'FOLLOW-UP',
  check: (contractInformation: ContractInformation): AnalysisResult => {
    if (!contractInformation.etherscanDetails) {
      return {
        result: 'NOT DECIDABLE',
      };
    }

    const valueSentFromAddresses: Array<[string, number]> = toPairs(reduce(
      contractInformation.etherscanDetails.transactions,
      (previous, { value, from, type }: SmartContractTransaction) => ({
        ...previous,
        [from]: previous[from] ? value + previous[from] : value,
      }),
      {} as Record<string, number>
    ));

    const significantInflow = filter(valueSentFromAddresses, ([, value]) => value > 0.1);

    if (
      contractInformation.etherscanDetails.transactionCount < 10
      && Math.abs(contractInformation.etherscanDetails.balance) < 0.05
      && significantInflow.length >= 2
      && significantInflow.length <= 5
    ) {
      return {
        result: 'FOUND',
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

