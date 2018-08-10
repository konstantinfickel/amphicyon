import { AbstractNode, isNodeGenerator } from './Abstract';

export interface ThisExpression extends AbstractNode {
  type: 'ThisExpression';
}

export const isThisExpression = isNodeGenerator<ThisExpression>(
  'ThisExpression',
);
