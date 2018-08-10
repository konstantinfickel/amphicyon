import {
  isMemberExpression, isCallExpression, isIdentifier,
} from '../ast';
import { getCurrentElement, Trace, AstWalker, walk } from '../ast/walk';
import { Node, isLiteral, isPragmaStatement, isVersionLiteral } from '../ast/node';
import {
  AnalysisResult,
  Classifier,
  ContractInformation,
  AnalysisResultOccurrence,
} from '../analyze/sourceCodeAnalyzer';
import { some, pick } from 'lodash';

interface UncalledExternalCallContext {
  occurrences: AnalysisResultOccurrence[];
  compilerVersion: string | null;
}

const emptyStringCompilerBugWalker: AstWalker<UncalledExternalCallContext> = {
  enter: (trace: Trace, context: UncalledExternalCallContext) => {
    const currentNode: Node = getCurrentElement(trace);

    if (isPragmaStatement(currentNode) && isVersionLiteral(currentNode.start_version)) {
      return {
        context: {
          ...context,
          compilerVersion: currentNode.start_version.version
        }
      }
    } else if (
      isLiteral(currentNode)
      && currentNode.value === ''
      && some(
        trace,
        ({ node }, position: number) =>
          isCallExpression(node)
          && trace[position + 1]
          && trace[position + 1].propertyName === 'arguments'
      )
    ) {
      return {
        context: {
          ...context,
          occurrences: [
            ...context.occurrences,
            pick(currentNode, ['start', 'end']) as AnalysisResultOccurrence
          ]
        },
      }
    }

    return { context };
  },
};

const vulnerableVersion = (versionString: string) => /0\.4\.(10|11|[0-9])(?=[^\d]|$)/.test(versionString)

export const emptyStringCompilerBug: Classifier = {
  description: 'Checks for external call functions that were not called..',
  category: 'UNDERHANDED SOLIDITY',
  using: 'AST',
  check: (contractInformation: ContractInformation): AnalysisResult => {
    if (!contractInformation.ast) {
      return {
        result: 'NOT DECIDABLE',
      };
    }

    const {
      occurrences,
      compilerVersion: compilerVersionFromCode
    } = walk<UncalledExternalCallContext>(
      contractInformation.ast,
      emptyStringCompilerBugWalker,
      { occurrences: [], compilerVersion: null },
      );

    if ((
      contractInformation.etherscanDetails
      && !vulnerableVersion(contractInformation.etherscanDetails.compilerVersion)
    ) || (
        compilerVersionFromCode
        && !vulnerableVersion(compilerVersionFromCode)
      )) {
      return {
        result: 'NOT FOUND',
      }
    }

    if (occurrences.length > 0) {
      return {
        result: 'FOUND',
        description: 'This contract contains a call with an empty function literal.',
        occurrences,
      };
    }

    return {
      result: 'NOT FOUND',
    };
  },
};

