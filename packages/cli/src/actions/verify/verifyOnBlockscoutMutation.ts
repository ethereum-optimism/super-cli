import {verifyContractOnBlockscout} from '@/actions/verify/blockscout';
import {Address, Chain} from 'viem';

export const verifyOnBlockscoutMutationKey = (
	address: Address,
	chain: Chain,
	// @ts-ignore
	standardJsonInput: any, // TODO: use this as part of cache key
) => {
	return ['verifyOnBlockscout', address, chain.id];
};

export const verifyOnBlockscoutMutation = async (
	address: Address,
	chain: Chain,
	standardJsonInput: any,
	contractName: string,
) => {
	await verifyContractOnBlockscout(
		chain.blockExplorers!.default.url,
		address,
		contractName,
		standardJsonInput,
	);
};
