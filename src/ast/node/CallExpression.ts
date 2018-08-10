import { Node } from '.';
import { AbstractNode, isNodeGenerator } from './Abstract';

export interface CallExpression extends AbstractNode {
  type: 'CallExpression';
  callee: Node;
  arguments: Node[];
}

export const isCallExpression = isNodeGenerator<CallExpression>(
  'CallExpression',
);
