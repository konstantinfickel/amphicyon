import { AbstractNode, isNodeGenerator } from './Abstract';
import { Node } from '.';

export interface ModifierDeclaration extends AbstractNode {
  type: 'ModifierDeclaration';
  name: string;
  body: Node;
  params: Node[];
  modifiers: Node[];
}

export const isModifierDeclaration = isNodeGenerator<ModifierDeclaration>(
  'ModifierDeclaration',
);
