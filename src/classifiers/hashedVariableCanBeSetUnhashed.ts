import { omit, pick, intersection, keys, isEmpty, map, some } from 'lodash';
import {
  isIdentifier,
  Node,
  isContractStatement,
  isFunctionDeclaration,
  isStateVariableDeclaration,
  isCallExpression,
  isAssignmentExpression,
  isType,
} from '../ast';
import { StateAstWalker, walkState } from '../ast/statefulWalk';
import { getCurrentElement, Trace, walk } from '../ast/walk';
import {
  AnalysisResult,
  Classifier,
  ContractInformation,
  AnalysisResultOccurrence,
} from '../analyze/sourceCodeAnalyzer';

const containsHashCall = (node: Node): boolean => walk<boolean>(
  node,
  {
    enter: (trace: Trace, context: boolean) => {
      const currentNode = getCurrentElement(trace);
      if (context) {
        return {
          context,
          skipSubtree: true,
        }
      } else if (
        isIdentifier(currentNode)
        && (currentNode.name === 'keccak256' || currentNode.name === 'sha3')
        && some(trace, ({ node }) => isCallExpression(node))
      ) {
        return {
          context: true,
          skipSubtree: true
        };
      }
      return { context };
    }
  },
  false
)

interface HashedVariablesSetDirectlyContext {
  currentContract?: {
    bytes32stateVariables: Record<string, Node>;
    hashSetVariables: string[];
    directlySetVariables: string[];
  },
  occurrences: AnalysisResultOccurrence[];
};

const hashedVariableCanBeSetUnhashedWalker: StateAstWalker<HashedVariablesSetDirectlyContext> = {
  default: {
    enter: (trace: Trace, context: HashedVariablesSetDirectlyContext) => {
      const currentNode = getCurrentElement(trace);
      if (isContractStatement(currentNode)) {
        return {
          context: {
            ...context,
            currentContract: {
              bytes32stateVariables: {},
              hashSetVariables: [],
              directlySetVariables: []
            }
          },
          nextState: 'insideContract'
        };
      }
      return { context };
    },

  },
  insideContract: {
    enter: (trace: Trace, context: HashedVariablesSetDirectlyContext) => {
      const currentNode = getCurrentElement(trace);

      if (!context.currentContract) {
        throw new Error();
      }

      if (
        isStateVariableDeclaration(currentNode)
        && isType(currentNode.literal)
        && currentNode.literal.literal === 'bytes32'
      ) {
        return {
          context: {
            ...context,
            currentContract: {
              ...context.currentContract,
              bytes32stateVariables: {
                ...context.currentContract.bytes32stateVariables,
                [currentNode.name]: currentNode,
              }
            }
          }
        };
      } else if (isFunctionDeclaration(currentNode)) {
        return {
          context,
          nextState: 'insideFunction'
        }
      }
      return { context };
    },
    leaveState: (trace: Trace, context: HashedVariablesSetDirectlyContext) => {
      const contractContext = context.currentContract;
      if (!contractContext) {
        throw new Error();
      }

      const modifiedLibraryVariables = intersection(
        keys(contractContext.bytes32stateVariables),
        contractContext.directlySetVariables,
        contractContext.hashSetVariables
      );

      if (!isEmpty(modifiedLibraryVariables)) {
        return {
          ...omit(context, 'currentContract') as HashedVariablesSetDirectlyContext,
          occurrences: [
            ...context.occurrences,
            map(modifiedLibraryVariables, (variable: string): AnalysisResultOccurrence => pick(
              contractContext.bytes32stateVariables[variable],
              ['start', 'end']
            ))
          ]
        } as HashedVariablesSetDirectlyContext;
      }

      return omit(context, 'currentContract') as HashedVariablesSetDirectlyContext;
    }
  },
  insideFunction: {
    enter: (trace: Trace, context: HashedVariablesSetDirectlyContext) => {
      const currentNode = getCurrentElement(trace);
      const contractContext = context.currentContract;
      if (!contractContext) {
        throw new Error();
      }

      if (isAssignmentExpression(currentNode) && isIdentifier(currentNode.left)) {
        if (containsHashCall(currentNode.right)) {
          return {
            context: {
              ...context,
              currentContract: {
                ...contractContext,
                hashSetVariables: [
                  ...contractContext.hashSetVariables,
                  currentNode.left.name,
                ]
              }
            }
          }
        }

        return {
          context: {
            ...context,
            currentContract: {
              ...contractContext,
              directlySetVariables: [
                ...contractContext.directlySetVariables,
                currentNode.left.name,
              ]
            }
          }
        };
      }

      return { context };
    },
  }
};

export const hashedVariableCanBeSetUnhashed: Classifier = {
  description: 'Checks if contract contains a modifiable library variable.',
  category: 'PATTERN',
  using: 'AST',
  check: (contractInformation: ContractInformation): AnalysisResult => {
    if (!contractInformation.ast) {
      return {
        result: 'NOT DECIDABLE',
      };
    }

    const { occurrences } = walkState<HashedVariablesSetDirectlyContext>(
      contractInformation.ast,
      hashedVariableCanBeSetUnhashedWalker,
      { occurrences: [] },
    );

    if (occurrences.length > 0) {
      return {
        result: 'FOUND',
        description: 'This contract contains a bytes32, that is set both with and without hashing the value.',
        occurrences,
      };
    }

    return {
      result: 'NOT FOUND',
    };
  },
};
