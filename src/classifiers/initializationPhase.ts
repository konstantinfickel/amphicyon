import {
  isIdentifier,
  isMemberExpression,
  Node,
  isContractStatement,
  isFunctionDeclaration,
  isStateVariableDeclaration,
  isCallExpression,
  isAssignmentExpression,
  isType,
  isModifierDeclaration,
  isBlockStatement,
} from '../ast';
import {
  AnalysisResult,
  Classifier,
  ContractInformation,
  AnalysisResultOccurrence,
} from '../analyze/sourceCodeAnalyzer';
import { getCurrentElement, Trace, walk } from '../ast/walk';
import { uniq, intersection, pick, omit, isEmpty, map, keys, some } from 'lodash';
import { StateAstWalker, walkState } from '../ast/statefulWalk';
import { statementOnlyContainsIf, isRevertingIfExpression } from '../ast/helpers/onlyContainsIfStatement';

interface InitializationPhaseContext {
  contract?: {
    booleanStateVariables: Record<string, Node>;
    variableModifications: string[];
    blockingVariables: string[];
    name: string;
  },
  occurrences: AnalysisResultOccurrence[],
}

const getVariables = (node: Node) => walk<string[]>(node, {
  enter: (trace: Trace, context: string[]) => {
    const currentNode = getCurrentElement(trace);
    if (
      isIdentifier(currentNode)
      && !some(trace, ({ node }) => isCallExpression(node) || isMemberExpression(node))
    ) {
      return {
        context: [
          ...context,
          currentNode.name
        ]
      }
    }

    return { context };
  }
}, [] as string[]);

const initializationPhaseWalker: StateAstWalker<InitializationPhaseContext> = {
  default: {
    enter: (trace: Trace, context: InitializationPhaseContext) => {
      const currentNode = getCurrentElement(trace);
      if (isContractStatement(currentNode)) {
        return {
          context: {
            ...context,
            contract: {
              booleanStateVariables: {},
              variableModifications: [],
              blockingVariables: [],
              name: currentNode.name,
            }
          },
          nextState: 'insideContract'
        };
      }
      return { context };
    },
  },
  insideContract: {
    enter: (trace: Trace, context: InitializationPhaseContext) => {
      const currentNode = getCurrentElement(trace);
      if (!context.contract) {
        throw new Error();
      }

      if (
        isStateVariableDeclaration(currentNode)
        && isType(currentNode.literal)
        && currentNode.literal.literal === 'bool'
      ) {
        return {
          context: {
            ...context,
            contract: {
              ...context.contract,
              booleanStateVariables: {
                ...context.contract.booleanStateVariables,
                [currentNode.name]: currentNode,
              }
            }
          }
        };
      } else if (
        isFunctionDeclaration(currentNode)
        || isModifierDeclaration(currentNode)
      ) {
        if (isBlockStatement(currentNode.body)) {
          const condition = statementOnlyContainsIf(currentNode.body);
          if (condition) {
            const newBlockingVariables = getVariables(condition);

            if (!isEmpty(newBlockingVariables)) {
              return {
                context: {
                  ...context,
                  contract: {
                    ...context.contract,
                    blockingVariables: uniq([
                      ...context.contract.blockingVariables,
                      ...newBlockingVariables,
                    ])
                  }
                },
                nextState: 'insideFunction'
              };
            }
          }
        }

        return {
          context,
          nextState: 'insideFunction'
        }
      }

      return { context };
    },
    leaveState: (trace: Trace, context: InitializationPhaseContext) => {
      const contextContract = context.contract;
      if (!contextContract) {
        throw new Error();
      }

      const modifiableBlockingVariables = intersection(
        contextContract.blockingVariables,
        keys(contextContract.booleanStateVariables),
        contextContract.variableModifications
      );

      if (!isEmpty(modifiableBlockingVariables)) {
        return {
          ...(omit(context, 'contract') as InitializationPhaseContext),
          occurrences: [
            ...context.occurrences,
            ...map(modifiableBlockingVariables, (variable: string): AnalysisResultOccurrence => pick(
              contextContract.booleanStateVariables[variable],
              ['start', 'end']
            )),
          ]
        }
      }

      return omit(context, 'contract') as InitializationPhaseContext;
    }
  },
  insideFunction: {
    enter: (trace: Trace, context: InitializationPhaseContext) => {
      const currentNode = getCurrentElement(trace);

      if (!context.contract) {
        throw new Error();
      }

      const condition = isRevertingIfExpression(currentNode);
      if (condition) {
        const newBlockingVariables = getVariables(condition);

        if (!isEmpty(newBlockingVariables)) {
          return {
            context: {
              ...context,
              contract: {
                ...context.contract,
                blockingVariables: uniq([
                  ...context.contract.blockingVariables,
                  ...newBlockingVariables,
                ])
              }
            }
          };
        }
      } else if (isAssignmentExpression(currentNode) && isIdentifier(currentNode.left)) {
        return {
          context: {
            ...context,
            contract: {
              ...context.contract,
              variableModifications: [
                ...context.contract.variableModifications,
                currentNode.left.name
              ]
            }
          },
          skipSubtree: true
        };
      }

      return { context };
    },
  },
};

export const initializationPhase: Classifier = {
  description: 'Checks if contract contains a modifiable variable that stops send-transactions.',
  category: 'PATTERN',
  using: 'AST',
  check: (contractInformation: ContractInformation): AnalysisResult => {
    if (!contractInformation.ast) {
      return {
        result: 'NOT DECIDABLE',
      };
    }

    const occurrences = walkState<InitializationPhaseContext>(
      contractInformation.ast,
      initializationPhaseWalker,
      { occurrences: [] },
    ).occurrences;

    if (occurrences.length > 0) {
      return {
        result: 'FOUND',
        description: 'This contract contains a boolean variable that is able to lock send-transactions.',
        occurrences,
      };
    }

    return {
      result: 'NOT FOUND',
    };
  },
};
