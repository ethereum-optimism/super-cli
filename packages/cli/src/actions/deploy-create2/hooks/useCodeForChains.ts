import {useQueries} from '@tanstack/react-query';
import {Address} from 'viem';
import {useConfig} from 'wagmi';
import {getBytecodeQueryOptions} from 'wagmi/query';

export const useCodeForChains = (address: Address, chainIds: number[]) => {
	const wagmiConfig = useConfig();

	const queries = useQueries({
		queries: chainIds.map(chainId => {
			return {
				...getBytecodeQueryOptions(wagmiConfig, {
					address,
					chainId,
				}),
			};
		}),
	});

	const isDeployedToAllChains = queries.every(
		query => query.data !== null && query.data !== undefined,
	);

	return {
		isDeployedToAllChains,
		queries,
	};
};
