import { intersectionBy, forEach, toPairs, pick, map } from 'lodash';
import {
  AnalysisResult,
  Classifier,
  ContractInformation,
  AnalysisResultOccurrence,
} from '../analyze/sourceCodeAnalyzer';
import { getVariableDeclarations } from '../ast/helpers/variables';

export const shadowedParentVariable: Classifier = {
  description: 'Checks if state variable by parent contract is shadowed.',
  category: 'UNDERHANDED SOLIDITY',
  using: 'AST',
  check: (contractInformation: ContractInformation): AnalysisResult => {
    if (!contractInformation.ast) {
      return {
        result: 'NOT DECIDABLE',
      };
    }

    const contracts = getVariableDeclarations(contractInformation.ast);

    const occurrences: AnalysisResultOccurrence[] = [];

    forEach(contracts, contract => {
      forEach(contract.is, parent => {
        const parentContract = contracts[parent];
        if (!parentContract) {
          return;
        }

        const shadowedVariables = intersectionBy(
          toPairs(parentContract.stateVariables),
          toPairs(contract.stateVariables),
          ([name]) => name
        );

        occurrences.push(...map(shadowedVariables, ([, node]): AnalysisResultOccurrence => pick(node, ['start', 'end'])));
      })
    });

    if (occurrences.length > 0) {
      return {
        result: 'FOUND',
        occurrences
      }
    }

    return {
      result: 'NOT FOUND',
    };
  },
};
