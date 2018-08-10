import { AbstractNode, isNodeGenerator } from './Abstract';

export interface VersionLiteral extends AbstractNode {
    type: 'VersionLiteral';
    operator: string;
    version: string;
}

export const isVersionLiteral = isNodeGenerator<VersionLiteral>(
    'VersionLiteral',
);
