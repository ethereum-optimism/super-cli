import {queryClient} from '@/commands/_app';
import {queryChains} from '@/queries/chains';
import {chainById} from '@/util/chains/chains';
import {Chain} from 'viem';

const getQueryParams = () => {
	return {
		queryKey: ['chainById'],
		queryFn: async () => {
			const chains = await queryChains();

			return chains.reduce((acc, chain) => {
				acc[chain.id] = chain;

				// Also set the source chain (L1)
				acc[chain.sourceId] = chainById[chain.sourceId]!;
				return acc;
			}, {} as Record<number, Chain>);
		},
		staleTime: Infinity, // For the duration of the CLI session, this is cached
	};
};

export const queryMappingChainById = async () => {
	return queryClient.fetchQuery(getQueryParams());
};

// TODO: remove this entirely
export const useMappingChainById = () => {
	return {
		data: chainById,
		isLoading: false,
	};
};
