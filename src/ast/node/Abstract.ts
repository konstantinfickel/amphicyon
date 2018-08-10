import { has, isNumber } from 'lodash';

export interface AbstractNode {
  type: string;
  start: number;
  end: number;
};

export const isNodeGenerator = <T>(type: string) => (toBeTested: any): toBeTested is T =>
  has(toBeTested, 'type')
  && toBeTested.type === type
  && has(toBeTested, 'start')
  && isNumber(toBeTested.start)
  && has(toBeTested, 'end')
  && isNumber(toBeTested.end);
