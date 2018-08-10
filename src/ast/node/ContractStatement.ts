import { Node } from '.';
import { AbstractNode, isNodeGenerator } from './Abstract';
import { ModifierName } from './ModifierName';

export interface ContractStatement extends AbstractNode {
  type: 'ContractStatement';
  name: string;
  body: Node[];
  is: ModifierName[];
  arguments: Node[];
}

export const isContractStatement = isNodeGenerator<ContractStatement>(
  'ContractStatement',
);
