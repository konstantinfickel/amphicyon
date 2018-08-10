import { omit, map } from 'lodash';
import {
  Node,
  isContractStatement,
  isFunctionDeclaration,
  isConstructorDeclaration,
  isStateVariableDeclaration,
  isDeclarativeExpression,
  AST,
} from '..';
import { StateAstWalker, walkState } from '../statefulWalk';
import { getCurrentElement, Trace } from '../walk';
import { getFunctionIdentifier } from './functionIdentifiers';

interface SimilarVariableNamesContextContract {
  name: string;
  stateVariables: Record<string, Node>;
  functionVariables: Record<string, Record<string, Node>>;
  is: string[];
}

interface SimilarVariableNamesContext {
  contracts: Record<string, SimilarVariableNamesContextContract>;
  currentContract?: SimilarVariableNamesContextContract;
  currentFunction?: {
    name: string;
    variables: Record<string, Node>;
  }
}

const similarVariableNamesWalker: StateAstWalker<SimilarVariableNamesContext> = {
  default: {
    enter: (trace: Trace, context: SimilarVariableNamesContext) => {
      const currentNode = getCurrentElement(trace);
      if (isContractStatement(currentNode)) {
        return {
          context: {
            ...context,
            currentContract: {
              name: currentNode.name,
              stateVariables: {},
              functionVariables: {},
              is: map(currentNode.is, parent => parent.name)
            },
          },
          nextState: 'insideContract'
        }
      }
      return { context };
    },
  },
  insideContract: {
    enter: (trace: Trace, context: SimilarVariableNamesContext) => {
      const currentNode = getCurrentElement(trace);

      if (!context.currentContract) {
        throw new Error();
      }

      if (
        isStateVariableDeclaration(currentNode)
      ) {
        return {
          context: {
            ...context,
            currentContract: {
              ...context.currentContract,
              stateVariables: {
                ...context.currentContract.stateVariables,
                [currentNode.name]: currentNode
              }
            }
          }
        };
      } else if (
        isFunctionDeclaration(currentNode)
        || isConstructorDeclaration(currentNode)
      ) {
        return {
          context: {
            ...context,
            currentFunction: {
              name: getFunctionIdentifier(currentNode, context.currentContract.name),
              variables: {},
            }
          },
          nextState: 'insideFunction'
        }
      }
      return { context };
    },
    leaveState: (trace: Trace, context: SimilarVariableNamesContext) => {
      if (!context.currentContract) {
        throw new Error();
      }

      return {
        ...omit(context, 'currentContract') as SimilarVariableNamesContext,
        contracts: {
          ...context.contracts,
          [context.currentContract.name]: context.currentContract
        }
      }
    }
  },
  insideFunction: {
    enter: (trace: Trace, context: SimilarVariableNamesContext) => {
      const currentNode = getCurrentElement(trace);

      if (!context.currentFunction) {
        throw new Error();
      }

      if (isDeclarativeExpression(currentNode)) {
        return {
          context: {
            ...omit(context, 'currentFunction') as SimilarVariableNamesContext,
            currentFunction: {
              ...context.currentFunction,
              variables: {
                ...context.currentFunction.variables,
                [currentNode.name]: currentNode,
              }
            }
          }
        }
      }

      return { context };
    },
    leaveState: (trace: Trace, context: SimilarVariableNamesContext) => {
      if (!context.currentContract || !context.currentFunction) {
        throw new Error();
      }

      return {
        ...omit(context, 'currentFunction') as SimilarVariableNamesContext,
        currentContract: {
          ...context.currentContract,
          functionVariables: {
            ...context.currentContract.functionVariables,
            [context.currentFunction.name]: context.currentFunction.variables
          }
        }
      }
    }
  },
};

export const getVariableDeclarations = (ast: AST) => walkState<SimilarVariableNamesContext>(
  ast,
  similarVariableNamesWalker,
  { contracts: {} },
).contracts;
