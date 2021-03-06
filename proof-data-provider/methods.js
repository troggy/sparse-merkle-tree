const config = require("config");
const SmtLib = require('./helpers/SmtLib.js');
const Web3 = require('web3');
const managerDB = require('./db.js');
const infuraId = config.get("infuraId");

//API methods(functions)
const Methods = {};
//Block#1. SaveTree. Create items into database.
//Item types:
//Type1 - item that is created by user sending directly sparse merkle tree's depth and leaves.
//Type2 - item that is created automatically regard to the configuration in strict format that is sending by user.

/**
 *  Function for creation a new item (type1) into database
 *  @function addTreeManually
 *  @param {Object} [params] Parameters from the request that was send by client(user)
 *  @param {Number} [params._depth] The depth of the sparse merkle tree, must be in a range from 8 to 256
 *  @param {Object} [params._leaves] The leaves of the sparse merkle tree, where keys and values data types must be strings.
 *  Keys must be a number in a range of depth's amount of bits.
 *  Values must be 32bytes only.
 *  @return {Number} Returns the index of the item that was created due to this request.
 */
 //Example:
 /*
 let params = {
   _depth: 160,
   _leaves : {
     "0x77111aaabbbcccdddeeeeffff000002222233333" : "0x99999888886666444444555577111aaabbbcccdddeeeeffff000002222233333",
     "0x783248686878ababacbaa67868765abcaef676af" : "0x09234892087a09789abcab0be00e876fe8608a0a0708807a6a88ca00676554bb",
     "0x893427b67b66768ac8bb8a676cbbe8f67ef78b8a" : "0x9897aacbe6bc6afba8ea8be8bc8ef6e8a8f6a8565761230912bc12e2ca123100"
   }
 }
 */
async function addTreeManually(params) {
  let _index = Math.round(Date.now() * Math.random());
  let exists = await managerDB.getItemByIndex(_index);
  while (exists != null) {
    _index = Math.round(Date.now() * Math.random());
    exists = await managerDB.getItemByIndex(_index);
  }
  await managerDB.putItemByIndex(_index.toString(), false, params._depth.toString(), 0, params._leaves, null);
  let result = _index;
  return result;

}

/**
 *  Function for autocreation a new item (type2) into database
 *  Creates an item with the same sparse merkle tree that already exists into smart contract that is deployed in Ethereum network.
 *  Requirements: Contract must have event with two parameters: first one key(path) of the smt and second one it's value. Event should be emitted every time the write into smt happens.
 *  @function addTreeFromContract
 *  @param {Object} [params] Parameters from the request that was send by client(user)
 *  @param {Object} [params._config] The configuration in the strict format that is filled by user with custom values.
 *  @param {Number} [params._config.smtDEPTH] The depth of the sparse merkle tree, that is used in smart contract.
 *  @param {String} [params._config.net] Ethereum network where smart contract was deployed. Must be one of the following ['mainnet', 'ropsten', 'kovan', 'rinkeby', 'goerli']
 *  @param {String} [params._config.contractAddress] The address of the smart contract that use sparse merkle tree. Must be ChecksumAddress.
 *  @param {Array} [params._config.contractABI] The smart contract's ABI that use sparse merkle tree.
 *  @param {String} [params._config.eventName] The name of the event that is described in requirements above. The second event's argument (value) data type must be bytes32. The first one (key) data type may be address or uint8...uint256 or bytes1...bytes32.
 *  @return {Number} Returns the index of the item that was created due to this request.
 */
 //Example:
 /*
 let params = {
   _config: {
     "smtDEPTH" : 160,
     "net" : "ropsten",
     "contractABI" : [{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256","name":"balance","type":"uint256"},{"internalType":"bytes","name":"proof","type":"bytes"}],"name":"balanceOf","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"internalType":"uint256","name":"sender_balance","type":"uint256"},{"internalType":"bytes","name":"sender_proof","type":"bytes"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"recipient_balance","type":"uint256"},{"internalType":"bytes","name":"recipient_proof","type":"bytes"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"root","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_initialSupply","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"_address","type":"address"},{"indexed":true,"internalType":"bytes32","name":"_value","type":"bytes32"}],"name":"Write","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"}],
     "eventName" : "Write",
     "contractAddress" : "0x89E5afFfC89185aF83Bc3aa02da227aCf30c9ACB"
   }
 }
 */
async function addTreeFromContract(params) {
    let config = params._config;
    let _index = Math.round(Date.now() * Math.random());
    let exists = await managerDB.getItemByIndex(_index);
    while (exists != null) {
      _index = Math.round(Date.now() * Math.random());
      exists = await managerDB.getItemByIndex(_index);
    }
    await managerDB.putItemByIndex(_index.toString(), true, config.smtDEPTH.toString(), 0, {}, config);
    await autoUpdate(_index);
    let result = _index;
    return result;
}

