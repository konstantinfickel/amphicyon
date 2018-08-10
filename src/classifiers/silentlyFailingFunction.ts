import {
  isModifierDeclaration,
  isFunctionDeclaration,
  isBlockStatement,
  Node
} from '../ast';
import {
  AnalysisResult,
  Classifier,
  ContractInformation,
  AnalysisResultOccurrence,
} from '../analyze/sourceCodeAnalyzer';
import { getCurrentElement, Trace, walk, AstWalker } from '../ast/walk';
import { pick } from 'lodash';
import { statementOnlyContainsIf } from '../ast/helpers/onlyContainsIfStatement';

interface SilentlyFailingFunctionContext {
  occurrences: AnalysisResultOccurrence[];
}

const silentlyFailingFunctionAstWalker: AstWalker<SilentlyFailingFunctionContext> = {
  enter: (trace: Trace, context: SilentlyFailingFunctionContext) => {
    const currentNode: Node = getCurrentElement(trace);

    if (
      (isModifierDeclaration(currentNode) || isFunctionDeclaration(currentNode))
      && isBlockStatement(currentNode.body)
      && statementOnlyContainsIf(currentNode.body)
    ) {
      return {
        context: {
          occurrences: [
            ...context.occurrences,
            pick(currentNode, ['start', 'end']) as AnalysisResultOccurrence
          ]
        },
        skipSubtree: true
      }
    }
    return { context };
  },
};

export const silentlyFailingFunction: Classifier = {
  description: 'Check if contract includes functions or modifiers that fail silently.',
  category: 'PATTERN',
  using: 'AST',
  check: (contractInformation: ContractInformation): AnalysisResult => {
    if (!contractInformation.ast) {
      return {
        result: 'NOT DECIDABLE',
      };
    }

    const occurrences = walk<SilentlyFailingFunctionContext>(
      contractInformation.ast,
      silentlyFailingFunctionAstWalker,
      { occurrences: [] },
    ).occurrences;

    if (occurrences.length > 0) {
      return {
        result: 'FOUND',
        description: 'This contract contains functions that fail silently.',
        occurrences,
      };
    }

    return {
      result: 'NOT FOUND',
    };
  },
};
