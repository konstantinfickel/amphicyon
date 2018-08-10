import { AbstractNode, isNodeGenerator } from './Abstract';

export interface ModifierName extends AbstractNode {
    type: 'ModifierName';
    name: string;
    params: Node[];
}

export const isModifierName = isNodeGenerator<ModifierName>(
    'ModifierName',
);