//Block#2. UpdateTree. Updates existing items.
//Type1 items are updated explicitly by user sending directly new data in request.
//Type2 items are updated automatically when user request different getProof methods.

/**
 *  Function for updating existing items (type1) into database
 *  Updates an item manually by taking key/value pairs from the user's request
 *  @function updateTreeManually
 *  @param {Object} [params] Parameters from the request that was send by client(user)
 *  @param {Number} [params._index] The index of the existing item type1, that user got when created a tree into provider's database.
 *  @param {Object} [params._leaves] The new key/value pairs and/or existing keys with new values, where keys and values data types must be strings.
 *  Keys must be a number in a range of depth's amount of bits.
 *  Values must be 32bytes only.
 *  @return {Boolean} Returns true as the result.
 */
 //Example:
 /*
 let params = {
   _index: 1575009568558,
   _leaves : {
     "0x77111aaabbbcccdddeeeeffff000002222233333" : "0xa0000000000000000000000000001aaabbbcccdddeeeeffff000002222211111",
     "0xaf87a887a878a7d878c7c77cdd65676a5af676af" : "0x09234892087a09789abcab0be00e876fe8608a0a0708807a6a88ca00676554bb",
     "0xababcbacbabbefefe676fe7f6e76a766f7e6efe6" : "0x9897aacbe6bc6afba8ea8be8bc8ef6e8a8f6a8565761230912bc12e2ca123100"
   }
 }
*/
async function updateTreeManually(params) {

  let item = await managerDB.getItemByIndex(params._index.toString());

  let depth = item.depth;
  let leaves = item.leaves;
  let new_leaves = params._leaves;
  let new_keys = Object.keys(new_leaves);
  for (let i = 0; i < new_keys.length; i++) {
    leaves[new_keys[i]] = new_leaves[new_keys[i]];
  }
  await managerDB.updateItem(params._index.toString(), depth, 0, leaves);

  return true;
}

/**
 *  Function for extra updating existing items (type2).
 *  The case when this function can be invoked is when proofs that user receives are incorrect.
 *  The case may happen if in the Ethereum blockchain occurs disagreement in miners competition.
 *  When chain was splitted autoUpdate function fetched the data from the chain that loses in the longest chain rule.
 *  Extra updates an item by taking Ethereum block number from the user's request
 *  @function extraUpdateTreeFromContract
 *  @param {Object} [params] Parameters from the request that was send by client(user)
 *  @param {Number} [params._index] The index of the existing item type2, that user got when created a tree into provider's database.
 *  @return {Boolean} Returns true as the result.
 */
 //Example:
 /*
 let params = {
   _index: 1575009568558
 }
*/
async function extraUpdateTreeFromContract(params) {
  let item = await managerDB.getItemByIndex(params._index.toString());
  await managerDB.updateItem(params._index, item.depth, 0, {});
  await autoUpdate(params._index);
  return true;
}

/**
 *  Internal Function for autoupdating existing items (type2) into database
 *  Updates an item every time when you user invokes different getProof methods by using event listener that takes data from Ethereum network.
 *  @function autoUpdate
 *  @param {Number} [_index] The index of the existing item type2
 *
 */
async function autoUpdate(_index) {
  let item = await managerDB.getItemByIndex(_index);
  //use eventListener
  if(item.status) {
    //check that config is correct
    let depth = item.depth;
    if (depth != item.config.smtDEPTH.toString()) {
      //invoke Server error -32000 to -32099
      return;
    }
    //set up web3
    let net = item.config.net;
    let provider = `https://${net}.infura.io/v3/${infuraId}`;
    let web3 = new Web3(provider);
    //fetch data from db
    let blockNumber = item.blockNumber;
    let leaves = item.leaves;
    //set up contract and event listener to fetch data from Ethereum
    const contract = new web3.eth.Contract(item.config.contractABI, item.config.contractAddress);
    let events = await contract.getPastEvents(item.config.eventName, {fromBlock: blockNumber});
    for (let i = 0; i < events.length; i++) {
      blockNumber = events[i].blockNumber;
      leaves[events[i].returnValues[0]] = events[i].returnValues[1]; //think about types
    }
    await managerDB.updateItem(_index, depth, blockNumber, leaves);
  }
}

//Block#3. GetProof. Gets proof/s from sparse merkle trees.
//Several methods are presented depends on user's needs.
//Methods are marked as "Option+OrderNumber" (shorthand "Op0").


