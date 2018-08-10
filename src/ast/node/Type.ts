import { AbstractNode, isNodeGenerator } from './Abstract';
import { MappingExpression } from './MappingExpression';

export interface Type extends AbstractNode {
    type: 'Type';
    literal: string | MappingExpression;
    members: Node[];
    array_parts: Node[];
}

export const isType = isNodeGenerator<Type>(
    'Type',
);
