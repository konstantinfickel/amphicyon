import { AbstractNode, isNodeGenerator } from './Abstract';
import { Node } from '.';

export interface InformalParameter extends AbstractNode {
    type: 'InformalParameter';
    body: Node[];
    literal: Node;
    id: string;
    is_indexed: boolean;
    is_storage: boolean;
    is_memory: boolean;
}

export const isInformalParameter = isNodeGenerator<InformalParameter>(
    'InformalParameter',
);
