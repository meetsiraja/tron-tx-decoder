const axios = require('axios')
const { utils } = require('ethers')

const MAINNET_NODE = 'https://api.trongrid.io';
const TESTNET_NODE = 'https://api.shasta.trongrid.io'

class TronTxDecoder {

    /**
     * Create a TronTxDecoder object
     *
     * @param {Object} config the rootchain configuration object
     * @param {Web3} config.web3 a web3 instance
     * @param {string} config.plasmaContractAddress the address of the PlasmaFramework contract
     * @return {TronTxDecoder} a TronWeb object
     *
     */
    constructor ({ mainnet }) {
        mainnet ? this.tronNode = MAINNET_NODE : this.tronNode = TESTNET_NODE;
        // (this.tronWeb, this.tronNode) = initTronWeb(mainnet);
    }

    /**
     * Decode result data from the transaction hash
     *
     * @method decodeResultById
     * @param {string} transactionID the transaction hash
     * @return {Object} decoded result with method name
     */
    async decodeResultById(transactionID){

        try{
            let transaction = await _getTransaction(transactionID, this.tronNode);
            let data = '0x'+transaction.raw_data.contract[0].parameter.value.data;
            let contractAddress = transaction.raw_data.contract[0].parameter.value.contract_address;
            if(contractAddress === undefined)
                throw 'No Contract found for this transaction hash.';
            let abi = await _getContractABI(contractAddress, this.tronNode);

            const resultInput = _extractInfoFromABI(data, abi);
            let functionABI = abi.find(i => i.name === resultInput.method);

            if(!functionABI.outputs)
                return {
                    methodName: resultInput.method,
                    outputNames: {},
                    outputTypes: {},
                    decodedOutput: { _length: 0 }
                };
            let outputType = functionABI.outputs;
            const types = outputType.map(({type}) => type);
            const names = resultInput.namesOutput;
            names.forEach(function(n,l){this[l]||(this[l]=null);},names);

            var encodedResult = await _getHexEncodedResult(transactionID, this.tronNode);
            if(!encodedResult.includes('0x')){
                let resMessage = "";
                let i = 0, l = encodedResult.length;
                for (; i < l; i += 2) {
                    let code = parseInt(encodedResult.substr(i, 2), 16);
                    resMessage += String.fromCharCode(code);
                }

                return {
                    methodName: resultInput.method,
                    outputNames: names,
                    outputTypes: types,
                    decodedOutput: resMessage
                };
                
            }
           
            var outputs = utils.defaultAbiCoder.decode(types, encodedResult);
            let outputObject = {_length: types.length}
            for(var i=0; i<types.length; i++){
                let output = outputs[i]
                outputObject[i] = output;
            }
            return {
                methodName: resultInput.method,
                outputNames: names,
                outputTypes: types,
                decodedOutput: outputObject
            };

        }catch(err){
            throw new Error(err)
        }
    }

    /**
     * Decode result data from the transaction hash
     *
     * @method decodeResultById
     * @param {string} transactionID the transaction hash
     * @return {Object} decoded result with method name
     */
    async decodeInputById(transactionID){

        try{

            let transaction = await _getTransaction(transactionID, this.tronNode);
            let data = '0x'+transaction.raw_data.contract[0].parameter.value.data;
            let contractAddress = transaction.raw_data.contract[0].parameter.value.contract_address;
            if(contractAddress === undefined)
                throw 'No Contract found for this transaction hash.';
            let abi = await _getContractABI(contractAddress, this.tronNode);

            const resultInput = _extractInfoFromABI(data, abi);
            var names = resultInput.namesInput;
            var inputs = resultInput.inputs;
            var types = resultInput.typesInput;
            let inputObject = {_length: names.length};
            for(var i=0; i<names.length; i++){
                let input = inputs[i]
                inputObject[i] = input;
            }
            return {
                methodName: resultInput.method,
                inputNames: names,
                inputTypes: types,
                decodedInput: inputObject
            };

        }catch(err){
            throw new Error(err)
        }
    }