/**
 *  Option1. Function for getting one proof for one key.
 *  @function getProofOp1
 *  @param {Object} [params] Parameters from the request that was send by client(user)
 *  @param {Number} [params._index] The index of the existing item (tree), that user got when created a tree into provider's database.
 *  @param {String} [params._key] The sparse merkle tree's key(path) that proof is required.
 *  Key must be a number in a range of depth's amount of bits.
 *  @return {String} Returns a proof for the key in input as the result.
 */
 //Example:
 /*
 let params = {
   _index: 1575009568558,
   _key : "0x77111aaabbbcccdddeeeeffff000002222233333"
 }
*/
async function getProofOp1(params) {
  let item = await managerDB.getItemByIndex(params._index);
  if (item.status) {
    await autoUpdate(params._index);
  }
  let tree = new SmtLib(item.depth, item.leaves);
  let proof = tree.createMerkleProof(params._key);
  return proof;
}

/**
 *  Option2. Function for getting several proofs for several keys.
 *  @function getProofOp2
 *  @param {Object} [params] Parameters from the request that was send by client(user)
 *  @param {Number} [params._index] The index of the existing item (tree), that user got when created a tree into provider's database.
 *  @param {Array} [params._keys] The array of the sparse merkle tree's keys(path) that proofs is required.
 *  Keys must be a number in a range of depth's amount of bits.
 *  @return {Array} Returns an array of proofs for the keys in the same order as keys was received.
 */
 //Example:
/*
 let params = {
   _index: 1575009568558,
   _keys: [
     "0x77111aaabbbcccdddeeeeffff000002222233333",
     "0x567a565765765ca765c5e67fefefe6765eaadd6d",
     "0xbcbabcabcefefeacbcabc6eb66bc6eb5b4abce44",
     "0xebebabcabecbebc346ce754abddbdbaeb2542b13"
   ]
 }
*/
async function getProofOp2(params) {
  let item = await managerDB.getItemByIndex(params._index);
  if (item.status) {
    await autoUpdate(params._index);
  }
  let tree = new SmtLib(item.depth, item.leaves);
  let proofs = [];
  for (let i = 0; i < params._keys.length; i++) {
    proofs.push(tree.createMerkleProof(params._keys[i]));
  }
  return proofs;
}

/**
 *  Option3. Function for getting one proof for one key with the condition of changing another one key/value pair or several key/value pairs in the tree.
 *  @function getProofOp3
 *  @param {Object} [params] Parameters from the request that was send by client(user)
 *  @param {Number} [params._index] The index of the existing item (tree), that user got when created a tree into provider's database.
 *  @param {String} [params._key] The sparse merkle tree's key(path) that proof is required.
 *  Key must be a number in a range of depth's amount of bits.
 *  @param {Object} [params._condition] The new key/value pair/s or existing key/s with new value/s, where key and value data types must be strings.
 *  Key must be a number in a range of depth's amount of bits.
 *  Value must be 32bytes only.
 *  The condition itself doesn't change the current state of the tree into database.
 *  @return {String} Returns a proof for the key in input as the result.
 */
 //Example:
/*
let params = {
  _index: 1575293672452,
  _key: '0x812F4FB767d3291F3ad84433D251192cd644e913',
  _condition: {
    '0xcC692921A9D2327B61c3347EB4c07CED0cE7c61c' : '0x0000000000000000000000000000000000000000000000000000000000000328'
  }
}
*/
async function getProofOp3(params) {
  let item = await managerDB.getItemByIndex(params._index);

  if (item.status) {
    await autoUpdate(params._index);
  }
  let leaves = item.leaves;
  let condition_leaves = {};
  for (let k in leaves) {
    condition_leaves[k] = leaves[k];
  }
  let changed_keys = Object.keys(params._condition);
  for (let i = 0; i < changed_keys.length; i++) {
    condition_leaves[changed_keys[i]] = params._condition[changed_keys[i]];
  }
  let tree = new SmtLib(item.depth, condition_leaves);
  let proof = tree.createMerkleProof(params._key);
  return proof;
}


/**
 *  Option4. Function for getting several proofs for several keys with the condition of changing another one key/value pair or several key/value pairs in the tree.
 *  @function getProofOp4
 *  @param {Object} [params] Parameters from the request that was send by client(user)
 *  @param {Number} [params._index] The index of the existing item (tree), that user got when created a tree into provider's database.
 *  @param {Array} [params._keys] The array of the sparse merkle tree's keys(path) that proofs is required.
 *  Keys must be a number in a range of depth's amount of bits.
 *  @param {Object} [params._condition] The new key/value pair/s or existing key/s with new value/s, where key and value data types must be strings.
 *  Key must be a number in a range of depth's amount of bits.
 *  Value must be 32bytes only.
 *  The condition itself doesn't change the current state of the tree into database.
 *  @return {Array} Returns an array of proofs for the keys in the same order as keys was received.
 */
