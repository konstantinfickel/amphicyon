import { Node } from '.';
import { AbstractNode, isNodeGenerator } from './Abstract';

export interface ConstructorDeclaration extends AbstractNode {
  type: 'ConstructorDeclaration';
  params: Node[];
  modifiers: Node[];
  body: Node;
}

export const isConstructorDeclaration = isNodeGenerator<ConstructorDeclaration>(
  'ConstructorDeclaration',
);
