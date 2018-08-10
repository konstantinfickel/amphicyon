import { omit, pick, intersection } from 'lodash';
import {
  isContractStatement,
  isFunctionDeclaration,
  isInterfaceStatement,
} from '../ast';
import { StateAstWalker, walkState } from '../ast/statefulWalk';
import { getCurrentElement, Trace } from '../ast/walk';
import {
  AnalysisResult,
  Classifier,
  ContractInformation,
  AnalysisResultOccurrence,
} from '../analyze/sourceCodeAnalyzer';
import { getFunctionIdentifier } from '../ast/helpers/functionIdentifiers';

interface TokenInterfaceContext {
  currentContract?: {
    functionIdentifiers: string[];
    name: string;
  };
  occurrences: AnalysisResultOccurrence[],
}

const erc20TokenFunctions = [
  'balanceOf(address)',
  'allowance(address,address)',
  'transfer(address,uint256)',
  'approve(address,uint256)',
  'transferFrom(from,to,tokens)'
];

const erc223TokenFunctions = [
  'balanceOf(address)',
  'transfer(address,uint256)',
  'transfer(address,uint256,bytes)',
  'transferFrom(address,address,uint256)'
];

const containsTokenInterfaceWalker: StateAstWalker<TokenInterfaceContext> = {
  default: {
    enter: (trace: Trace, context: TokenInterfaceContext) => {
      const currentNode = getCurrentElement(trace);

      if (isContractStatement(currentNode) || isInterfaceStatement(currentNode)) {
        return {
          context: {
            ...context,
            currentContract: {
              functionIdentifiers: [],
              name: currentNode.name,
            }
          },
          nextState: 'insideContract'
        }
      }

      return { context };
    },
  },
  insideContract: {
    enter: (trace: Trace, context: TokenInterfaceContext) => {
      const currentNode = getCurrentElement(trace);
      const currentContract = context.currentContract;
      if (!currentContract) {
        throw new Error();
      }

      if (
        isFunctionDeclaration(currentNode)
        && currentNode.name !== currentContract.name
      ) {
        return {
          context: {
            ...context,
            currentContract: {
              ...currentContract,
              functionIdentifiers: [
                ...currentContract.functionIdentifiers,
                getFunctionIdentifier(currentNode, currentContract.name)
              ]
            }
          },
          skipSubtree: true
        }
      }

      return { context };
    },
    leaveState: (trace: Trace, context: TokenInterfaceContext) => {
      const currentContract = context.currentContract;
      if (!currentContract) {
        throw new Error();
      }

      if (
        intersection(
          erc20TokenFunctions,
          currentContract.functionIdentifiers,
        ).length >= 2
        || intersection(
          erc223TokenFunctions,
          currentContract.functionIdentifiers,
        ).length >= 2
      ) {
        return {
          ...omit(context, ['currentContract']),
          occurrences: [
            ...context.occurrences,
            pick(getCurrentElement(trace), ['start', 'end']) as AnalysisResultOccurrence,
          ]
        };
      }

      return omit(context, ['currentContract']);
    },
  },
};

export const containsTokenInterface: Classifier = {
  description: 'Checks if document contains token interface.',
  category: 'INTEREST',
  using: 'AST',
  check: (contractInformation: ContractInformation): AnalysisResult => {
    if (!contractInformation.ast) {
      return {
        result: 'NOT DECIDABLE',
      };
    }

    const { occurrences } = walkState<TokenInterfaceContext>(
      contractInformation.ast,
      containsTokenInterfaceWalker,
      { occurrences: [] },
    );

    if (occurrences.length > 0) {
      return {
        result: 'FOUND',
        description: 'This contracts contains a Token-Interface.',
        occurrences,
      };
    }

    return {
      result: 'NOT FOUND',
    };
  },
};
