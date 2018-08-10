import { Node } from '.';
import { AbstractNode, isNodeGenerator } from './Abstract';
import { ModifierArgument } from './ModifierArgument';

export interface FunctionDeclaration extends AbstractNode {
  type: 'FunctionDeclaration';
  name: string;
  params: Node[];
  modifiers: ModifierArgument[];
  returnParams: Node[];
  isAbstract: boolean;
  body: Node[];
}

export const isFunctionDeclaration = isNodeGenerator<FunctionDeclaration>(
  'FunctionDeclaration',
);