//Example:
/*
let params = {
  _index: 1575293672452,
  _keys: ['0xcC692921A9D2327B61c3347EB4c07CED0cE7c61c', '0xaa792921A9D2327B61c3347cc4c08CED0cE7c61c', '0xaa111111a8b153ec72c4281cc4c08CED0cE7c61c'],
  _condition: {
    '0x812F4FB767d3291F3ad84433D251192cd644e913' : '0x0000000000000000000000000000000000000000000000000000000000000a15'
  }
}
*/
async function getProofOp4(params) {
  let item = await managerDB.getItemByIndex(params._index);

  if (item.status) {
    await autoUpdate(params._index);
  }

  let leaves = item.leaves;
  let condition_leaves = {};
  for (let k in leaves) {
    condition_leaves[k] = leaves[k];
  }
  let changed_keys = Object.keys(params._condition);
  for (let i = 0; i < changed_keys.length; i++) {
    condition_leaves[changed_keys[i]] = params._condition[changed_keys[i]];
  }

  let tree = new SmtLib(item.depth, condition_leaves);
  let proofs = [];

  for (let i = 0; i < params._keys.length; i++) {
    proofs.push(tree.createMerkleProof(params._keys[i]));
  }
  return proofs;
}

Methods.addTreeManually = addTreeManually;
Methods.addTreeFromContract = addTreeFromContract;
Methods.updateTreeManually = updateTreeManually;
Methods.extraUpdateTreeFromContract = extraUpdateTreeFromContract;
Methods.getProofOp1 = getProofOp1;
Methods.getProofOp2 = getProofOp2;
Methods.getProofOp3 = getProofOp3;
Methods.getProofOp4 = getProofOp4;

//Internal functions that checks the correctness of the user's input params in the request for each method.
//If the check finds an error, the method will not be executed and user will get response with Invalid params error + data that describes the specific error.
//Purpose is to extend the messages of the code -32602 Invalid params
const inputErrors = {};

//Function for checking params for method addTreeManually
async function check_params_ctype1(params) {
  let result = {
    error: false,
    message: null
  };
  //check params structure
  if (Object.keys(params).length != 2) {
    if (Object.keys(params).length > 2) {
      result.error = true;
      result.message = "Too many keys in params. Should be only two: '_depth' and '_leaves'.";
      return result;
    } else {
      //here the amount of keys in params is less than two
      if (Object.keys(params).length === 0) {
        result.error = true;
        result.message = "No required keys in params. Should be two: '_depth' and '_leaves'.";
        return result;
      } else if (Object.keys(params).includes("_depth")) {
        result.error = true;
        result.message = "Missing required key '_leaves' in params.";
        return result;
      } else if (Object.keys(params).includes("_leaves")) {
        result.error = true;
        result.message = "Missing required key '_depth' in params.";
        return result;
      } else {
        //here there is one key in params but not required
        result.error = true;
        result.message = "No required keys in params. Should be two: '_depth' and '_leaves'.";
        return result;
      }
    }
  } else {
    //here the amount of keys in params is correct, but need to check if values are correct
    if (!Object.keys(params).includes('_depth') || !Object.keys(params).includes('_leaves')) {
      result.error = true;
      result.message = "No required keys in params. Should be two: '_depth' and '_leaves'.";
      return result;
    }
  }
  //Here the params contains only two keys: _depth and _leaves.
  //check data types of _depth and _leaves
  if(typeof params._depth != 'number' || Object.prototype.toString.call(params._leaves) != '[object Object]') {
    if (typeof params._depth === 'number') {
      result.error = true;
      result.message = "Wrong data type of '_leaves'. Must be object.";
      return result;
    } else {
      result.error = true;
      result.message = "Wrong data type of '_depth'. Must be number.";
      return result;
    }
  }
  //Here the _depth data type is number and _leaves data type is object
  //check _depth number - must be in range from 8 to 256
  if (params._depth < 8 || params._depth > 256) {
    result.error = true;
    result.message = "Number of '_depth' must be in range from 8 to 256.";
    return result;
  }

  //Here the _depth is number in range(8, 256] and absolutely correct.
  //check if _leaves are empty
  if (Object.keys(params._leaves).length === 0) {
    return result;
  }

  let depth = params._depth;
  let maxnumber = BigInt(2 ** depth) - 1n;

  //check keys of _leaves
  for (let key in params._leaves) {
    let bN;
    try {
      bN = BigInt(key);
    } catch (e) {
      result.error = true;
      result.message = `"${key}" key in '_leaves' is not a number.`;
      return result;
    }
    if (bN > maxnumber) {
      result.error = true;
      result.message = `"${key}" key in '_leaves' is out of range of the tree's depth.`;
      return result;
    }
  }

  //Here all the keys in _leaves are absolutely correct.
  //check the values in _leaves
  for (let k in params._leaves) {
    let strRegex = "^0[xX][0-9a-fA-F]+$";
    let regex = new RegExp(strRegex);
    if (params._leaves[k].length != 66 || !(regex.test(params._leaves[k]))) {
      result.error = true;
      result.message = `Invalid format of the value by "${k}" key in '_leaves'. Valid format for values is "0x0000000000000000000000000000000000000000000000000000000000000000".`;
      return result;
    }
  }
  //Here all the checks were passed and as a result input is correct and method can be executed with this params.
  return result;
}

