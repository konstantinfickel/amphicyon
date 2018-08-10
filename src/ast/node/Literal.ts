import { AbstractNode, isNodeGenerator } from './Abstract';

export interface Literal extends AbstractNode {
  type: 'Literal';
  value: any;
}

export const isLiteral = isNodeGenerator<Literal>(
  'Literal',
);
