import {queryClient} from '@/commands/_app';
import {queryChains} from '@/queries/chains';
import {viemChainById} from '@/lib/viemChainById';
import {useQuery} from '@tanstack/react-query';
import {Chain} from 'viem';

const getQueryParams = () => {
	return {
		queryKey: ['chainById'],
		queryFn: async () => {
			const chains = await queryChains();

			return chains.reduce((acc, chain) => {
				acc[chain.id] = chain;

				// Also set the source chain (L1)
				acc[chain.sourceId] = viemChainById[chain.sourceId]!;
				return acc;
			}, {} as Record<number, Chain>);
		},
		staleTime: Infinity, // For the duration of the CLI session, this is cached
	};
};

export const queryMappingChainById = async () => {
	return queryClient.fetchQuery(getQueryParams());
};

export const useMappingChainById = () => {
	return useQuery({
		...getQueryParams(),
		staleTime: Infinity, // For the duration of the CLI session, this is cached
	});
};
