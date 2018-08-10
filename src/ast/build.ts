import { readFile } from 'fs-extra';
import { isNil, map } from 'lodash';
import { resolve } from 'path';
import * as peg from 'pegjs';
import { AST, Comment } from '.';
import { matchAll } from '../utils/regexp';

export const parseComments = (sourceCode: string): Comment[] => {
  const commentMatches = matchAll(
    /\/\*((?:\*(?!\/)|[^*])*)\*\/|\/\/(.*)$/gm,
    sourceCode,
  );

  return map(
    commentMatches,
    (match): Comment => {
      const generalMatchInformation = {
        start: match.index,
        end: match.index + match[0].length,
      };

      return !isNil(match[1])
        ? {
          text: match[1],
          type: 'Block',
          ...generalMatchInformation,
        }
        : {
          text: match[2],
          type: 'Line',
          ...generalMatchInformation,
        };
    },
  );
};

export const generateAstParser = async () => {
  const parser = peg.generate(
    await readFile(resolve('./grammars/solidity.pegjs'), 'utf8'),
  );

  return (sourceCode: string): AST => {
    // Horrible hack to parser not terminating with depth too deep...
    if (/\.add[\s]*([(][^)]+){4,}/.test(sourceCode)) {
      console.log(sourceCode);
      throw new Error('Parser would not terminate on this!');
    }

    return {
      ...parser.parse(sourceCode),
      comments: parseComments(sourceCode),
    }
  };
};
