import { AbstractNode, isNodeGenerator } from './Abstract';
import { Node } from '.';

export interface StructDeclaration extends AbstractNode {
  type: 'StructDeclaration';
  name: string;
  body: Node[];
}

export const isStructDeclaration = isNodeGenerator<StructDeclaration>(
  'StructDeclaration',
);
