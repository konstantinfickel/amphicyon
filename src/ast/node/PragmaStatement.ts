import { AbstractNode, isNodeGenerator } from './Abstract';
import { VersionLiteral } from './VersionLiteral';

export interface PragmaStatement extends AbstractNode {
  type: 'PragmaStatement';
  start_version: VersionLiteral | null;
  end_version: VersionLiteral | null;
}

export const isPragmaStatement = isNodeGenerator<PragmaStatement>(
  'PragmaStatement',
);
