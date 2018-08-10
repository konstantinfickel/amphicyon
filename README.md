![Amphicyon Logo](./logo/amphicyon.png)

# amphicyon

Using static code-analysis to detect honeypots.

*Amphicion* is the name of an extinct mammal, that looked like a mixture of a bear of a dog. This matches the tool, which combines the instincts of a bear to find honeypots, combined with the searching qualities of a dog. ;)

Logo inspired by [a reconstruction of the animal by Roman Uchytel](https://ru.wikipedia.org/wiki/%D0%A4%D0%B0%D0%B9%D0%BB:Amphicyon-ingens_reconstruction.jpg).

Part of [my bachelor's thesis](https://github.com/konstantinfickel/securityofsmartcontracts).

## Design Rationale

### Why does this tool scan from Etherscan?
Because usually honeypot contract source-codes are uploaded to Etherscan to be found by potential victims, which makes it an ideal place to scan for new contracts.

### Why use a Bayesian Spam filter?
To have a way to naturally handle ambiguoes classifiers and to improve detection over time by supervised learning.

The implementation details were taken from [c't 17/2003, page 150](https://shop.heise.de/katalog/spam-oder-nicht-spam).

### Why is this tool is looking at the Solidity code instead of EVM bytecode?
Many solidity contract analysis tools use the Ethereum Virtual Machine bytecode to analyze smart contracts, to enable them to check all contracts deployed to the blockchain.

But for honeypot smart contracts, this is possible, because creators **do want** their honeypots to be fund, which makes them post them on platforms like Etherscan. Additionally, since most honeypots rely on misunderstandings of Solidity, those can be detected easier using the source code.

## Usage
### Building classifiers
```
yarn run classifiers:update
```

### Analyzing smart contracts
```
yarn run contract:analyze "<address>"
```
or
```
yarn run contract:analyze "<file>"
```

### Download and analyze current verified contracts from Etherscan
```
yarn run database:update
```

### Check those downloaded contracts for Honeypots
```
yarn run database:find
```

## Non-Obvious Credits
* Solium Project for `peg.js`-files to build AST for Solidity
* Inspired by `tslint`, `Solium` and `ReMix`
* Dependencies in `package.json`

## Why not expand existing Linter / Analysis Tool
* Solium: JavaScript-Codebase, making great-scale development difficult; very different approach (classifying contracts instead of marking mistakes)
* ReMix: Same as Solium; Dependency on `solc`.

## Ideas for further checks
* ReEntrancy (often used as bait)
* useless if-checks (bad practice to trap ether)
* Multi-Step initialization (often used by honeypots to do internal calls during the process)

