import { omit, pick, intersection, toPairs, reduce, keys, isEmpty, map, first } from 'lodash';
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
} from '../../ast';
import { StateAstWalker, walkState } from '../../ast/statefulWalk';
import { getCurrentElement, Trace, walk } from '../../ast/walk';
import {
  AnalysisResultOccurrence,
} from '../../analyze/sourceCodeAnalyzer';
import { getFunctionIdentifier } from '../../ast/helpers/functionIdentifiers';
import { isMappingExpression, isLiteral } from '../node';

const isPotentialAddressType = (type: string) => !/^((uint|int)[\d]*|bool|(u)?fixed|bytes[\d]*|string)(\[\])?$/.test(type)

interface ModifiableLibraryVariableContextFunction {
  accessingLibraryVariables: string[];
  containsCallExpression: boolean;
  identifier: string;
};

interface ModifiableLibraryVariableContext {
  contract?: {
    stateVariables: Record<string, Node>;
    libraryVariables: string[];
    variableModifications: string[];
    functions: Record<string, ModifiableLibraryVariableContextFunction>;
    name: string;
  },
  currentFunction?: ModifiableLibraryVariableContextFunction;
  occurrences: AnalysisResultOccurrence[],
}

const getLibraryName = (node: Node, insideMemberExpression: boolean = false): string | null => walk<string | null>(node, {
  enter: (trace: Trace, context: string | null) => {
    const currentNode = getCurrentElement(trace);
    if (context != null) {
      return {
        context,
        skipSubtree: true,
      };
    } else if (
      isMemberExpression(currentNode)
      && !(
        isIdentifier(currentNode.property)
        && (
          currentNode.property.name === 'transfer'
          || currentNode.property.name === 'send'
          || currentNode.property.name === 'call'
        )
      )
    ) {
      const updatedContext = getLibraryName(currentNode.object, true);

      return {
        context: updatedContext,
        skipSubtree: true,
      };
    } else if (insideMemberExpression && isIdentifier(currentNode)) {
      return {
        context: currentNode.name,
        skipSubtree: true,
      }
    }
    return {
      context,
    };
  }
}, null);

export const containsTransferExpression = (node: Node, checkForCall: boolean = true): boolean => walk<boolean>(node, {
  enter: (trace: Trace, context: boolean) => {
    const currentNode = getCurrentElement(trace);
    if (context) {
      return {
        context,
        skipSubtree: true,
      };
    } else if (
      isMemberExpression(currentNode)
      && (
        isIdentifier(currentNode.property)
        && (
          currentNode.property.name === 'transfer'
          || currentNode.property.name === 'send'
          || (checkForCall && currentNode.property.name === 'call')
        )
      )
    ) {
      return {
        context: true,
        skipSubtree: true,
      };
    }
    return {
      context,
    };
  }
}, false);


