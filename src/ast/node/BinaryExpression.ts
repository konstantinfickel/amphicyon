import { AbstractNode, isNodeGenerator } from './Abstract';
import { Node } from '.';

export interface BinaryExpression extends AbstractNode {
  type: 'BinaryExpression';
  operator: string;
  left: Node;
  right: Node;
}

export const isBinaryExpression = isNodeGenerator<BinaryExpression>(
  'BinaryExpression'
);
