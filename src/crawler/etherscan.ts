import request from "request-promise-native";
import cheerio from "cheerio";
import { toNumber, trim } from 'lodash';
import { etherscanAmountToEther, etherscanTransactionCountToNumber } from "./etherAmount";
import { normalizeAddress } from "./address";

interface VerifiedSmartContract {
  address: string;
  name: string;
  compilerVersion: string;
  balance: number;
  transactionCount: number;
  usedOptimizer: boolean;
}

export interface SmartContractTransaction {
  type: 'CREATION' | 'EXTERNAL';
  transactionHash: string;
  blockNumber: number;
  date: Date;
  from: string;
  to: string;
  value: number;
}

export interface VerifiedSmartContractPreview extends VerifiedSmartContract {
  verificationDate: Date;
  providedConstructorArguments: boolean;
  libraryUsed: boolean;
}

export interface VerifiedSmartContractDetails extends VerifiedSmartContract {
  sourceCode: string;
  abi: string;
  byteCode: string;
  usedOptimizerTimes: number;
  detailedCompilerVersion: string;
  creatorAddress: string;
  creationTransactionAddress: string;
  transactions: SmartContractTransaction[];
  hasSuicided: boolean;
  hasWarning: boolean;
  hasHoneypotWarning: boolean;
}

export interface VerifiedSmartContractCompleteDetails extends VerifiedSmartContractDetails, VerifiedSmartContractPreview { };

const etherscanRequest = request.defaults({
  forever: true,
  timeout: 20000,
  method: 'GET'
});

const baseAddress: string = "https://etherscan.io";

export const downloadVerifiedContractPage = async (page: number = 1): Promise<VerifiedSmartContractPreview[]> => {
  const response = await etherscanRequest(`${baseAddress}/contractsVerified/${page}`);

  const overviewPage = cheerio.load(response);

  const result: VerifiedSmartContractPreview[] = [];

  overviewPage('div.profile.container table > tbody').find('tr').each((id, elem) => {
    const address = normalizeAddress(cheerio(cheerio(elem).find('td:nth-child(1) > a')).text());
    const name = cheerio(elem).find('td:nth-child(2)').text().substr(42);
    const compilerVersion = trim(cheerio(elem).find('td:nth-child(3)').text());
    const balance = etherscanAmountToEther(cheerio(elem).find('td:nth-child(4)').text());
    const transactionCount = toNumber(cheerio(elem).find('td:nth-child(5)').text());
    const verificationDate = new Date(cheerio(elem).find('td:nth-child(7)').text());

    const settingsElement = cheerio(elem).find(':nth-child(6)');
    const usedOptimizer = cheerio(settingsElement).children('span.icon-energy').length !== 0;
    const providedConstructorArguments = cheerio(settingsElement).children('span.icon-wrench').length !== 0;
    const libraryUsed = cheerio(settingsElement).children('span.icon-book-open').length !== 0;

    result.push({
      address,
      name,
      compilerVersion,
      balance,
      transactionCount,
      verificationDate,
      usedOptimizer,
      providedConstructorArguments,
      libraryUsed
    });
  });

  return result;
}

const parseTransactionTable = (transactionTable: Cheerio): SmartContractTransaction[] => {
  const result: SmartContractTransaction[] = [];

  transactionTable.find('tr').each((id, elem) => {
    if (id === 0) {
      return;
    }

    const transactionHash = cheerio(cheerio(elem).find('td:nth-child(1) > a')).text();
    const blockNumber = toNumber(cheerio(elem).find('td:nth-child(2) > a').text());
    const date = new Date(trim(cheerio(elem).find('td:nth-child(3) > span').attr('title')));
    const from = normalizeAddress(cheerio(elem).find('td:nth-child(4) > a').text(), true);
    const type = trim(cheerio(elem).find('td:nth-child(5) > span').text());
    const to = normalizeAddress(cheerio(elem).find('td:nth-child(6) > span').attr('title') || cheerio(elem).find('td:nth-child(6) > span').text(), true);
    const value = etherscanAmountToEther(cheerio(elem).find('td:nth-child(7)').text());

    if (to === 'Contract Creation' && type === 'IN') {
      result.push({
        transactionHash,
        blockNumber,
        date,
        from,
        type: 'CREATION',
        to: '0000000000000000000000000000000000000000',
        value
      });
    } else {
      result.push({
        transactionHash,
        blockNumber,
        date,
        from,
        type: 'EXTERNAL',
        to,
        value
      });
    }

  });

  return result;
};

export const downloadVerifiedContract = async (contractAddress: string): Promise<VerifiedSmartContractDetails> => {
  // TODO: Handle non-verified contract or non-contract correctly
  const response = await etherscanRequest(`${baseAddress}/address/${contractAddress}`);

  const contractPage = cheerio.load(response);

  const wasVerified = /Contract Source Code Verified/i.test(contractPage('div#code').text());
  const hasSuicided = /Contract SelfDestruct called/i.test(contractPage('div#code').text());

  const warningElement = contractPage('body > div > div > div.alert-warning');
  const hasHoneypotWarning = warningElement.length !== 0 && /honeypot/i.test(warningElement.text());
  const hasWarning = warningElement.length !== 0;

  const address = normalizeAddress(contractPage('span#mainaddress').text());
  const detailedCompilerVersion = trim(contractPage('div#ContentPlaceHolder1_contractCodeDiv > div:nth-child(2) > table > tbody > tr:nth-child(2) > td:nth-child(2)').text());
  const transactionCount = etherscanTransactionCountToNumber(contractPage('div#ContentPlaceHolder1_divSummary > div:nth-child(1) > table tr:nth-child(3) > td:nth-child(2)').text());
  const transactions = parseTransactionTable(contractPage('div#transactions table > tbody'));
  const creatorAddress = contractPage('div#ContentPlaceHolder1_divSummary > div:nth-child(2) > table tr:nth-child(3) > td:nth-child(2) > a').text();
  const creationTransactionAddress = trim(contractPage('div#ContentPlaceHolder1_divSummary > div:nth-child(2) > table tr:nth-child(3) > td:nth-child(2) > span > a').text());

  const name = trim(contractPage('div#ContentPlaceHolder1_contractCodeDiv > div:nth-child(2) > table > tbody > tr:nth-child(1) > td:nth-child(2)').text());
  const compilerVersion = detailedCompilerVersion.split('+')[0];
  const usedOptimizer = trim(contractPage('div#ContentPlaceHolder1_contractCodeDiv > div:nth-child(3) > table > tbody > tr:nth-child(1) > td:nth-child(2)').text()) === 'Yes';
  const usedOptimizerTimes = toNumber(trim(contractPage('div#ContentPlaceHolder1_contractCodeDiv > div:nth-child(3) > table > tbody > tr:nth-child(2) > td:nth-child(2)').text()));
  const balance = etherscanAmountToEther((contractPage('div#ContentPlaceHolder1_divSummary > div:nth-child(1) > table tr:nth-child(1) > td:nth-child(2)').text()));
  const sourceCode = trim(contractPage('pre#editor').text());
  const abi = trim(contractPage('pre#js-copytextarea2').text());
  const byteCode = trim(contractPage('div#verifiedbytecode2').text());

  return {
    address,
    name,
    balance,
    detailedCompilerVersion,
    compilerVersion,
    usedOptimizer,
    usedOptimizerTimes,
    transactionCount,
    creatorAddress,
    creationTransactionAddress,
    sourceCode,
    abi,
    byteCode,
    transactions,
    hasSuicided,
    hasHoneypotWarning,
    hasWarning
  };
}
