import {
  BlockStatement,
  isIfStatement,
  Node
} from '..';
import { isCallExpression, isIdentifier, isThrowStatement } from '../node';
import { Trace, walk, getCurrentElement } from '../walk';

export const statementOnlyContainsIf = (node: BlockStatement): Node | null => {
  if (node.body.length !== 1) {
    return null;
  }
  const singleBodyNode = node.body[0];

  if (isIfStatement(singleBodyNode) && !singleBodyNode.alternate) {
    return singleBodyNode.test;
  }

  return null;
};

export const isRequireNode = (node: Node) => {
  if (
    isCallExpression(node)
    && isIdentifier(node.callee)
    && (node.callee.name === 'require' || node.callee.name === 'assert')
    && node.arguments.length > 0
  ) {
    return node.arguments[0];
  }

  return null;
};

export const isRevertExpression = (node: Node): boolean =>
  isCallExpression(node) && isIdentifier(node.callee) && node.callee.name === 'revert';

const containsRevert = (node: Node): boolean => walk<boolean>(node, {
  enter: (trace: Trace, context: boolean) => {
    if (context) {
      return { context, skipSubtree: true };
    } else {
      const currentNode = getCurrentElement(trace);

      if (
        isRevertExpression(currentNode)
        || isThrowStatement(currentNode)
      ) {
        return { context: true, skipSubtree: true }
      }
    }

    return { context };
  }
}, false)

export const isRevertingIfExpression = (node: Node): Node | null => {
  if (isIfStatement(node) && containsRevert(node.consequent)) {
    return node.test;
  }

  return null;
};