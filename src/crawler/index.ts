import {
  VerifiedSmartContractDetails,
  VerifiedSmartContractPreview,
  downloadVerifiedContract,
  downloadVerifiedContractPage,
} from './etherscan';
import { slowPromiseInSeries, wait } from '../utils/promise';
import { map, isNil, filter, fromPairs, forEach, negate } from 'lodash';

interface AbstractDownloadedContractEntry {
  lastUpdated: Date;
  details?: VerifiedSmartContractDetails;
  preview?: VerifiedSmartContractPreview;
}

export interface DownloadedContractEntryWithDetails extends AbstractDownloadedContractEntry {
  details: VerifiedSmartContractDetails;
}

interface DownloadedContractEntryWithPreview extends AbstractDownloadedContractEntry {
  preview: VerifiedSmartContractPreview;
}

export type DownloadedContractEntry = DownloadedContractEntryWithDetails | DownloadedContractEntryWithPreview;

export interface DownloadedContractList {
  contracts: Record<string, DownloadedContractEntry>;
  lastDate: Date;
}

export const createEmptyDownloadedContractList = (lastDate: Date) => ({
  contracts: {},
  lastDate,
});

const updateContract = async (
  address: string,
  previousEntry?: DownloadedContractEntry,
  waitFor: number = 0
): Promise<[string, DownloadedContractEntry]> => {
  if (previousEntry) {
    if (previousEntry.details) {
      return Promise.resolve([address, previousEntry] as [string, DownloadedContractEntry]);
    }

    if (waitFor > 0) {
      await wait(waitFor);
    }

    return [address, {
      ...previousEntry,
      lastUpdated: new Date(),
      details: await downloadVerifiedContract(address),
    }];
  }

  return [address, {
    lastUpdated: new Date(),
    details: await downloadVerifiedContract(address),
  }];
};

export const addToDownloadedContractList = async (
  verifiedSmartContracts: DownloadedContractList,
  addresses: string[],
  { waitFor }: {
    waitFor: number,
  }
): Promise<DownloadedContractList> => {
  return {
    ...verifiedSmartContracts,
    contracts: {
      ...verifiedSmartContracts.contracts,
      ...fromPairs(await slowPromiseInSeries(
        map(addresses, address => () => updateContract(
          address,
          verifiedSmartContracts.contracts[address],
          waitFor
        )),
        0
      ))
    }
  }
};

export type UpdateFunction = (param: { currentAddress?: string, currentPage?: number, error?: Error }) => void;

export const completeDownloadedContractList = async (
  verifiedSmartContracts: DownloadedContractList,
  { waitFor, updateFunction = () => { } }: { waitFor: number, updateFunction: UpdateFunction }
) => {
  const contracts = { ...verifiedSmartContracts.contracts };

  const contractsToBeLoaded: string[] = map(
    filter(
      map(contracts, ({ details }: DownloadedContractEntry, address: string) => ({
        address,
        needsLoading: isNil(details),
      })),
      ({ needsLoading }) => needsLoading
    ),
    ({ address }) => address
  );

  await slowPromiseInSeries<void>(
    map(
      contractsToBeLoaded,
      (address: string): (() => Promise<void>) => async () => {
        updateFunction({ currentAddress: address });
        contracts[address].details = await downloadVerifiedContract(address);
      }
    ),
    waitFor
  );

  return {
    ...verifiedSmartContracts,
    contracts,
  };
};


const importPageToDownloadedContractList = async (
  verifiedSmartContracts: DownloadedContractList,
  page?: number
): Promise<{
  updated: DownloadedContractList,
  loadedNewEntry: boolean,
}> => {
  const verifiedSmartContractList = await downloadVerifiedContractPage(page);

  const contracts = { ...verifiedSmartContracts.contracts };
  let loadedNewEntry = false;

  forEach(verifiedSmartContractList, preview => {
    if (!contracts[preview.address]) {
      loadedNewEntry = true;
      contracts[preview.address] = {
        preview,
        lastUpdated: new Date(),
      };
      return;
    }

    contracts[preview.address].preview = preview;
    contracts[preview.address].lastUpdated = new Date();
  });

  return {
    updated: {
      ...verifiedSmartContracts,
      contracts,
    },
    loadedNewEntry,
  };
};

export const updateDownloadedContractList = async (
  verifiedSmartContracts: DownloadedContractList,
  { stopIfNoNewContract = true,
    waitFor,
    updateFunction = () => { }
  }: {
      stopIfNoNewContract: boolean,
      waitFor: number,
      updateFunction: UpdateFunction
    },
  page: number = 1,
  depthLeft: number = 5): Promise<DownloadedContractList> => {
  updateFunction({ currentPage: page });

  const {
    loadedNewEntry,
    updated
  } = await importPageToDownloadedContractList(verifiedSmartContracts, page);
  const loadedAndUpdated = await completeDownloadedContractList(updated, {
    waitFor,
    updateFunction,
  });

  await wait(waitFor);
  try {
    const updatedRecursively: DownloadedContractList = ((loadedNewEntry || !stopIfNoNewContract) && depthLeft > 0)
      ? await updateDownloadedContractList(
        loadedAndUpdated,
        { stopIfNoNewContract, waitFor, updateFunction },
        page + 1,
        depthLeft - 1
      )
      : loadedAndUpdated;

    return updatedRecursively;
  } catch (e) {
    updateFunction({ error: e });
    return loadedAndUpdated;
  }
};
