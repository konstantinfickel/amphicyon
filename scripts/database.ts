import config from 'config';
import { readJSON, pathExists, outputJSON } from 'fs-extra';
import {
  createEmptyDownloadedContractList,
  updateDownloadedContractList,
  DownloadedContractList
} from 'src/crawler';
import ora from 'ora';
import { AnalysisResults, updateAnalysis, ContractAnalysisResult } from 'src/analyze';
import { mapValues, filter, sortBy, toPairs, map, keys, fromPairs, reduce, padEnd, padStart, reverse } from 'lodash';
import { classifyContract } from 'src/bayes/check';
import { formatAnalysisResult } from 'src/terminal/formatAnalysis';
import * as classifiers from 'src/classifiers';
import chalk from 'chalk';
import { ContractInformation } from 'src/analyze/sourceCodeAnalyzer';

export const update = async ({
  online = true,
  pages = 10,
  startAtPage = 1,
  stopIfNoNewContract = true,
  databaseFile = config.storage.contracts,
  analysisResultFile = config.storage.analysis,
}: {
    online: boolean,
    pages: number,
    startAtPage: number,
    databaseFile: string,
    analysisResultFile: string,
    stopIfNoNewContract: boolean
  }) => {
  let spinner: any;

  try {
    spinner = ora(`Loading contract database from '${databaseFile}'.`).start();
    const contractDatabase: DownloadedContractList = await pathExists(databaseFile)
      ? await readJSON(databaseFile)
      : createEmptyDownloadedContractList(new Date());
    spinner.succeed();

    let currentPage: number | null = null;
    let currentAddress: string | null = null;
    let loadingError: Error | null = null;

    spinner = ora(`Updating contract database.`).start();
    const updatedContractDatabase = online
      ? await updateDownloadedContractList(
        contractDatabase,
        {
          stopIfNoNewContract,
          waitFor: config.download.waitFor,
          updateFunction: (param) => {
            if (param.currentAddress) {
              currentAddress = param.currentAddress;
            }
            if (param.currentPage) {
              currentPage = param.currentPage;
            }
            if (param.error) {
              loadingError = param.error;
            }

            if (currentPage && currentAddress) {
              spinner.text = `Downloading 0x${
                currentAddress
                } (${
                currentPage
                }|${
                pages + startAtPage - 1
                })...`
            } else if (currentPage && !currentAddress) {
              spinner.text = `Downloading (${
                currentPage
                }|${
                pages + startAtPage - 1
                })...`
            }
          }
        },
        startAtPage,
        pages - 1
      )
      : contractDatabase;
    if (loadingError) {
      spinner.fail();
      console.error(loadingError)
    } else {
      spinner.succeed();
    }

    spinner = ora(`Saving contract database to '${databaseFile}'.`).start();
    await outputJSON(databaseFile, updatedContractDatabase, { spaces: 2 });
    spinner.succeed();

    spinner = ora(`Loading previous analysis results from '${analysisResultFile}'.`).start();
    const contractAnalysisResults: AnalysisResults = await pathExists(analysisResultFile)
      ? await readJSON(analysisResultFile)
      : {};
    spinner.succeed();

    spinner = ora(`Analyzing downloaded contracts.`).start();
    const updatedContractAnalysisDatabase = await updateAnalysis(
      contractAnalysisResults,
      updatedContractDatabase,
      {
        maxLines: config.analysis.maximalLines,
        reRun: [],
        progressFunction: (address: string) => {
          spinner.text = `Analyzing 0x${
            address
            }`;
          spinner.render();
        }
      }
    );
    spinner.succeed();

    spinner = ora(`Saving analysis to '${analysisResultFile}'.`).start();
    await outputJSON(analysisResultFile, updatedContractAnalysisDatabase, { spaces: 2 });
    spinner.succeed();
  } catch (e) {
    if (spinner) { spinner.fail(); }
    console.error(e);
  }
}

