import { flatten, map, reduce, toPairs, forEach, pick, isNumber } from 'lodash';
import {
  Node,
} from '../ast';
import {
  AnalysisResult,
  Classifier,
  ContractInformation,
  AnalysisResultOccurrence,
} from '../analyze/sourceCodeAnalyzer';
import { get as levenshtein } from 'fast-levenshtein';
import { getVariableDeclarations } from '../ast/helpers/variables';
import { crossProduct } from '../utils/product';

type GetMinimalLevenshteinDistanceReduceContext<T, S> = {
  minValue: number;
  minLeft: [string, T];
  minRight: [string, S];
} | {
  minValue: null;
  minLeft: null;
  minRight: null;
};

const getMinimalLevenshteinDistance = <T, S>(
  leftSide: Record<string, T>,
  rightSide: Record<string, S>,
  allowIdentical: boolean = false
) =>
  reduce(
    crossProduct(toPairs(leftSide), toPairs(rightSide)),
    (
      context: GetMinimalLevenshteinDistanceReduceContext<T, S>,
      [left, right]: [[string, T], [string, S]]
    ) => {
      const distance = levenshtein(left[0], right[0]);

      if (left[0].length < 7) {
        return context;
      }

      if ((allowIdentical || distance > 0) && (!isNumber(context.minValue) || distance < context.minValue)) {
        return {
          minLeft: left,
          minRight: right,
          minValue: distance
        }
      }

      return context;
    },
    { minValue: null, minLeft: null, minRight: null } as GetMinimalLevenshteinDistanceReduceContext<T, S>
  );

const findSimilarities = <T, S extends Node>(leftSide: Record<string, T>, rightSide: Record<string, S>, allowIdentical: boolean = false): AnalysisResultOccurrence[] => {
  const {
    minValue,
    minRight
  } = getMinimalLevenshteinDistance(leftSide, rightSide, false);

  if (minRight && isNumber(minValue) && minValue <= 1) {
    return [pick(minRight[1], ['start', 'end'])] as AnalysisResultOccurrence[];
  }

  return [];
}

export const similarVariableNames: Classifier = {
  description: 'Checks if similar variables have been used.',
  category: 'UNDERHANDED SOLIDITY',
  using: 'AST',
  check: (contractInformation: ContractInformation): AnalysisResult => {
    if (!contractInformation.ast) {
      return {
        result: 'NOT DECIDABLE',
      };
    }

    const contracts = getVariableDeclarations(contractInformation.ast);

    const occurrences: AnalysisResultOccurrence[] = [];

    forEach(contracts, contract => {
      forEach(contract.functionVariables, functionVariables => occurrences.push(
        ...findSimilarities(contract.stateVariables, functionVariables))
      );

      forEach(contract.is, parent => {
        const contractParent = contracts[parent];
        if (!contractParent) {
          return;
        }

        occurrences.push(
          ...findSimilarities(contract.stateVariables, contractParent.stateVariables)
        );
      });

      occurrences.push(
        ...findSimilarities(contract.stateVariables, contract.stateVariables)
      );
    });

    if (occurrences.length > 0) {
      return {
        result: 'FOUND',
        occurrences
      }
    }

    return {
      result: 'NOT FOUND',
    };
  },
};
