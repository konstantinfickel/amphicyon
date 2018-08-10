import { AbstractNode, isNodeGenerator } from './Abstract';

export interface DeclarativeExpression extends AbstractNode {
    type: 'DeclarativeExpression';
    name: string;
    literal: Node;
    storage_location: 'storage' | 'memory' | null;
}

export const isDeclarativeExpression = isNodeGenerator<DeclarativeExpression>('DeclarativeExpression');
