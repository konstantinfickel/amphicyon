import { reduce, isNumber } from 'lodash';

export const wait = (time: number) => new Promise((resolve) => setTimeout(resolve, time));

export const slowPromiseInSeries = async <T>(
  promiseGenerators: Array<() => Promise<T>>,
  time?: number
): Promise<T[]> =>
  reduce(
    promiseGenerators,
    async (lastPromise, newPromise): Promise<T[]> => {
      const previousResults = await lastPromise;
      if (isNumber(time)) {
        await wait(time);
      }
      const newResult = await newPromise();
      return [...previousResults, newResult];
    },
    Promise.resolve([] as T[])
  );
