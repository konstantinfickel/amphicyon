interface BayesConditionalAmounts {
  ifFound: number;
  ifNotFound: number;
}

export interface BayesAmounts {
  harmless: BayesConditionalAmounts;
  honeypot: BayesConditionalAmounts;
}

export type BayesClassifiers = Record<string, BayesAmounts>;

export type Bayes = {
  amounts: {
    harmless: number,
    honeypot: number,
  },
  classifiers: BayesClassifiers,
};
