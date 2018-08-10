import { AbstractNode, isNodeGenerator } from './Abstract';

export interface Identifier extends AbstractNode {
  type: 'Identifier';
  name: string;
}

export const isIdentifier = isNodeGenerator<Identifier>('Identifier');
