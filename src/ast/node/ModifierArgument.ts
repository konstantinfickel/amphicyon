import { AbstractNode, isNodeGenerator } from './Abstract';

export interface ModifierArgument extends AbstractNode {
  type: 'ModifierArgument';
  name: string;
  body: undefined;
  params: any[];
}

export const isModifierArgument = isNodeGenerator<ModifierArgument>(
  'ModifierArgument',
);
