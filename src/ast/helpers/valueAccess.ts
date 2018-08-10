import { Node, isCallExpression, isMemberExpression, isIdentifier } from "../node";

export const isValueAccess = (node: Node, checkForGas: boolean = true): boolean => {
    if (isCallExpression(node)) {
        const callee = node.callee;
        if (isMemberExpression(callee)) {
            const property = callee.property;
            if (
                isIdentifier(property)
                && (property.name === 'value' || (checkForGas && property.name === 'gas'))
            ) {
                return true;
            }
        }
    }
    return false;
}

