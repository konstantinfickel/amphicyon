export * from './BinaryExpression';
export * from './CallExpression';
export * from './Identifier';
export * from './IfStatement';
export * from './MemberExpression';
export * from './ModifierArgument';
export * from './ThisExpression';
export * from './ContractStatement';
export * from './ConstructorDeclaration';
export * from './FunctionDeclaration';
export * from './StateVariableDeclaration';
export * from './Type';
export * from './AssignmentExpression';
export * from './DeclarativeExpression';
export * from './ModifierName';
export * from './VersionLiteral';
export * from './PragmaStatement';
export * from './Literal';
export * from './StructDeclaration';
export * from './BlockStatement';
export * from './ModifierDeclaration';
export * from './ThrowStatement';
export * from './MappingExpression';
export * from './InformalParameter';
export * from './InterfaceStatement';

import { BinaryExpression } from './BinaryExpression';
import { CallExpression } from './CallExpression';
import { Identifier } from './Identifier';
import { IfStatement } from './IfStatement';
import { MemberExpression } from './MemberExpression';
import { ModifierArgument } from './ModifierArgument';
import { ThisExpression } from './ThisExpression';
import { ContractStatement } from './ContractStatement';
import { ConstructorDeclaration } from './ConstructorDeclaration';
import { FunctionDeclaration } from './FunctionDeclaration';
import { StateVariableDeclaration } from './StateVariableDeclaration';
import { Type } from './Type';
import { AssignmentExpression } from './AssignmentExpression';
import { DeclarativeExpression } from './DeclarativeExpression';
import { ModifierName } from './ModifierName';
import { VersionLiteral } from './VersionLiteral';
import { PragmaStatement } from './PragmaStatement';
import { Literal } from './Literal';
import { StructDeclaration } from './StructDeclaration';
import { BlockStatement } from './BlockStatement';
import { ModifierDeclaration } from './ModifierDeclaration';
import { ThrowStatement } from './ThrowStatement';
import { MappingExpression } from './MappingExpression';
import { InformalParameter } from './InformalParameter';

import { InterfaceStatement } from './InterfaceStatement';
import { AST } from '..';

export type Node =
  | BinaryExpression
  | CallExpression
  | Identifier
  | IfStatement
  | MemberExpression
  | ModifierArgument
  | ContractStatement
  | ThisExpression
  | FunctionDeclaration
  | StateVariableDeclaration
  | Type
  | ConstructorDeclaration
  | AssignmentExpression
  | ModifierName
  | VersionLiteral
  | PragmaStatement
  | Literal
  | StructDeclaration
  | BlockStatement
  | ModifierDeclaration
  | ThrowStatement
  | MappingExpression
  | InformalParameter
  | InterfaceStatement
  | DeclarativeExpression
  | AST;
