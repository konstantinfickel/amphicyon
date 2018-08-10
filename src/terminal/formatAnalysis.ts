import chalk from 'chalk';
import { isBoolean, filter, toPairs, map, round } from 'lodash';
import { ContractAnalysisResult } from '../analyze';
import { isString } from 'util';
import { AnalysisResult, AnalysisResultOccurrence } from '../analyze/sourceCodeAnalyzer';
import { countLines } from '../utils/countLines';

export const classifierList = (activeClassifierNames: string[], chalkFunction: any = chalk.bgWhite.black) =>
    activeClassifierNames.length !== 0 ? map(
        activeClassifierNames,
        name => chalkFunction(` ${name} `)
    ).join(' ') : '✘';

export const formatAnalysisResult = (
    identifiedAsHoneypot: boolean,
    honeypotScore: number,
    address: string | null,
    contractAnalysisResult: ContractAnalysisResult,
    wasHoneypot?: boolean
) => {
    const activeClassifierName: string[] = map(
        filter(
            toPairs(contractAnalysisResult) as Array<[string, boolean]>,
            ([, result]) => result
        ),
        ([name]) => name
    );

    const activeClassifierString = classifierList(activeClassifierName);

    const scoreString = (identifiedAsHoneypot ? chalk.bgRed : chalk.bgGreen).white.bold(
        Number.isFinite(honeypotScore)
            ? ` ${round(honeypotScore, honeypotScore >= 10 ? 1 : 2)} `
            : ` SURE `
    );

    const identificationWasCorrectString = !isBoolean(wasHoneypot) ? '' : ` ${
        identifiedAsHoneypot === wasHoneypot
            ? chalk.green('✔')
            : chalk.red('✘')
        }`;

    const addressString = isString(address) ? `https://etherscan.io/address/0x${address}` : 'Analyzed Contract';

    return `${scoreString}${identificationWasCorrectString} ${addressString}\n ${activeClassifierString}\n`;
}

const displayOccurrence = (contractSource: string) => (occurence: AnalysisResultOccurrence) => {
    const startCharacter = contractSource.substr(0, occurence.start).lastIndexOf('\n') + 1;
    const lineNumber = countLines(contractSource.substr(0, occurence.start));
    return `${chalk.bold(`line ${lineNumber}, characters ${occurence.start} - ${occurence.end}`)}\n${contractSource.substr(startCharacter, occurence.end - startCharacter)}`;
};

export const prettyAnalysisResultString = (result: Record<string, AnalysisResult>, contractSource: string) => {
    const resultPairs: Array<[string, AnalysisResult]> = toPairs(result);

    const notDecidableString = classifierList(map(filter(
        resultPairs,
        ([, result]) => result.result === 'NOT DECIDABLE'
    ), ([name,]) => name), chalk.bgBlue.white);

    const notFoundString = classifierList(map(filter(
        resultPairs,
        ([, result]) => result.result === 'NOT FOUND'
    ), ([name,]) => name), chalk.bgYellow.black);

    const found = filter(
        resultPairs,
        ([, result]) => result.result === 'FOUND'
    );

    const foundString = map(found, ([name, analysisResult]) => {
        const occurenceString = analysisResult.occurrences && analysisResult.occurrences.length !== 0
            ? `\n\n${
            map(analysisResult.occurrences, displayOccurrence(contractSource)).join('\n')
            }`
            : '';

        return ` ${
            chalk.bgRed.white.bold(` ${name} `)
            }${
            analysisResult.description ? `\n  ${chalk.grey(analysisResult.description)}` : ''
            }${
            occurenceString
            }\n`
    }).join('\n');

    return `${chalk.bold('NOT FOUND')}\n ${
        notFoundString
        }\n\n${chalk.bold('NOT DECIDABLE')}\n ${
        notDecidableString
        }\n\n${chalk.bold('FOUND')}\n${
        foundString
        }`
}