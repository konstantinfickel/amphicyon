import {
    isCallExpression,
} from '../ast';
import { getCurrentElement, Trace, AstWalker, walk } from '../ast/walk';
import { Node } from '../ast/node';
import {
    AnalysisResult,
    Classifier,
    ContractInformation,
    AnalysisResultOccurrence,
} from '../analyze/sourceCodeAnalyzer';
import { pick } from 'lodash';
import { containsTransferExpression } from '../ast/helpers/modifiableLibraries';

interface CanSendEtherContext {
    occurrences: AnalysisResultOccurrence[];
}

const canSendEtherAstWalker: AstWalker<CanSendEtherContext> = {
    enter: (trace: Trace, context: CanSendEtherContext) => {
        const currentNode: Node = getCurrentElement(trace);
        if (isCallExpression(currentNode) && containsTransferExpression(currentNode, true)) {
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

        return { context };
    },
};

export const canSendEther: Classifier = {
    description: 'Contract can send ether.',
    category: 'INTEREST',
    using: 'AST',
    check: (contractInformation: ContractInformation): AnalysisResult => {
        if (!contractInformation.ast) {
            return {
                result: 'NOT DECIDABLE',
            };
        }

        const { occurrences } = walk<CanSendEtherContext>(
            contractInformation.ast,
            canSendEtherAstWalker,
            { occurrences: [] } as CanSendEtherContext,
        );

        if (occurrences.length > 0) {
            return {
                result: 'FOUND',
                description: 'Contract is able to send ether.',
                occurrences
            };
        }

        return {
            result: 'NOT FOUND',
        };
    },
};
