import {
  isIdentifier,
  isMemberExpression,
  Node,
  isContractStatement,
  isFunctionDeclaration,
  isConstructorDeclaration,
  isStateVariableDeclaration,
  isCallExpression,
  isAssignmentExpression,
  isType,
  AST,
} from '../ast';
import {
  AnalysisResult,
  Classifier,
  ContractInformation,
} from '../analyze/sourceCodeAnalyzer';
import { findModifiableLibraryVariables } from '../ast/helpers/modifiableLibraries';

export const preventableTransfers: Classifier = {
  description: 'Checks if contract contains a library call, that can prevent transfers by reverting.',
  category: 'PATTERN',
  using: 'AST',
  check: (contractInformation: ContractInformation): AnalysisResult => {
    if (!contractInformation.ast) {
      return {
        result: 'NOT DECIDABLE',
      };
    }

    const occurrences = findModifiableLibraryVariables(contractInformation.ast, true);

    if (occurrences.length > 0) {
      return {
        result: 'FOUND',
        description: 'This contract contains a library call, that might prevent transfers by reverting.',
        occurrences,
      };
    }

    return {
      result: 'NOT FOUND',
    };
  },
};
