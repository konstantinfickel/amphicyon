import { Node } from '.';
import { AbstractNode, isNodeGenerator } from './Abstract';

export interface IfStatement extends AbstractNode {
    type: 'IfStatement';
    test: Node;
    consequent: Node;
    alternate?: Node;
}

export const isIfStatement = isNodeGenerator<IfStatement>('IfStatement');
