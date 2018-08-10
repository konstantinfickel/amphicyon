import { omit, pick, includes } from 'lodash';
import {
  isBinaryExpression,
  isIdentifier,
  isMemberExpression,
  isThisExpression,
  Node,
} from '../ast';
import { StateAstWalker, walkState } from '../ast/statefulWalk';
import { getCurrentElement, Trace, walk } from '../ast/walk';
import {
  AnalysisResult,
  Classifier,
  ContractInformation,
  AnalysisResultOccurrence,
} from '../analyze/sourceCodeAnalyzer';

interface ComparingValueAndBalanceContext {
  occurrences: AnalysisResultOccurrence[];
  found?: Record<string, boolean>;
}

const isMsgValueNode = (currentNode: Node): boolean => {
  if (isMemberExpression(currentNode)) {
    const objectNode = currentNode.object;
    const propertyNode = currentNode.property;

    if (
      isIdentifier(objectNode)
      && isIdentifier(propertyNode)
      && objectNode.name === 'msg'
      && propertyNode.name === 'value'
    ) {
      return true;
    }
  }
  return false;
};

const isThisBalanceNode = (currentNode: Node): boolean => {
  if (isMemberExpression(currentNode)) {
    const propertyNode = currentNode.property;

    if (isIdentifier(propertyNode) && propertyNode.name === 'balance') {
      const objectNode = currentNode.object;

      return walk(objectNode, {
        enter: (trace: Trace, context: boolean) =>
          isThisExpression(getCurrentElement(trace))
            ? { context: true, skipSubtree: true }
            : { context, skipSubtree: context },
      }, false as boolean);
    }
  }
  return false;
};

const comparingValueAndBalanceAstWalker: StateAstWalker<ComparingValueAndBalanceContext> = {
  default: {
    enter: (trace: Trace, context: ComparingValueAndBalanceContext) => {
      const currentNode = getCurrentElement(trace);
      if (isBinaryExpression(currentNode) && includes(
        ['<=', '<', '>', ">=", '==', '!=']
        , currentNode.operator
      )) {
        return {
          context: {
            ...context,
            found: {
              'msg.value': false,
              'this.balance': false,
            },
          },
          nextState: 'insideBinaryExpression',
        };
      }
      return { context };
    },
  },
  insideBinaryExpression: {
    enter: (trace: Trace, context: ComparingValueAndBalanceContext) => {
      const currentNode = getCurrentElement(trace);
      if (isMsgValueNode(currentNode)) {
        return {
          context: {
            ...context,
            found: {
              ...context.found,
              'msg.value': true,
            },
          },
          skipSubtree: true,
        };
      }

      if (isThisBalanceNode(currentNode)) {
        return {
          context: {
            ...context,
            found: {
              ...context.found,
              'this.balance': true,
            },
          },
          skipSubtree: true,
        };
      }

      return { context };
    },
    leaveState: (trace: Trace, context: ComparingValueAndBalanceContext) => {
      const currentNode = getCurrentElement(trace);

      if (context.found && context.found['msg.value'] && context.found['this.balance']) {
        return {
          ...omit(context, 'found'),
          occurrences: [
            ...context.occurrences,
            pick(currentNode, ['start', 'end']) as AnalysisResultOccurrence,
          ],
        };
      } else {
        return omit(context, 'found');
      }
    },
  },
};

export const comparingValueAndBalance: Classifier = {
  description: 'Checks if the contract name is completely upper case.',
  category: 'UNDERHANDED SOLIDITY',
  using: 'AST',
  check: (contractInformation: ContractInformation): AnalysisResult => {
    if (!contractInformation.ast) {
      return {
        result: 'NOT DECIDABLE',
      };
    }

    const { occurrences } = walkState<ComparingValueAndBalanceContext>(
      contractInformation.ast,
      comparingValueAndBalanceAstWalker,
      { occurrences: [] },
    );

    if (occurrences.length > 0) {
      return {
        result: 'FOUND',
        description: 'This contract contains a comparison between msg.value and msg.balance.',
        occurrences,
      };
    }

    return {
      result: 'NOT FOUND',
    };
  },
};
