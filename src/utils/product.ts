import { flatten, map } from 'lodash';

export const crossProduct = <T, P>(leftSide: T[], rightSide: P[]): Array<[T, P]> => flatten<[T, P]>(
  map(leftSide, leftElement => map(rightSide, rightElement => [leftElement, rightElement] as [T, P]))
);