    /**
     * Decode revert message from the transaction hash (if any)
     *
     * @method decodeRevertMessage
     * @param {string} transactionID the transaction hash
     * @return {Object} decoded result with method name
     */
    async decodeRevertMessage(transactionID){

        try{

            let transaction = await _getTransaction(transactionID, this.tronNode);
            let contractAddress = transaction.raw_data.contract[0].parameter.value.contract_address;
            if(contractAddress === undefined)
                throw 'No Contract found for this transaction hash.';
            
            let txStatus = transaction.ret[0].contractRet;
            if(txStatus == 'REVERT'){
                let encodedResult = await _getHexEncodedResult(transactionID, this.tronNode)
                encodedResult = encodedResult.substring(encodedResult.length - 64, encodedResult.length);
                let resMessage = (Buffer.from(encodedResult, 'hex').toString('utf8')).replace(/\0/g, '');

                return {
                    txStatus: txStatus,
                    revertMessage: resMessage.replace(/\0/g, '')
                };

            } else {
                return {
                    txStatus: txStatus,
                    revertMessage: ''
                };
            }
            
        }catch(err){
            throw new Error(err)
        }
    }
}

async function _getTransaction(transactionID, tronNode){
    try{
        const transaction = await axios.post(`${tronNode}/wallet/gettransactionbyid`, { value: transactionID});
        if (!Object.keys(transaction.data).length)
            throw 'Transaction not found';
        return transaction.data
    }catch(error){
        throw error;
    }
}

async function _getHexEncodedResult(transactionID, tronNode){
    try{
        const transaction = await axios.post(`${tronNode}/wallet/gettransactioninfobyid`, { value: transactionID});
        if (!Object.keys(transaction.data).length)
            throw 'Transaction not found';
        return "" == transaction.data.contractResult[0] ? transaction.data.resMessage : "0x"+transaction.data.contractResult[0];
    }catch(error){
        throw error;
    }    
}


async function _getContractABI(contractAddress, tronNode){
    try{
        const contract = await axios.post(`${tronNode}/wallet/getcontract`, { value: contractAddress});
        if (contract.Error)
            throw 'Contract does not exist';
        return contract.data.abi.entrys;
    }catch(error){
        throw error;
    }
}

function _genMethodId (methodName, types) {
    const input = methodName + '(' + (types.reduce((acc, x) => {
      acc.push(_handleInputs(x))
      return acc
    }, []).join(',')) + ')'
  
    return utils.keccak256(Buffer.from(input)).slice(2, 10)
}

function _extractInfoFromABI(data, abi){

    const dataBuf = Buffer.from(data.replace(/^0x/, ''), 'hex');

    const methodId = Array.from(dataBuf.subarray(0, 4), function (byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
    
    var inputsBuf = dataBuf.subarray(4);

    return abi.reduce((acc, obj) => {
        if (obj.type === 'constructor') return acc
        if (obj.type === 'event') return acc
        const method = obj.name || null
        let typesInput = obj.inputs ? obj.inputs.map(x => {
          if (x.type === 'tuple[]') {
            return x
          } else {
            return x.type
          }
        }) : [];

        let typesOutput = obj.outputs ? obj.outputs.map(x => {
            if (x.type === 'tuple[]') {
              return x
            } else {
              return x.type
            }
          }) : []

        let namesInput = obj.inputs ? obj.inputs.map(x => {
            if (x.type === 'tuple[]') {
              return ''
            } else {
              return x.name
            }
        }) : [];

        let namesOutput = obj.outputs ? obj.outputs.map(x => {
            if (x.type === 'tuple[]') {
                return ''
            } else {
                return x.name
            }
        }) : []
        const hash = _genMethodId(method, typesInput)
        if (hash === methodId) {
            let inputs = []
            
            inputs = utils.defaultAbiCoder.decode(typesInput, inputsBuf);

            return {
              method,
              typesInput,
              inputs,
              namesInput,
              typesOutput,
              namesOutput
            }
        }
        return acc;
    }, { method: null, typesInput: [], inputs: [], namesInput: [], typesOutput:[], namesOutput:[] });
}

function _handleInputs (input) {
    let tupleArray = false
    if (input instanceof Object && input.components) {
        input = input.components
        tupleArray = true
    }

    if (!Array.isArray(input)) {
        if (input instanceof Object && input.type) {
        return input.type
        }

        return input
    }

    let ret = '(' + input.reduce((acc, x) => {
        if (x.type === 'tuple') {
        acc.push(handleInputs(x.components))
        } else if (x.type === 'tuple[]') {
        acc.push(handleInputs(x.components) + '[]')
        } else {
        acc.push(x.type)
        }
        return acc
    }, []).join(',') + ')'

    if (tupleArray) {
        return ret + '[]'
    }
}
module.exports = TronTxDecoder;
