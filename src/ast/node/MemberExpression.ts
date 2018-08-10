import { Node } from '.';
import { AbstractNode, isNodeGenerator } from './Abstract';

export interface MemberExpression extends AbstractNode {
  type: 'MemberExpression';
  object: Node;
  property: Node;
  computed: boolean;
}

export const isMemberExpression = isNodeGenerator<MemberExpression>(
  'MemberExpression',
);
