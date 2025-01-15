import {Address, getAddress, Hex} from 'viem';
import jsonStableStringify from 'fast-json-stable-stringify';
import crypto from 'crypto';

export type TransactionTask = {
	chainId: number;
	to?: Address;
	data?: Hex;
	value?: Hex;
};

export const createTransactionTaskId = (request: TransactionTask): string => {
	// Create a normalized object where undefined values are explicitly null
	const normalized = {
		chainId: request.chainId,
		to: request.to ? getAddress(request.to) : null,
		data: request.data ?? null,
		value: request.value ?? null,
	};

	const deterministicJson = jsonStableStringify(normalized);

	return crypto.createHash('sha256').update(deterministicJson).digest('hex');
};
