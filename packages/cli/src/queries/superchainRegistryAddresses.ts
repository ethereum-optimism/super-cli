import {queryClient} from '@/commands/_app';
import {
	fetchSuperchainRegistryAddresses,
	SUPERCHAIN_REGISTRY_ADDRESSES_URL,
} from '@/lib/fetchSuperchainRegistryAddresses';

const getQueryParams = (chainListURL: string) => {
	return {
		queryKey: ['superchainRegistryAddresses', chainListURL],
		queryFn: () =>
			fetchSuperchainRegistryAddresses(SUPERCHAIN_REGISTRY_ADDRESSES_URL),
	};
};

export const querySuperchainRegistryAddresses = async (
	addressesUrl: string = SUPERCHAIN_REGISTRY_ADDRESSES_URL,
) => {
	return queryClient.fetchQuery(getQueryParams(addressesUrl));
};
