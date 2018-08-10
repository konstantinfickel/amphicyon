import { AbstractNode, isNodeGenerator } from './Abstract';
import { Node } from '.';

export interface BlockStatement extends AbstractNode {
    type: 'BlockStatement';
    body: Node[],
}

export const isBlockStatement = isNodeGenerator<BlockStatement>(
    'BlockStatement',
);