inputErrors.ctype1 = check_params_ctype1;

//Function for checking params for method addTreeFromContract
async function check_params_ctype2(params) {
  let result = {
    error: false,
    message: null
  }
  //check if the params have only one key
  if (Object.keys(params).length > 1) {
    result.error = true;
    result.message = 'Object "params" should have only one property - "_config"';
    return result;
  }
  //check if the key of params is _config
  if (!params.hasOwnProperty('_config')) {
    result.error = true;
    result.message = 'There is no required property "_config" in object "params".';
    return result;
  }

  let config = params._config;
  //check config data type
  if (Object.prototype.toString.call(config) != '[object Object]') {
    result.error = true;
    result.message = 'Wrong data type of "_config". Must be an object.';
    return result;
  }

  if (Object.keys(config).length > 5) {
    result.error = true;
    result.message = 'There are too many properties in object "_config". Must be five.';
    return result;
  }

  //check if the _config includes all the requiered keys
  let notIncluded = [];
  let requiredProperties = ['smtDEPTH', 'net', 'contractAddress', 'contractABI', 'eventName'];
  for (let i = 0; i < requiredProperties.length; i++) {
    if (!Object.keys(config).includes(requiredProperties[i])) {
      notIncluded.push(requiredProperties[i]);
    }
  }
  if (notIncluded.length > 0) {
    if (notIncluded.length === 1) {
      result.error = true;
      result.message = `Missing required parameter: ${notIncluded[0]} in the "_config".`;
      return result;
    } else {
      result.error = true;
      result.message = `Missing required parameters: ${notIncluded} in the "_config".`;
      return result;
    }
  }

  //check the value types of the required keys of _config

  //smtDEPTH must be a number in range from 8 to 256
  if (typeof config.smtDEPTH != 'number') {
    result.error = true;
    result.message = 'Invalid data type of the value by the key "smtDEPTH" into _config. Valid type is "number".';
    return result;
  } else if (config.smtDEPTH > 256 || config.smtDEPTH < 8) {
    result.error = true;
    result.message = 'The depth of the sparse merkle tree that is used in smart contracts should be in range from 8 to 256.';
    return result;
  }
  //net must be string value that is maintained by the Infura: 'mainnet', 'ropsten', 'kovan', 'rinkeby', 'goerli'.
  let validNetValues = ['mainnet', 'ropsten', 'kovan', 'rinkeby', 'goerli'];
  if (typeof config.net != 'string') {
    result.error = true;
    result.message = 'Invalid data type of the value by the key "net" into _config. Valid type is "string".';
    return result;
  } else if (!validNetValues.includes(config.net)) {
    result.error = true;
    result.message = `Invalid value by the key "net" into _config. Valid values are ${validNetValues}.`;
    return result;
  }
  //contractABI must be object - add checks and errors when executes, maybe like try catch
  if (typeof config.contractABI != 'object') {
    result.error = true;
    result.message = 'Invalid data type of the value by the key "contractABI" into _config. Valid type is "array".';
    return result;
  } else if (config.contractABI.length === 'undefined') {
    result.error = true;
    result.message = 'Invalid data type of the value by the key "contractABI" into _config. Valid type is "array".';
    return result;
  }
  //contractAddress must be a string with toChecksumAddress
  let strRegex = "^0[xX][0-9a-fA-F]+$";
  let regex = new RegExp(strRegex);
  if (typeof config.contractAddress != 'string') {
    result.error = true;
    result.message = 'Invalid data type of the value by the key "contractAddress" into _config. Valid type is "string".';
    return result;
  } else if (config.contractAddress.length != 42) {
    result.error = true;
    result.message = 'Invalid length of the value by the key "contractAddress" into _config.';
    return result;
  } else if (!regex.test(config.contractAddress)) {
    result.error = true;
    result.message = 'Invalid value by the key "contractAddress" into _config.';
    return result;
  }
  //eventName must be a string - add checks of user input when executes
  if (typeof config.eventName != 'string') {
    result.error = true;
    result.message = 'Invalid data type of the value by the key "eventName" into _config. Valid type is "string".';
    return result;
  }
  let eventNames = [];
  for (let i = 0; i < config.contractABI.length; i++) {
    if (config.contractABI[i].type === 'event') {
      eventNames.push(config.contractABI[i].name);
    }
  }
  if (!eventNames.includes(config.eventName)) {
    result.error = true;
    result.message = 'There is no such event name in a contractABI.';
    return result;
  }

  return result;
}

