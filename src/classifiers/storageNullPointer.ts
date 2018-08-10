import { omit, filter, includes, map, pick, some } from 'lodash';
import {
  Node,
  isContractStatement,
  isFunctionDeclaration,
  isConstructorDeclaration,
  isStructDeclaration,
  isDeclarativeExpression,
  isAssignmentExpression,
  isLiteral,
  isType,
  isMappingExpression,
} from '../ast';
import { StateAstWalker, walkState } from '../ast/statefulWalk';
import { getCurrentElement, Trace } from '../ast/walk';
import {
  AnalysisResult,
  Classifier,
  ContractInformation,
  AnalysisResultOccurrence,
} from '../analyze/sourceCodeAnalyzer';

interface StorageNullPointerContext {
  currentContract?: {
    structs: string[];
    potentialUnitializedStoragePointers: Array<{
      structName: string,
      node: Node,
    }>;
  };
  occurrences: AnalysisResultOccurrence[],
}

const modifiableLibraryVariableWalker: StateAstWalker<StorageNullPointerContext> = {
  default: {
    enter: (trace: Trace, context: StorageNullPointerContext) => {
      const currentNode = getCurrentElement(trace);

      if (isContractStatement(currentNode)) {
        return {
          context: {
            ...context,
            currentContract: {
              structs: [],
              potentialUnitializedStoragePointers: [],
            }
          },
          nextState: 'insideContract'
        }
      }

      return { context };
    },
  },
  insideContract: {
    enter: (trace: Trace, context: StorageNullPointerContext) => {
      const currentNode = getCurrentElement(trace);
      const currentContract = context.currentContract;
      if (!currentContract) {
        throw new Error();
      }

      if (isFunctionDeclaration(currentNode) || isConstructorDeclaration(currentNode)) {
        return {
          context,
          nextState: 'insideFunction'
        }
      } else if (isStructDeclaration(currentNode)) {
        return {
          context: {
            ...context,
            currentContract: {
              ...currentContract,
              structs: [
                ...currentContract.structs,
                currentNode.name
              ]
            }
          },
          skipSubtree: true
        }
      }

      return { context };
    },
    leaveState: (trace: Trace, context: StorageNullPointerContext) => {
      const currentContract = context.currentContract;
      if (!currentContract) {
        throw new Error();
      }

      // Design Rationale: Struct definitions could be after functions.
      // Therefore this validation has to be done here.

      const unitializedPointers = filter(
        currentContract.potentialUnitializedStoragePointers,
        ({ structName }) =>
          includes(currentContract.structs, structName)
      );

      return {
        ...omit(context, ['currentContract']),
        occurrences: [
          ...context.occurrences,
          ...map(
            unitializedPointers,
            ({ node }): AnalysisResultOccurrence => pick(node, ['start', 'end'])
          )
        ]
      };
    },
  },
  insideFunction: {
    enter: (trace: Trace, context: StorageNullPointerContext) => {
      const currentNode = getCurrentElement(trace);
      const currentContract = context.currentContract;
      if (!currentContract) {
        throw new Error();
      }

      if (
        isDeclarativeExpression(currentNode)
        && currentNode.storage_location !== 'memory'
        && !some(trace, ({ node }) => isAssignmentExpression(node))
        && isType(currentNode.literal)
        && !isMappingExpression(currentNode.literal.literal)
      ) {
        return {
          context: {
            ...context,
            currentContract: {
              ...currentContract,
              potentialUnitializedStoragePointers: [
                ...currentContract.potentialUnitializedStoragePointers,
                {
                  structName: currentNode.literal.literal,
                  node: currentNode
                }
              ]
            }
          }
        }
      }

      return { context };
    },
  },
};

export const storageNullPointer: Classifier = {
  description: 'Checks if contract contains Storage Null-Pointers.',
  category: 'UNDERHANDED SOLIDITY',
  using: 'AST',
  check: (contractInformation: ContractInformation): AnalysisResult => {
    if (!contractInformation.ast) {
      return {
        result: 'NOT DECIDABLE',
      };
    }

    const { occurrences } = walkState<StorageNullPointerContext>(
      contractInformation.ast,
      modifiableLibraryVariableWalker,
      { occurrences: [] },
    );

    if (occurrences.length > 0) {
      return {
        result: 'FOUND',
        description: 'This contracts contains a unitialized storage-null-pointer, that can be used to alter the storage in an underhanded way.',
        occurrences,
      };
    }

    return {
      result: 'NOT FOUND',
    };
  },
};
