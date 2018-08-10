import { isString, toNumber, isNil } from 'lodash';

export const etherscanAmountToEther = (etherscanAmount: string): number => {
  if (!isString(etherscanAmount) || /\-/.test(etherscanAmount)) {
    return 0;
  }

  const matchedResult = etherscanAmount.match(
    /^[\s]*((?:[\d]{1,3}(?:\,[\d]{3})|[\d]{1,2})(?:[\s]*.[\s]*[\d]+)?) ([\w]+)[\s]*$/
  );

  if (isNil(matchedResult)) {
    return 0;
  }

  const amount = toNumber(matchedResult[1].replace(/[\s\,]+/, ''));
  const unit = matchedResult[2];

  if (unit.toLowerCase() === 'ether') {
    return amount;
  } else if (amount > 0) {
    // unit is 'wei'
    return Number.MIN_VALUE;
  } else {
    return 0;
  }
};

export const etherscanTransactionCountToNumber = (etherscanAmount: string) => {
  if (!isString(etherscanAmount)) {
    throw new Error('Transaction amount is not a string.');
  }

  if (/\-/.test(etherscanAmount)) {
    return 0;
  }

  const matchedResult = etherscanAmount.match(/^[\s]*([\d]+) ([\w]+)[\s]*$/);

  if (isNil(matchedResult)) {
    throw new Error(
      `Transaction amount "${etherscanAmount}" could not be parsed.`
    );
  }

  return toNumber(matchedResult[1].replace(',', ''));
};
