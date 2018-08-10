import { Dictionary, mapValues, has, intersection, isNumber } from 'lodash';
import * as classifiers from '../classifiers';
import {
  AnalysisResult,
  Classifier,
  ContractInformation,
} from './sourceCodeAnalyzer';
import { DownloadedContractList, DownloadedContractEntry } from '../crawler';
import { generateAstParser } from '../ast/build';
import { countLines } from '../utils/countLines';

interface UpdateAnalysisOptions {
  reRun: string[] | true,
  maxLines: number,
  progressFunction?: (address: string) => void,
};

export type ContractAnalysisResult = Record<string, boolean | null>;
export type AnalysisResults = Record<string, ContractAnalysisResult>;

export const analyzeContract = (
  contractInformation: ContractInformation
): Dictionary<AnalysisResult> =>
  mapValues(classifiers, (classifier: Classifier) => {
    return classifier.check(contractInformation);
  });

const resultToBooleanOrNull = (result: AnalysisResult): boolean | null => {
  if (result.result === 'FOUND') {
    return true;
  } else if (result.result === 'NOT FOUND') {
    return false;
  }
  return null;
};

export const analysisToBooleans = (
  analysisResults: Dictionary<AnalysisResult>
): Dictionary<boolean | null> =>
  mapValues(analysisResults, resultToBooleanOrNull);


const isTooLong = (sourceCode: string, maxLines: number) =>
  countLines(sourceCode) > maxLines;

export const contractSourceCodeToInformationGenerator =
  async (sourceCode: string, name?: string) => {
    const astParser = await generateAstParser();
    const ast = astParser(sourceCode);
    return {
      ast,
      sourceCode,
      name
    }
  };

export const contractEntryToInformationGenerator =
  async (maxLines?: number)
    : Promise<(contractEntry: DownloadedContractEntry) => ContractInformation> => {
    const astParser = await generateAstParser();
    return (contractEntry: DownloadedContractEntry): ContractInformation => {
      if (contractEntry.details) {
        const etherscanDetails = contractEntry.details;
        const name = etherscanDetails.name;
        const sourceCode = etherscanDetails.sourceCode;

        if (!isNumber(maxLines) || !isTooLong(sourceCode, maxLines)) {
          try {
            const ast = astParser(sourceCode);

            return {
              etherscanDetails,
              sourceCode,
              ast,
              name
            }
          } catch (e) { }
        }

        return {
          etherscanDetails,
          sourceCode,
          name
        }
      } else if (contractEntry.preview) {
        return {
          name: contractEntry.preview.name,
        }
      }
      return {};
    }
  }

export const updateAnalysisOnContract = (
  address: string,
  previousAnalysisResult: ContractAnalysisResult,
  loadContractInformation: () => ContractInformation,
  {
    reRun = [],
    progressFunction = () => { },
  }: UpdateAnalysisOptions
): ContractAnalysisResult => {
  let contractInformation: ContractInformation;

  return mapValues(classifiers, (classifier: Classifier, classifierName: string): boolean | null => {
    if (
      reRun !== true
      && has(previousAnalysisResult, classifierName)
      && intersection(reRun, [classifierName]).length === 0
      && previousAnalysisResult[classifierName] != null
    ) {
      return previousAnalysisResult[classifierName];
    }
    if (!contractInformation) {
      progressFunction(address);
      contractInformation = loadContractInformation();
    }

    const classificationResult = classifier.check(contractInformation);

    return resultToBooleanOrNull(classificationResult);
  });
};

export const updateAnalysis = async (
  analysisResults: AnalysisResults,
  { contracts }: DownloadedContractList,
  {
    reRun = [],
    progressFunction = () => { },
    maxLines
  }: UpdateAnalysisOptions
): Promise<AnalysisResults> => {
  const contractEntryToInformation = await contractEntryToInformationGenerator(maxLines);

  return mapValues(contracts, (contractEntry: DownloadedContractEntry, contractAddress: string) => {
    const previousAnalysisResults = has(analysisResults, contractAddress)
      ? analysisResults[contractAddress]
      : {};

    return updateAnalysisOnContract(contractAddress, previousAnalysisResults, () =>
      contractEntryToInformation(contractEntry), {
        reRun,
        progressFunction,
        maxLines,
      }
    );
  })
};
