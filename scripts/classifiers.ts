import config from 'config';
import { readJSON, pathExists, outputJSON } from 'fs-extra';
import {
  createEmptyDownloadedContractList,
  addToDownloadedContractList,
  DownloadedContractList
} from 'src/crawler';
import ora from 'ora';
import { AnalysisResults, updateAnalysis, ContractAnalysisResult } from 'src/analyze';
import { buildFromAnalysisResults } from 'src/bayes/build';
import * as classifiers from 'src/classifiers';
import { keys, toPairs, mapValues, sortBy, filter, map, round } from 'lodash';
import { classifyContract } from 'src/bayes/check';
import chalk from 'chalk';
import { formatAnalysisResult } from 'src/terminal/formatAnalysis';

export const update = async ({
  online = true,
  databaseFile = config.storage.manual.contracts,
  analysisResultFile = config.storage.manual.analysis,
  manualDecisionsFile = config.storage.manual.decisions,
  bayesClassifiersFile = config.storage.manual.classifiers,
}: {
    online: boolean,
    databaseFile: string,
    analysisResultFile: string,
    manualDecisionsFile: string,
    bayesClassifiersFile: string,
  }) => {
  let spinner: any;
  try {
    spinner = ora(`Loading contract database from '${databaseFile}'.`).start();
    const contractDatabase: DownloadedContractList = await pathExists(databaseFile)
      ? await readJSON(databaseFile)
      : createEmptyDownloadedContractList(new Date());
    spinner.succeed();

    spinner = ora(`Loading manual decisions file from '${manualDecisionsFile}'.`).start();
    const manualAnalysisResults: Record<string, boolean> = await pathExists(manualDecisionsFile)
      ? await readJSON(manualDecisionsFile)
      : {};
    spinner.succeed();

    spinner = ora(`Downloading contracts for manual decisions.`).start();
    const contractDatabaseWithManualDecisionContracts = online
      ? await addToDownloadedContractList(
        contractDatabase,
        keys(manualAnalysisResults),
        { waitFor: config.download.waitFor }
      )
      : contractDatabase;
    spinner.succeed();

    spinner = ora(`Saving contract database to '${databaseFile}'.`).start();
    await outputJSON(databaseFile, contractDatabaseWithManualDecisionContracts, { spaces: 2 });
    spinner.succeed();

    spinner = ora(`Loading previous analysis results from '${analysisResultFile}'.`).start();
    const contractAnalysisResults: AnalysisResults = await pathExists(analysisResultFile)
      ? await readJSON(analysisResultFile)
      : {};
    spinner.succeed();

    spinner = ora(`Analyzing downloaded contracts.`).start();
    const updatedContractAnalysisDatabase = await updateAnalysis(
      contractAnalysisResults,
      contractDatabaseWithManualDecisionContracts,
      {
        maxLines: config.analysis.maximalLines,
        reRun: [],
      }
    );
    spinner.succeed();

    spinner = ora(`Saving analysis to '${analysisResultFile}'.`).start();
    await outputJSON(analysisResultFile, updatedContractAnalysisDatabase, { spaces: 2 });
    spinner.succeed();

    spinner = ora(`Calculating new classifiers.`).start();
    const bayesClassifiers = buildFromAnalysisResults(
      updatedContractAnalysisDatabase,
      manualAnalysisResults,
      keys(classifiers)
    );
    spinner.succeed();

    spinner = ora(`Saving classifiers to '${bayesClassifiersFile}'.`).start();
    await outputJSON(bayesClassifiersFile, bayesClassifiers, { spaces: 2 });
    spinner.succeed();
  } catch (e) {
    if (spinner) { spinner.fail(); }
    console.error(e);
  }
}

export const check_manual = async ({
  analysisResultFile = config.storage.manual.analysis,
  manualDecisionsFile = config.storage.manual.decisions,
  bayesClassifiersFile = config.storage.classifers,
}: {
    online: boolean,
    databaseFile: string,
    analysisResultFile: string,
    manualDecisionsFile: string,
    bayesClassifiersFile: string,
  }) => {
  let spinner: any;
  try {
    spinner = ora(`Loading manual decisions file from '${manualDecisionsFile}'.`).start();
    const manualAnalysisResults: Record<string, boolean> = await pathExists(manualDecisionsFile)
      ? await readJSON(manualDecisionsFile)
      : {};
    spinner.succeed();

    spinner = ora(`Loading previous analysis results from '${analysisResultFile}'.`).start();
    const contractAnalysisResults: AnalysisResults = await pathExists(analysisResultFile)
      ? await readJSON(analysisResultFile)
      : {};
    spinner.succeed();

    spinner = ora(`Loading bayes classifiers from '${bayesClassifiersFile}'.`).start();
    const bayesClassifiers = await readJSON(bayesClassifiersFile);
    spinner.succeed();

    spinner = ora(`Calculating honeypot scores.`).start();
    const honeypotScores: Array<[string, number]> = toPairs(mapValues(
      contractAnalysisResults,
      (contractAnalysisResult: ContractAnalysisResult) => classifyContract(bayesClassifiers, contractAnalysisResult)
    )) as Array<[string, number]>;

    const honeypots: Array<[string, number]> = sortBy(
      honeypotScores,
      [1]
    ) as Array<[string, number]>;
    spinner.succeed();

    console.log(`\n${
      map(honeypots, ([address, score]) => formatAnalysisResult(
        score > config.bayes.threshold,
        score,
        address,
        contractAnalysisResults[address],
        manualAnalysisResults[address]
      )).join('\n')
      }`);
  } catch (e) {
    if (spinner) { spinner.fail(); }
    console.error(e);
  }
}

export const effect = async ({
  bayesClassifiersFile = config.storage.classifers,
}: {
    bayesClassifiersFile: string,
  }) => {
  let spinner: any;
  try {
    spinner = ora(`Loading bayes classifiers from '${bayesClassifiersFile}'.`).start();
    const bayesClassifiers = await readJSON(bayesClassifiersFile);
    spinner.succeed();

    const factors = mapValues(bayesClassifiers.classifiers, ({ honeypot, harmless }) => {
      return {
        ifFound: honeypot.ifFound / harmless.ifFound,
        ifNotFound: honeypot.ifNotFound / harmless.ifNotFound,
      }
    });

    console.log(factors);
  } catch (e) {
    if (spinner) { spinner.fail(); }
    console.error(e);
  }
}

