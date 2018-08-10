import { AbstractNode, isNodeGenerator } from './Abstract';

export interface InterfaceStatement extends AbstractNode {
    type: 'InterfaceStatement';
    name: string;
    is: Node[];
    body: Node;
}

export const isInterfaceStatement = isNodeGenerator<InterfaceStatement>(
    'InterfaceStatement',
);

