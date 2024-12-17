import {Address, concatHex, Hex, keccak256} from 'viem';
import {CREATEX_ADDRESS} from '@/contracts/createx/constants';

// Replicated logic from
// https://github.com/pcaversaccio/createx/blob/ab60cc031b38111a5fad9358d018240dfa78cb8e/src/CreateX.sol#L575
export function computeCreate2Address({
	guardedSalt,
	initCodeHash,
	deployer = CREATEX_ADDRESS,
}: {
	guardedSalt: Hex;
	initCodeHash: Hex;
	deployer?: Address;
}): Address {
	const packed = concatHex([
		'0xff', // Single byte prefix
		deployer, // 20 bytes deployer address
		guardedSalt, // 32 bytes salt
		initCodeHash, // 32 bytes init code hash
	]);

	// Take last 20 bytes of hash to get the address
	const hash = keccak256(packed);
	return `0x${hash.slice(26)}` as Address;
}
