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

export const modifiableLibraryVariable: Classifier = {
  description: 'Checks if contract contains a modifiable library variable.',
  category: 'PATTERN',
  using: 'AST',
  check: (contractInformation: ContractInformation): AnalysisResult => {
    if (!contractInformation.ast) {
      return {
        result: 'NOT DECIDABLE',
      };
    }

    const occurrences = findModifiableLibraryVariables(contractInformation.ast, false);

    if (occurrences.length > 0) {
      return {
        result: 'FOUND',
        description: 'This contract contains an used library reference, that can be modified outside the constructor.',
        occurrences,
      };
    }

    return {
      result: 'NOT FOUND',
    };
  },
};