inputErrors.ctype2 = check_params_ctype2;

//Function for checking params for method updateTreeManually
async function check_params_utype1(params) {
  let result = {
    error: false,
    message: null
  }
  //check if the params have only two keys
  if (Object.keys(params).length > 2) {
    result.error = true;
    result.message = 'Object "params" should have only two properties - "_index" and "_leaves".';
    return result;
  }
  //check if the keys of params are _index and _leaves (can be improved with more detailed messages)
  if (!params.hasOwnProperty('_index') || !params.hasOwnProperty('_leaves')) {
    result.error = true;
    result.message = 'There is no required properties "_index" and/or "_leaves" in object "params".';
    return result;
  }
  //check if the item with input index exists
  let item = await managerDB.getItemByIndex(params._index.toString());
  if (item === null) {
    result.error = true;
    result.message = `Invalid index. There is no tree with "${params._index}" index.`;
    return result;
  }
  //check if the item is type1
  if (item.status) {
    //Blocking manually updating items that was created with config
    result.error = true;
    result.message = "You can't update tree that wasn't created manually.";
    return result;
  }

  //check the data type of _leaves
  if (Object.prototype.toString.call(params._leaves) != '[object Object]') {
    result.error = true;
    result.message = 'Invalid data type of "_leaves". Must be "object"';
    return result;
  }
  if (Object.keys(params._leaves).length === 0) {
    return result;
  }

  //check _leaves keys
  let depth = item.depth;
  let maxnumber = BigInt(2 ** depth) - 1n;

  for (let key in params._leaves) {
    let bN;
    try {
      bN = BigInt(key);
    } catch (e) {
      result.error = true;
      result.message = `This ${key} key in '_leaves' is not a number.`;
      return result;
    }
    if (bN > maxnumber) {
      result.error = true;
      result.message = `This ${key} key in '_leaves' is out of range of the tree's depth.`;
      return result;
    }
  }

  //check _leaves values
  for (let k in params._leaves) {
    let strRegex = "^0[xX][0-9a-fA-F]+$";
    let regex = new RegExp(strRegex);
    if (params._leaves[k].length != 66 || !(regex.test(params._leaves[k]))) {
      result.error = true;
      result.message = `Invalid format of the value by ${k} key in '_leaves'. Valid format for values is "0x0000000000000000000000000000000000000000000000000000000000000000".`;
      return result;
    }
  }

  return result;
}

inputErrors.utype1 = check_params_utype1;

//Function for checking params for method extraUpdateTreeFromContract
async function check_params_utype2(params) {
  let result = {
    error: false,
    message: null
  }
  //check if the params have only one key
  if (Object.keys(params).length > 1) {
    result.error = true;
    result.message = 'Object "params" should have only one property - "_index".';
    return result;
  }
  //check if the key of params is _index.
  if (!params.hasOwnProperty('_index')) {
    result.error = true;
    result.message = 'There is no required property "_index" in object "params".';
    return result;
  }
  //check if the item with input index exists
  let item = await managerDB.getItemByIndex(params._index.toString());
  if (item === null) {
    result.error = true;
    result.message = `Invalid index. There is no tree with "${params._index}" index.`;
    return result;
  }
  //check if the item is type2
  if (!item.status) {
    //Blocking updating items that was created manually
    result.error = true;
    result.message = "You can't use extra update method on tree that was created manually.";
    return result;
  }

  return result;
}

inputErrors.utype2 = check_params_utype2;

