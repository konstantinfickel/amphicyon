import { AbstractNode, isNodeGenerator } from './Abstract';

export interface ThrowStatement extends AbstractNode {
  type: 'ThrowStatement';
}

export const isThrowStatement = isNodeGenerator<ThrowStatement>(
  'ThrowStatement',
);
