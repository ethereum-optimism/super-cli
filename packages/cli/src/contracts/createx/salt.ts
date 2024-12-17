import {
	keccak256,
	encodeAbiParameters,
	numberToHex,
	Hex,
	Address,
	zeroAddress,
	concat,
	toHex,
	slice,
	pad,
} from 'viem';

// https://github.com/pcaversaccio/createx/blob/1d93d19f8ec5edd41aa9a1693e8bb13d9da89f62/src/CreateX.sol#L874

/**
 * @dev Implements different safeguarding mechanisms depending on the encoded values in the salt
 * (`||` stands for byte-wise concatenation):
 *   => salt (32 bytes) = 0xbebebebebebebebebebebebebebebebebebebebe||ff||1212121212121212121212
 *   - The first 20 bytes (i.e. `bebebebebebebebebebebebebebebebebebebebe`) may be used to
 *     implement a permissioned deploy protection by setting them equal to `msg.sender`,
 *   - The 21st byte (i.e. `ff`) may be used to implement a cross-chain redeploy protection by
 *     setting it equal to `0x01`,
 *   - The last random 11 bytes (i.e. `1212121212121212121212`) allow for 2**88 bits of entropy
 *     for mining a salt.
 * @param salt The 32-byte random value used to create the contract address.
 * @return guardedSalt The guarded 32-byte random value used to create the contract address.
 */

export const createBaseSalt = ({
	protectedSender,
	shouldAddRedeployProtection = false,
	additionalEntropy,
}: {
	protectedSender?: Address;
	shouldAddRedeployProtection?: boolean;
	additionalEntropy: Hex;
}) => {
	if (protectedSender) {
		return slice(
			concat([
				protectedSender,
				pad(toHex(shouldAddRedeployProtection), {size: 1, dir: 'left'}),
				additionalEntropy,
			]),
			0,
			32,
		);
	} else if (shouldAddRedeployProtection) {
		return slice(
			concat([
				zeroAddress,
				pad(toHex(shouldAddRedeployProtection), {size: 1, dir: 'left'}),
				additionalEntropy,
			]),
			0,
			32,
		);
	}
	return additionalEntropy;
};

export const createGuardedSalt = ({
	baseSalt,
	chainId,
	msgSender,
}: {
	baseSalt: Hex;
	chainId?: number;
	msgSender?: Address;
}) => {
	// Extract the first 20 bytes
	const senderBytes = slice(baseSalt, 0, 20);
	// Extract the 21st byte
	const protectionFlag = slice(baseSalt, 21, 22);

	// Check if sender matches msgSender
	const isEnforcedSender = senderBytes === msgSender;
	// Check if sender is zero address
	const isZeroAddress = senderBytes === zeroAddress;
	// Check if redeploy protection is enabled

	let hasRedeployProtection = false;
	if (protectionFlag === pad(toHex(true), {size: 1, dir: 'left'})) {
		hasRedeployProtection = true;
	} else if (protectionFlag === pad(toHex(false), {size: 1, dir: 'left'})) {
		hasRedeployProtection = false;
	} else {
		throw new Error('Invalid salt: protection flag must be 00 or 01');
	}

	// Align with Solidity contract conditions
	if (isEnforcedSender && hasRedeployProtection) {
		if (chainId === undefined) {
			throw new Error('Chain ID is required for redeploy protection');
		}
		if (msgSender === undefined) {
			throw new Error('Sender is required for sender protection');
		}
		return keccak256(
			encodeAbiParameters(
				[{type: 'address'}, {type: 'uint256'}, {type: 'bytes32'}],
				[msgSender, BigInt(chainId), baseSalt],
			),
		);
	} else if (isEnforcedSender && !hasRedeployProtection) {
		if (msgSender === undefined) {
			throw new Error('Sender is required for sender protection');
		}
		return keccak256(
			encodeAbiParameters(
				[{type: 'bytes32'}, {type: 'bytes32'}],
				[pad(msgSender, {size: 32, dir: 'left'}), baseSalt],
			),
		);
	} else if (isZeroAddress && hasRedeployProtection) {
		if (chainId === undefined) {
			throw new Error('Chain ID is required for redeploy protection');
		}
		return keccak256(
			encodeAbiParameters(
				[{type: 'bytes32'}, {type: 'bytes32'}],
				[numberToHex(BigInt(chainId), {size: 32}), baseSalt],
			),
		);
	} else {
		// For non-pseudo-random cases, hash the salt
		return keccak256(encodeAbiParameters([{type: 'bytes32'}], [baseSalt]));
	}
};