//Function for checking input params for method getProofOp1
async function check_params_gp1(params) {
  let result = {
    error: false,
    message: null
  }
  //check if the params have only two keys
  if (Object.keys(params).length > 2) {
    result.error = true;
    result.message = 'Object "params" should have only two properties - "_index" and "_key".';
    return result;
  }
  //check if the keys of params are _index and _key (can be improved with more detailed messages)
  if (!params.hasOwnProperty('_index') || !params.hasOwnProperty('_key')) {
    result.error = true;
    result.message = 'There is no required properties "_index" and/or "_key" in object "params".';
    return result;
  }
  //check data types of params keys
  if (typeof params._index != 'number' || typeof params._key != 'string') {
    if (typeof params._index === 'number') {
      result.error = true;
      result.message = 'Invalid data type of "_key". Must be a string.';
      return result;
    } else {
      result.error = true;
      result.message = 'Invalid data type of "_index". Must be a number.';
      return result;
    }
  }
  //check if the item by input's index exist
  let item = await managerDB.getItemByIndex(params._index);
  if (item === null) {
    result.error = true;
    result.message = `Invalid index. There is no tree with such ${params._index} index.`;
    return result;
  }

  //check _key value
  let depth = item.depth;
  let maxnumber = BigInt(2 ** depth) - 1n;

  let bN;
  try {
    bN = BigInt(params._key);
  } catch (e) {
    result.error = true;
    result.message = `This "${params._key}" key is not a number.`;
    return result;
  }
  if (bN > maxnumber) {
    result.error = true;
    result.message = `This "${params._key}" key is out of range of the tree's depth.`;
    return result;
  }
  return result;
}

inputErrors.gp1 = check_params_gp1;

//Function for checking params for method getProofOp2
async function check_params_gp2(params) {
  let result = {
    error: false,
    message: null
  }
  //check if the params have only two keys
  if (Object.keys(params).length > 2) {
    result.error = true;
    result.message = 'Object "params" should have only two properties - "_index" and "_keys".';
    return result;
  }
  //check if the keys of params are _index and _keys (can be improved with more detailed messages)
  if (!params.hasOwnProperty('_index') || !params.hasOwnProperty('_keys')) {
    result.error = true;
    result.message = 'There is no required properties "_index" and/or "_keys" in object "params".';
    return result;
  }
  //check data types of params keys
  if (typeof params._index != 'number' || Object.prototype.toString.call(params._keys) != '[object Array]') {
    if (typeof params._index === 'number') {
      result.error = true;
      result.message = 'Invalid data type of "_keys". Must be an array.';
      return result;
    } else {
      result.error = true;
      result.message = 'Invalid data type of "_index". Must be a number.';
      return result;
    }
  }

  //check if the item by input's index exist
  let item = await managerDB.getItemByIndex(params._index);
  if (item === null) {
    result.error = true;
    result.message = `Invalid index. There is no tree with such ${params._index} index.`;
    return result;
  }

  //check _keys value
  let depth = item.depth;
  let maxnumber = BigInt(2 ** depth) - 1n;

  for (let i = 0; i < params._keys.length; i++) {
    let bN;
    try {
      bN = BigInt(params._keys[i]);
    } catch (e) {
      result.error = true;
      result.message = `This ${params._keys[i]} key in '_keys' is not a number.`;
      return result;
    }
    if (bN > maxnumber) {
      result.error = true;
      result.message = `This ${params._keys[i]} key in '_keys' is out of range of the tree's depth.`;
      return result;
    }
  }
  return result;
}

inputErrors.gp2 = check_params_gp2;

