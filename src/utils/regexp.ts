const makeGlobal = (regexp: RegExp): RegExp => {
  const modifiedFlags = `${regexp.flags.replace(/y|g/, '')}g`;
  return new RegExp(regexp, modifiedFlags);
}

export const matchAll = (regexp: RegExp, text: string) => {
  const globalRegexp = makeGlobal(regexp);

  const matches: any[] = [];
  let nextMatch;
  while (nextMatch = globalRegexp.exec(text)) {
    matches.push(nextMatch);
  }

  return matches;
};