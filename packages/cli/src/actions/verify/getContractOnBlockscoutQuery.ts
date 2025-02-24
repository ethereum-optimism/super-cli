import {getSmartContractOnBlockscout} from '@/actions/verify/blockscout';
import {Address, Chain} from 'viem';

export const getSmartContractOnBlockscoutQueryKey = (
	contractAddress: Address,
	chain: Chain,
) => ['contractOnBlockscout', contractAddress, chain.id];

export const getSmartContractOnBlockscoutQuery = async (
	contractAddress: Address,
	chain: Chain,
) => {
	const smartContract = await getSmartContractOnBlockscout(
		chain.blockExplorers!.default.url,
		contractAddress,
	);

	return smartContract;
};