//Function for checking input params for method getProofOp3
async function check_params_gp3(params) {
  let result = {
    error: false,
    message: null
  }
  //check if the params have only two keys
  if (Object.keys(params).length > 3) {
    result.error = true;
    result.message = 'Object "params" should have only three properties - "_index", "_key" and "_condition".';
    return result;
  }
  //check if the keys of params are _index and _key and _condition (can be improved with more detailed messages)
  if (!params.hasOwnProperty('_index') || !params.hasOwnProperty('_key') || !params.hasOwnProperty('_condition')) {
    result.error = true;
    result.message = 'There is no required properties "_index" and/or "_key" and/or "_condition" in object "params".';
    return result;
  }
  //check data type of _index
  if (typeof params._index != 'number') {
    result.error = true;
    result.message = 'Invalid data type of "_index". Must be a number.'
    return result;
  }
  //check if the item by input's index exist
  let item = await managerDB.getItemByIndex(params._index);
  if (item === null) {
    result.error = true;
    result.message = `Invalid index. There is no tree with such ${params._index} index.`;
    return result;
  }

  //check data types of _key and _condition
  if (typeof params._key != 'string' || Object.prototype.toString.call(params._condition) != '[object Object]') {
    if (typeof params._key === 'string') {
      result.error = true;
      result.message = 'Invalid data type of "_condition". Must be an object.';
      return result;
    } else {
      result.error = true;
      result.message = 'Invalid data type of "_key". Must be a string.';
      return result;
    }
  }

  //check _key value

  let depth = item.depth;
  let maxnumber = BigInt(2 ** depth) - 1n;

  let bN;
  try {
    bN = BigInt(params._key);
  } catch (e) {
    result.error = true;
    result.message = `This "${params._key}" key is not a number.`;
    return result;
  }
  if (bN > maxnumber) {
    result.error = true;
    result.message = `This "${params._key}" key is out of range of the tree's depth.`;
    return result;
  }

  //check _condition keys
  for (let key in params._condition) {
    let bN;
    try {
      bN = BigInt(key);
    } catch (e) {
      result.error = true;
      result.message = `This ${key} key in '_condition' is not a number.`;
      return result;
    }
    if (bN > maxnumber) {
      result.error = true;
      result.message = `This ${key} key in '_condition' is out of range of the tree's depth.`;
      return result;
    }
  }

  //check _condition values
  for (let k in params._condition) {
    let strRegex = "^0[xX][0-9a-fA-F]+$";
    let regex = new RegExp(strRegex);
    if (params._condition[k].length != 66 || !(regex.test(params._condition[k]))) {
      result.error = true;
      result.message = `Invalid format of the value by ${k} key in '_condition'. Valid format for values is "0x0000000000000000000000000000000000000000000000000000000000000000".`;
      return result;
    }
  }
  return result;
}

inputErrors.gp3 = check_params_gp3;

//Function for checking input params for method getProofOp4
async function check_params_gp4(params) {
  let result = {
    error: false,
    message: null
  }
  //check if the params have only two keys
  if (Object.keys(params).length > 3) {
    result.error = true;
    result.message = 'Object "params" should have only three properties - "_index", "_keys" and "_condition".';
    return result;
  }
  //check if the keys of params are _index and _keys and _condition (can be improved with more detailed messages)
  if (!params.hasOwnProperty('_index') || !params.hasOwnProperty('_keys') || !params.hasOwnProperty('_condition')) {
    result.error = true;
    result.message = 'There is no required properties "_index" and/or "_keys" and/or "_condition" in object "params".';
    return result;
  }
  //check data type of _index
  if (typeof params._index != 'number') {
    result.error = true;
    result.message = 'Invalid data type of "_index". Must be a number.'
    return result;
  }
  //check if the item by input's index exist
  let item = await managerDB.getItemByIndex(params._index);
  if (item === null) {
    result.error = true;
    result.message = `Invalid index. There is no tree with such ${params._index} index.`;
    return result;
  }

  //check data types of _keys and _condition
  if (Object.prototype.toString.call(params._keys) != '[object Array]' || Object.prototype.toString.call(params._condition) != '[object Object]') {
    if (Object.prototype.toString.call(params._keys) === '[object Array]') {
      result.error = true;
      result.message = 'Invalid data type of "_condition". Must be an object.';
      return result;
    } else {
      result.error = true;
      result.message = 'Invalid data type of "_keys". Must be an array.';
      return result;
    }
  }


  //check _keys values

  let depth = item.depth;
  let maxnumber = BigInt(2 ** depth) - 1n;

  for (let i = 0; i < params._keys.length; i++) {
    let bN;
    try {
      bN = BigInt(params._keys[i]);
    } catch (e) {
      result.error = true;
      result.message = `This ${params._keys[i]} key in '_keys' is not a number.`;
      return result;
    }
    if (bN > maxnumber) {
      result.error = true;
      result.message = `This ${params._keys[i]} key in '_keys' is out of range of the tree's depth.`;
      return result;
    }
  }

  //check _condition keys
  for (let key in params._condition) {
    let bN;
    try {
      bN = BigInt(key);
    } catch (e) {
      result.error = true;
      result.message = `This ${key} key in '_condition' is not a number.`;
      return result;
    }
    if (bN > maxnumber) {
      result.error = true;
      result.message = `This ${key} key in '_condition' is out of range of the tree's depth.`;
      return result;
    }
  }

  //check _condition values
  for (let k in params._condition) {
    let strRegex = "^0[xX][0-9a-fA-F]+$";
    let regex = new RegExp(strRegex);
    if (params._condition[k].length != 66 || !(regex.test(params._condition[k]))) {
      result.error = true;
      result.message = `Invalid format of the value by ${k} key in '_condition'. Valid format for values is "0x0000000000000000000000000000000000000000000000000000000000000000".`;
      return result;
    }
  }
  return result;

}

inputErrors.gp4 = check_params_gp4;

exports.Methods = Methods;
exports.inputErrors = inputErrors;
