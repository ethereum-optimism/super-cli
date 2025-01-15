import {Address as zAddress} from 'abitype/zod';
import {isHash, Hash, Hex, isHex, parseEther, parseGwei} from 'viem';
import {z} from 'zod';

export const zodHash = z
	.string()
	.refine((value): value is Hash => isHash(value), {
		message: 'Invalid hash',
	});

export const zodHex = z.string().refine((value): value is Hex => isHex(value), {
	message: 'Invalid hex',
});

export const zodPrivateKey = z
	.string()
	.refine(
		(value): value is Hex =>
			isHex(value) && value.startsWith('0x') && value.length === 66,
		{
			message: 'Invalid private key',
		},
	);

export const zodAddress = zAddress;

export const zodValueAmount = z.string().transform(value => {
	if (value.endsWith('ether')) {
		return parseEther(value.slice(0, -5));
	} else if (value.endsWith('gwei')) {
		return parseGwei(value.slice(0, -4));
	} else if (value.endsWith('wei')) {
		return BigInt(value);
	}

	return BigInt(value);
});