export const find = async ({
  analysisResultFile = config.storage.analysis,
  bayesClassifiersFile = config.storage.classifers,
  databaseFile = config.storage.contracts,
  sortByAdditionDate = true,
}: {
    analysisResultFile: string,
    bayesClassifiersFile: string,
    databaseFile: string,
    sortByAdditionDate: boolean,
  }) => {
  let spinner: any;
  try {
    spinner = ora(`Loading contract database from '${databaseFile}'.`).start();
    const contractDatabase: DownloadedContractList = await pathExists(databaseFile)
      ? await readJSON(databaseFile)
      : createEmptyDownloadedContractList(new Date());
    spinner.succeed();

    spinner = ora(`Loading previous analysis results from '${analysisResultFile}'.`).start();
    const contractAnalysisResults: AnalysisResults = await pathExists(analysisResultFile)
      ? await readJSON(analysisResultFile)
      : {};
    spinner.succeed();

    spinner = ora(`Loading classifiers from '${bayesClassifiersFile}'.`).start();
    const bayesClassifiers = await readJSON(bayesClassifiersFile);
    spinner.succeed();

    spinner = ora(`Calculating honeypot scores.`).start();
    const honeypotScores: Array<[string, number]> = toPairs(mapValues(
      contractAnalysisResults,
      (contractAnalysisResult: ContractAnalysisResult) => classifyContract(bayesClassifiers, contractAnalysisResult)
    )) as Array<[string, number]>;

    const honeypots: Array<[string, number]> = filter(
      honeypotScores,
      ([, score]) => score > config.bayes.threshold
    );

    const sortedHoneypots: Array<[string, number]> = sortByAdditionDate
      ? reverse(sortBy(honeypots, ([address]) => new Date(contractDatabase.contracts[address].lastUpdated)))
      : sortBy(honeypots, [1]) as Array<[string, number]>;
    spinner.succeed();

    console.log(`\n${
      map(sortedHoneypots, ([address, score]) => formatAnalysisResult(
        score > config.bayes.threshold,
        score,
        address,
        contractAnalysisResults[address]
      )).join('\n')
      } `);

    console.log(`Found ${sortedHoneypots.length} honeypots.\n`)
  } catch (e) {
    if (spinner) { spinner.fail(); }
    console.error(e);
  }
}

const countByClassifiers = (
  contractAnalysisResults: Record<string, Record<string, boolean | null>>,
  classifierNames: string[],
  filterFunction: (address: string, result: Record<string, boolean | null>) => boolean = () => true
) =>
  reduce(
    contractAnalysisResults,
    (summed, result, address) => {
      if (!filterFunction(address, result)) {
        return summed;
      }
      return mapValues(
        summed,
        (previous, value) => previous + result[value]
      );
    },
    fromPairs(map(classifierNames, classifier => [classifier, 0])),
  );

export const count = async ({
  analysisResultFile = config.storage.analysis,
  bayesClassifiersFile = config.storage.classifers
}: {
    analysisResultFile: string,
    bayesClassifiersFile: string,
  }) => {
  let spinner: any;
  try {
    spinner = ora(`Loading previous analysis results from '${analysisResultFile}'.`).start();
    const contractAnalysisResults: AnalysisResults = await pathExists(analysisResultFile)
      ? await readJSON(analysisResultFile)
      : {};
    spinner.succeed();

    spinner = ora(`Loading classifiers from '${bayesClassifiersFile}'.`).start();
    const bayesClassifiers = await readJSON(bayesClassifiersFile);
    spinner.succeed();

    spinner = ora(`Calculating honeypot scores.`).start();
    const honeypotScores: Record<string, number> = mapValues(
      contractAnalysisResults,
      (contractAnalysisResult: ContractAnalysisResult) => classifyContract(bayesClassifiers, contractAnalysisResult)
    );
    spinner.succeed();

    spinner = ora(`Calculating values.`).start();
    const counted = countByClassifiers(contractAnalysisResults, keys(classifiers));
    const countForHoneypots = countByClassifiers(
      contractAnalysisResults,
      keys(classifiers),
      (address) => honeypotScores[address] > config.bayes.threshold
    );

    const countForHarmless = countByClassifiers(
      contractAnalysisResults,
      keys(classifiers),
      (address) => honeypotScores[address] <= config.bayes.threshold
    );
    const amountOfHoneypots = filter(toPairs(honeypotScores), ([, score]) => score > config.bayes.threshold).length;
    const amountOfHarmless = filter(toPairs(honeypotScores), ([, score]) => score <= config.bayes.threshold).length;
    spinner.succeed();

    console.log(`\n${
      map(counted, (count, classifierName) => ` ${
        padEnd(chalk.bgWhite.black(` ${classifierName} `), 60)
        } ${
        padStart(` ${count}`, 5)
        } ${
        padStart(` ${countForHoneypots[classifierName]}`, 5)
        } ${
        padStart(` ${countForHarmless[classifierName]}`, 5)
        }`
      ).join('\n')
      } \n ${
      padEnd(chalk.bold(` ALL `), 49)
      } ${
      padStart(` ${amountOfHarmless + amountOfHoneypots}`, 5)
      } ${
      padStart(` ${amountOfHoneypots}`, 5)
      } ${
      padStart(` ${amountOfHarmless}`, 5)
      } \n`);

  } catch (e) {
    if (spinner) { spinner.fail(); }
    console.error(e);
  }
}
