import {queryClient} from '@/commands/_app';
import {
	CHAIN_LIST_URL,
	fetchSuperchainRegistryChainList,
} from '@/lib/fetchSuperchainRegistryChainList';
import {useQuery} from '@tanstack/react-query';

const getQueryParams = (chainListURL: string) => {
	return {
		queryKey: ['superchainRegistryChainList', chainListURL],
		queryFn: () => fetchSuperchainRegistryChainList(chainListURL),
	};
};

export const querySuperchainRegistryChainList = async (
	chainListURL: string = CHAIN_LIST_URL,
) => {
	return queryClient.fetchQuery(getQueryParams(chainListURL));
};

export const useSuperchainRegistryChainList = () => {
	return useQuery(getQueryParams(CHAIN_LIST_URL));
};
