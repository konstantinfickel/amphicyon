import { isCallExpression } from '../ast';
import { getCurrentElement, Trace, AstWalker, walk } from '../ast/walk';
import { Node } from '../ast/node';
import {
  AnalysisResult,
  Classifier,
  ContractInformation,
  AnalysisResultOccurrence,
} from '../analyze/sourceCodeAnalyzer';
import { some, pick } from 'lodash';
import { isValueAccess } from '../ast/helpers/valueAccess';

interface UncalledExternalCallContext {
  occurrences: AnalysisResultOccurrence[];
}

const uncalledExternalCallAstWalker: AstWalker<UncalledExternalCallContext> = {
  enter: (trace: Trace, context: UncalledExternalCallContext) => {
    const currentNode: Node = getCurrentElement(trace);
    if (isValueAccess(currentNode)) {
      if (!some(trace, ({
        node,
        propertyName,
      }) => isCallExpression(node) && propertyName === 'callee')) {
        return {
          context: {
            ...context,
            occurrences: [
              ...context.occurrences,
              pick(currentNode, ['start', 'end']) as AnalysisResultOccurrence,
            ],
          },
          skipSubtree: true
        }
      }
    }
    return { context };
  },
};

export const uncalledExternalCall: Classifier = {
  description: 'Checks for external call functions that were not called..',
  category: 'UNDERHANDED SOLIDITY',
  using: 'AST',
  check: (contractInformation: ContractInformation): AnalysisResult => {
    if (!contractInformation.ast) {
      return {
        result: 'NOT DECIDABLE',
      };
    }

    const { occurrences } = walk<UncalledExternalCallContext>(
      contractInformation.ast,
      uncalledExternalCallAstWalker,
      { occurrences: [] },
    );

    if (occurrences.length > 0) {
      return {
        result: 'FOUND',
        description: 'This contract contains an uncalled call expression.',
        occurrences,
      };
    }

    return {
      result: 'NOT FOUND',
    };
  },
};
