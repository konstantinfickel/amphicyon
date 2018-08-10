import { Node, InformalParameter, isInformalParameter, isFunctionDeclaration, FunctionDeclaration, ConstructorDeclaration, ModifierDeclaration, isType, isMappingExpression, isConstructorDeclaration, isModifierDeclaration } from "../node";
import { isEmpty, map } from 'lodash';

const normalizeType = (type: string) => {
    if (type === 'uint') {
        return 'uint256';
    } else if (type === 'int') {
        return 'int256';
    }
    return type;
}

const informalParameterToString = (parameter: InformalParameter) => {
    if (!isType(parameter.literal) || isMappingExpression(parameter.literal.literal)) {
        return 'unknown';
    }
    const type = normalizeType(parameter.literal.literal);

    return isEmpty(parameter.literal.array_parts)
        ? type
        : `${type}[]`;
}

const buildParameterList = (parameters: Node[]) => {
    return map(parameters, (parameter) => {
        if (!isInformalParameter(parameter)) {
            return 'unknown';
        }
        return informalParameterToString(parameter);
    }).join(',');
}

export const getFunctionIdentifier = (
    node: FunctionDeclaration | ConstructorDeclaration | ModifierDeclaration,
    contractName: string
): string => {
    if (isConstructorDeclaration(node) || (isFunctionDeclaration(node) && node.name === contractName)) {
        return `constructor (${buildParameterList(node.params)})`;
    } else if (isModifierDeclaration(node)) {
        return `modifier ${node.name}(${buildParameterList(node.params)})`;
    }
    return `${node.name || 'default '}(${buildParameterList(node.params)})`;
}
