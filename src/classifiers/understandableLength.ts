import {
    AnalysisResult,
    Classifier,
    ContractInformation,
} from '../analyze/sourceCodeAnalyzer';
import { countLines } from '../utils/countLines';

export const understandableLength: Classifier = {
    category: 'INTEREST',
    check: (contractInformation: ContractInformation): AnalysisResult => {
        if (!contractInformation.sourceCode) {
            return {
                result: 'NOT DECIDABLE',
            };
        }

        const contractLength = countLines(contractInformation.sourceCode);

        if (contractLength < 150) {
            return {
                result: 'FOUND',
            };
        }

        return {
            result: 'NOT FOUND',
        };
    },
    description: 'Checks if the contract is short enough to be understood quickly.',
    using: 'SOURCECODE',
};

