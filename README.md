<p align="center">
<img src="https://tron.network/static/images/logo.png" width=400 />
</p>

## tron-tx-decoder

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com) ![npm](https://img.shields.io/npm/v/tron-tx-decoder) ![npm bundle size](https://img.shields.io/bundlephobia/min/tron-tx-decoder) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT) 

Lightweight utility for decoding function parameters and function output from Tron blocklchain transactions.

- Minimal dependencies.

- Find the input parameter passed to function by Transaction Id.

- Find the exact output returned from the function by Transaction Id.


- _[Built with ethers.js](https://github.com/ethers-io/ethers.js/)_.

## Installation

```bash
npm i tron-tx-decoder
```

### Initialization

```js
const TronTxDecoder = require('tron-tx-decoder');

const decoder = new TronTxDecoder({ mainnet: true });
// { mainnet: false } for testnet
```

#### Decode Input:
Decode funciton input parameters by passing transaction id.
```js
async function decodeTxInput(txId){
    const decodedInput = await decoder.decodeInputById(txId);
    return decodedInput;
}

decodeTxInput("0c739761b34a891b3bbecd528302de827736660d76c62dacf8d3a9ebe7dade08").then(console.log);
// { 
//    methodName: 'submitTheGame',
//    decodedInput: 
//     [ { '_betId (uint256)': BigNumber { _hex: '0x265aa6' } },
//       { 'freshHouseSeed (address)': '0x8F476d1155E9910A885Cae1c4396BDD392c3883E' },
//       { 'rollResult (uint8)': 11 },
//       { '_gameOutcome (uint8)': 1 } ] 
// }
```

#### Decode Output:
Decode funciton outputs by passing transaction id.

```js
async function decodeTxOutput(txId){
    const decodedOutput = await decoder.decodeResultById(txId);
    return decodedOutput;
}

decodeTxOutput("0c739761b34a891b3bbecd528302de827736660d76c62dacf8d3a9ebe7dade08").then(console.log);
// { 
//    methodName: 'submitTheGame',
//    decodedOutput: 
//      [ { uint256: BigNumber { _hex: '0x265aa6' } },
//        { uint256: BigNumber { _hex: '0x0615ec20' } } ] 
// }
```




### BigNumber

- BigNumber can be converted to number using  ***prototype*** .toNumber(). Which return a JavaScript number of the value.

- [BigNumber Documentation (ethers.js)](https://docs.ethers.io/ethers.js/html/api-utils.html#big-numbers)

### Contributing

- Issues & Pull requests are welcome! Fork, branch, and submit PR.

### Licence

[MIT](https://github.com/meetsiraja/tron-tx-decoder/LICENCE.md)

