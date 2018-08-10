export default {
    analysis: {
        maximalLines: 400,
    },
    download: {
        waitFor: 1000,
    },
    bayes: {
        threshold: 4,
    },
    storage: {
        classifers: './data/bayes.json',
        contracts: './data/contracts.json',
        analysis: './data/analysis.json',
        manual: {
            classifiers: './data/bayes-generated.json',
            decisions: './data/manual/decisions.json',
            analysis: './data/manual/analysis.json',
            contracts: './data/manual/contracts.json'
        }
    }
};
