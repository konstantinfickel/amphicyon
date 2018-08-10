import ora from 'ora';
import config from 'config';
import {
  readJSON,
  pathExists,
  outputJSON,
  readFile,
} from 'fs-extra';
import {
  contractEntryToInformationGenerator,
  analyzeContract,
  analysisToBooleans,
  contractSourceCodeToInformationGenerator
} from 'src/analyze';
import { downloadVerifiedContract } from 'src/crawler/etherscan';
import { classifyContract } from 'src/bayes/check';
import * as inquirer from 'inquirer';
import { isBoolean } from 'lodash';
import { normalizeAddress, isAddress } from 'src/crawler/address';
import { ContractInformation } from 'src/analyze/sourceCodeAnalyzer';
import { generateAstParser } from 'src/ast/build';
import { formatAnalysisResult, prettyAnalysisResultString } from 'src/terminal/formatAnalysis';

export const analyze = async ({
  bayesClassifiersFile = config.storage.classifers,
  interactive = true,
  manualDecisionsFile = config.storage.manual.decisions,
  name,
  _ = []
}: {
    bayesClassifiersFile: string,
    _: string[],
    manualDecisionsFile: string,
    interactive: boolean,
    name?: string
  }) => {
  let spinner: any;
  try {
    spinner = ora(`Loading bayes classifiers from '${bayesClassifiersFile}'.`).start();
    if (_.length === 0) {
      throw new Error('No address provided!');
    }

    const bayesClassifiers = await readJSON(bayesClassifiersFile);
    spinner.succeed();

    spinner = ora('Starting to load smart contract information.').start();
    let contractInformation: ContractInformation;
    let address: string | null = null;
    if (isAddress(_[0])) {
      address = normalizeAddress(_[0]);

      contractInformation = (await contractEntryToInformationGenerator())({
        lastUpdated: new Date(),
        details: await downloadVerifiedContract(address)
      });
    } else {
      const contractSourceCode = await readFile(_[0], 'utf8');
      contractInformation = await contractSourceCodeToInformationGenerator(contractSourceCode, name);
    }
    spinner.succeed();

    spinner = ora('Analyzing smart contract').start();
    const analysisResult = analyzeContract(contractInformation);

    const analysisResultAsBooleans = analysisToBooleans(analysisResult);

    const score = classifyContract(bayesClassifiers, analysisResultAsBooleans);
    const result = score > config.bayes.threshold;
    spinner.succeed();

    console.log('\n');
    console.log(prettyAnalysisResultString(analysisResult, contractInformation.sourceCode || ''));
    console.log('\n');
    console.log(formatAnalysisResult(
      result,
      score,
      address,
      analysisResultAsBooleans,
    ));


    if (interactive && address) {
      const { questionResult }: { questionResult: boolean | null } = (await inquirer.prompt({
        name: 'questionResult',
        message: 'Please verify manually, if the decision was correct',
        type: 'list',
        choices: [
          {
            name: 'Honeypot',
            value: true
          },
          {
            name: 'Harmless',
            value: false
          },
          {
            name: 'Unknown',
            value: null
          },
        ],
        default: result
      })) as { questionResult: boolean | null };

      spinner = ora('Saving manual result.').start();
      if (isBoolean(questionResult)) {
        const manualDecisions = await pathExists(manualDecisionsFile)
          ? await readJSON(manualDecisionsFile)
          : {};

        const updatedManualDecisions = {
          ...manualDecisions,
          [address.toLowerCase()]: questionResult
        };

        await outputJSON(manualDecisionsFile, updatedManualDecisions, { spaces: 2 });
      }
      spinner.succeed();
    }
  } catch (e) {
    if (spinner) { spinner.fail(); }
    console.error(e);
  }
};

export const ast = async ({
  _,
  file
}: {
    _: string[],
    file: string
  }) => {
  let sourceCode;
  if (isAddress(_[0])) {
    const address = normalizeAddress(_[0]);
    sourceCode = (await downloadVerifiedContract(address)).sourceCode;
  } else {
    sourceCode = await readFile(_[0], 'utf8');
  }

  const ast = (await generateAstParser())(sourceCode);

  await outputJSON(file, ast, { spaces: 2 });
};