const modifiableLibraryVariableWalker: (requireAdditionalCall: boolean) => StateAstWalker<ModifiableLibraryVariableContext> = (requireAdditionalCall: boolean = false) => ({
  default: {
    enter: (trace: Trace, context: ModifiableLibraryVariableContext) => {
      const currentNode = getCurrentElement(trace);
      if (isContractStatement(currentNode)) {
        return {
          context: {
            ...context,
            contract: {
              stateVariables: {},
              libraryVariables: [],
              variableModifications: [],
              name: currentNode.name,
              functions: {}
            }
          },
          nextState: 'insideContract'
        };
      }
      return { context };
    },
  },
  insideContract: {
    enter: (trace: Trace, context: ModifiableLibraryVariableContext) => {
      const currentNode = getCurrentElement(trace);

      if (!context.contract) {
        throw new Error();
      }

      if (
        isStateVariableDeclaration(currentNode)
        && isType(currentNode.literal)
        && !isMappingExpression(currentNode.literal.literal)
        && isPotentialAddressType(currentNode.literal.literal)
      ) {
        return {
          context: {
            ...context,
            contract: {
              ...context.contract,
              stateVariables: {
                ...context.contract.stateVariables,
                [currentNode.name]: currentNode,
              }
            }
          }
        };
      } else if (
        (isFunctionDeclaration(currentNode)
          && currentNode.name === context.contract.name)
        || isConstructorDeclaration(currentNode)
      ) {
        return {
          context,
          nextState: 'insideConstructorFunction'
        }
      } else if (isFunctionDeclaration(currentNode)) {
        return {
          context: {
            ...context,
            currentFunction: {
              accessingLibraryVariables: [],
              containsCallExpression: false,
              identifier: getFunctionIdentifier(currentNode, context.contract.name)
            }
          },
          nextState: 'insideFunction'
        }
      }
      return { context };
    },
    leaveState: (trace: Trace, context: ModifiableLibraryVariableContext) => {
      const contractContext = context.contract;
      if (!contractContext) {
        throw new Error();
      }

      const libraryVariables = intersection(
        contractContext.libraryVariables,
        keys(contractContext.stateVariables),
      );

      const modifiedLibraryVariables = intersection(
        libraryVariables,
        contractContext.variableModifications
      );

      if (!isEmpty(modifiedLibraryVariables) && !requireAdditionalCall) {
        return {
          ...omit(context, 'contract') as ModifiableLibraryVariableContext,
          occurrences: [
            ...context.occurrences,
            ...map(modifiedLibraryVariables, (variable: string): AnalysisResultOccurrence => pick(
              contractContext.stateVariables[variable],
              ['start', 'end']
            ))
          ]
        } as ModifiableLibraryVariableContext;
      }

      if (!isEmpty(libraryVariables) && requireAdditionalCall) {
        const preventableCalls: AnalysisResultOccurrence[] = reduce(
          toPairs(contractContext.functions) as Array<[string, ModifiableLibraryVariableContextFunction]>,
          (
            previousOccurrences: AnalysisResultOccurrence[],
            [, functionInformation]: [string, ModifiableLibraryVariableContextFunction]
          ) => {
            const calledLibraryVariables = intersection(
              functionInformation.accessingLibraryVariables,
              libraryVariables
            );

            if (
              functionInformation.containsCallExpression
              && !isEmpty(calledLibraryVariables)
            ) {
              return [
                ...previousOccurrences,
                ...map(calledLibraryVariables, (variable: string): AnalysisResultOccurrence => pick(
                  contractContext.stateVariables[variable],
                  ['start', 'end']
                ))
              ]
            }
            return previousOccurrences;
          },
          [] as AnalysisResultOccurrence[]
        );

        if (!isEmpty(preventableCalls)) {
          return {
            ...omit(context, 'contract') as ModifiableLibraryVariableContext,
            occurrences: [
              ...context.occurrences,
              ...preventableCalls
            ]
          } as ModifiableLibraryVariableContext;
        }
      }

      return omit(context, 'contract') as ModifiableLibraryVariableContext;
    }
  },
  insideConstructorFunction: {},
  insideFunction: {
    enter: (trace: Trace, context: ModifiableLibraryVariableContext) => {
      const currentNode = getCurrentElement(trace);
      const currentContract = context.contract;
      const currentFunction = context.currentFunction;

      if (!currentContract || !currentFunction) {
        throw new Error();
      }


      if (isCallExpression(currentNode)) {
        if (containsTransferExpression(currentNode)) {
          return {
            context: {
              ...context,
              currentFunction: {
                ...currentFunction,
                containsCallExpression: true,
              }
            },
            skipSubtree: true
          };
        }

        const called = getLibraryName(currentNode);
        if (called != null) {
          return {
            context: {
              ...context,
              contract: {
                ...currentContract,
                libraryVariables: [
                  ...currentContract.libraryVariables,
                  called,
                ]
              },
              currentFunction: {
                ...currentFunction,
                accessingLibraryVariables: [
                  ...currentFunction.accessingLibraryVariables,
                  called
                ]
              }
            },
            skipSubtree: true
          };
        }
      } else if (isAssignmentExpression(currentNode) && isIdentifier(currentNode.left)) {
        return {
          context: {
            ...context,
            contract: {
              ...currentContract,
              variableModifications: [
                ...currentContract.variableModifications,
                currentNode.left.name
              ]
            }
          },
          skipSubtree: true
        };
      }

      return { context };
    },
    leaveState: (trace: Trace, context: ModifiableLibraryVariableContext) => {
      const currentFunction = context.currentFunction;
      const currentContract = context.contract;
      if (!currentFunction || !currentContract) {
        throw new Error();
      }

      return {
        ...omit(context, 'currentFunction') as ModifiableLibraryVariableContext,
        contract: {
          ...currentContract,
          functions: {
            ...currentContract.functions,
            [currentFunction.identifier]: currentFunction
          }
        }
      };
    }
  },
});

export const findModifiableLibraryVariables = (ast: AST, requireAdditionalCall: boolean = false) => walkState<ModifiableLibraryVariableContext>(
  ast,
  modifiableLibraryVariableWalker(requireAdditionalCall),
  { occurrences: [] },
).occurrences;
