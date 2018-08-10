import { AbstractNode, isNodeGenerator } from './Abstract';
import { Node } from '.';

export interface MappingExpression extends AbstractNode {
  type: 'MappingExpression';
  from: Node;
  to: Node;
}

export const isMappingExpression = isNodeGenerator<MappingExpression>(
  'MappingExpression',
);
