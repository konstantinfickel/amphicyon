import {
  forEach,
  has,
  isArray,
  isNumber,
  isString,
  last,
  reduce,
} from 'lodash';
import { Node } from './node';

export interface TraceEntry {
  node: Node;
  propertyName?: string;
  position?: number;
}

export const getCurrentElement = (trace: Trace): Node =>
  (last(trace) as TraceEntry).node;

export type Trace = TraceEntry[];

export interface AstWalker<T> {
  enter?: (trace: Trace, context: T) => { context: T, skipSubtree?: boolean };
  leave?: (trace: Trace, context: T) => { context: T };
}

export const isAstNode = (toBeTested: any, type?: string): toBeTested is Node =>
  has(toBeTested, 'type') &&
  (type ? toBeTested.type === type : isString(toBeTested.type)) &&
  has(toBeTested, 'start') &&
  isNumber(toBeTested.start) &&
  has(toBeTested, 'end') &&
  isNumber(toBeTested.end);

export const mapChildren = <T>(
  astNode: Node,
  callBack: (astNode: Node, propertyName: string, position: number) => T,
): T[] => {
  const results: T[] = [];
  forEach(astNode, (propertyValue: any, propertyName: string) => {
    if (isArray(propertyValue)) {
      forEach(propertyValue, (entryValue, entryKey) => {
        if (isAstNode(entryValue)) {
          results.push(callBack(entryValue, propertyName, entryKey));
        }
      });
    } else if (isAstNode(propertyValue)) {
      results.push(callBack(propertyValue, propertyName, 0));
    }
  });
  return results;
};

const walkDescendants = <T>(
  trace: Trace,
  context: T,
  astWalker: AstWalker<T>,
): T => {
  const { context: contextAfterEnter, skipSubtree } =
    astWalker.enter != null ? astWalker.enter(trace, context) : { context, skipSubtree: false };

  const children = mapChildren(
    (last(trace) as TraceEntry).node,
    (node, propertyName, position): TraceEntry => ({
      node,
      propertyName,
      position,
    }),
  );

  const contextAfterChildren: T = !skipSubtree
    ? reduce(
      children,
      (currentContext: T, child: TraceEntry) =>
        walkDescendants([...trace, child], currentContext, astWalker),
      contextAfterEnter,
    )
    : contextAfterEnter;

  const { context: contextAfterLeave }: { context: T } =
    astWalker.leave != null
      ? astWalker.leave(trace, contextAfterChildren)
      : { context: contextAfterChildren };

  return contextAfterLeave;
};

export const walk = <T>(node: Node, astWalker: AstWalker<T>, context: T) =>
  walkDescendants([{ node }], context, astWalker);
