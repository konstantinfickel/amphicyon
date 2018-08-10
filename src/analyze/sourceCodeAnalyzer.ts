import { AST } from '../ast';
import { VerifiedSmartContractDetails } from '../crawler/etherscan';

export interface ContractInformation {
  name?: string;
  sourceCode?: string;
  ast?: AST;
  etherscanDetails?: VerifiedSmartContractDetails;
}

export interface AnalysisResultOccurrence {
  start: number;
  end: number;
  description?: number;
}

export interface AnalysisResult {
  result: 'FOUND' | 'NOT FOUND' | 'NOT DECIDABLE';
  description?: string;
  occurrences?: AnalysisResultOccurrence[];
}

export interface Classifier {
  category: 'INTEREST' | 'UNDERHANDED SOLIDITY' | 'PATTERN' | 'FOLLOW-UP';
  using: 'SOURCECODE' | 'AST' | 'NAME' | 'ETHERSCAN';
  description: string;
  check: (contractInformation: ContractInformation) => AnalysisResult;
}
