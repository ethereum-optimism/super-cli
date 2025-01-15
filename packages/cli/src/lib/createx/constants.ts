import { parseAbi } from "viem"

export type RedeployProtectionFlag = boolean

export const createXABI = parseAbi([
    "error FailedContractCreation(address emitter)",
    "error FailedContractInitialisation(address emitter, bytes revertData)",
    "error FailedEtherTransfer(address emitter, bytes revertData)",
    "error InvalidNonceValue(address emitter)",
    "error InvalidSalt(address emitter)",
    "event ContractCreation(address indexed newContract, bytes32 indexed salt)",
    "event ContractCreation(address indexed newContract)",
    "event Create3ProxyContractCreation(address indexed newContract, bytes32 indexed salt)",
    "function computeCreate2Address(bytes32 salt, bytes32 initCodeHash) view returns (address computedAddress)",
    "function computeCreate2Address(bytes32 salt, bytes32 initCodeHash, address deployer) pure returns (address computedAddress)",
    "function computeCreate3Address(bytes32 salt, address deployer) pure returns (address computedAddress)",
    "function computeCreate3Address(bytes32 salt) view returns (address computedAddress)",
    "function computeCreateAddress(uint256 nonce) view returns (address computedAddress)",
    "function computeCreateAddress(address deployer, uint256 nonce) view returns (address computedAddress)",
    "function deployCreate(bytes initCode) payable returns (address newContract)",
    "function deployCreate2(bytes32 salt, bytes initCode) payable returns (address newContract)",
    "function deployCreate2(bytes initCode) payable returns (address newContract)",
    "function deployCreate2AndInit(bytes32 salt, bytes initCode, bytes data, (uint256 constructorAmount, uint256 initCallAmount) values, address refundAddress) payable returns (address newContract)",
    "function deployCreate2AndInit(bytes initCode, bytes data, (uint256 constructorAmount, uint256 initCallAmount) values) payable returns (address newContract)",
    "function deployCreate2AndInit(bytes initCode, bytes data, (uint256 constructorAmount, uint256 initCallAmount) values, address refundAddress) payable returns (address newContract)",
    "function deployCreate2AndInit(bytes32 salt, bytes initCode, bytes data, (uint256 constructorAmount, uint256 initCallAmount) values) payable returns (address newContract)",
    "function deployCreate2Clone(bytes32 salt, address implementation, bytes data) payable returns (address proxy)",
    "function deployCreate2Clone(address implementation, bytes data) payable returns (address proxy)",
    "function deployCreate3(bytes initCode) payable returns (address newContract)",
    "function deployCreate3(bytes32 salt, bytes initCode) payable returns (address newContract)",
    "function deployCreate3AndInit(bytes32 salt, bytes initCode, bytes data, (uint256 constructorAmount, uint256 initCallAmount) values) payable returns (address newContract)",
    "function deployCreate3AndInit(bytes initCode, bytes data, (uint256 constructorAmount, uint256 initCallAmount) values) payable returns (address newContract)",
    "function deployCreate3AndInit(bytes32 salt, bytes initCode, bytes data, (uint256 constructorAmount, uint256 initCallAmount) values, address refundAddress) payable returns (address newContract)",
    "function deployCreate3AndInit(bytes initCode, bytes data, (uint256 constructorAmount, uint256 initCallAmount) values, address refundAddress) payable returns (address newContract)",
    "function deployCreateAndInit(bytes initCode, bytes data, (uint256 constructorAmount, uint256 initCallAmount) values) payable returns (address newContract)",
    "function deployCreateAndInit(bytes initCode, bytes data, (uint256 constructorAmount, uint256 initCallAmount) values, address refundAddress) payable returns (address newContract)",
    "function deployCreateClone(address implementation, bytes data) payable returns (address proxy)",
])

export const CREATEX_ADDRESS = '0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed'

export const INVALID_SALT = 0x13b3a2a1