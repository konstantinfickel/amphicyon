import { AbstractNode, isNodeGenerator } from './Abstract';

export interface StateVariableDeclaration extends AbstractNode {
  type: 'StateVariableDeclaration';
  literal: Node;
  name: string;
  visibility: string | null;
  is_constant: string;
  value: Node;
}

export const isStateVariableDeclaration = isNodeGenerator<StateVariableDeclaration>(
  'StateVariableDeclaration',
);
