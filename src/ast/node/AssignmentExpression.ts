import { Node } from '.';
import { AbstractNode, isNodeGenerator } from './Abstract';

export interface AssignmentExpression extends AbstractNode {
  type: 'AssignmentExpression';
  left: Node;
  right: Node;
  operator: string;
}

export const isAssignmentExpression = isNodeGenerator<AssignmentExpression>(
  'AssignmentExpression',
);
