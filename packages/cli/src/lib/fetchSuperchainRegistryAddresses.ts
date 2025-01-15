import {zodAddress} from '@/lib/schemas';
import {z} from 'zod';

export const SUPERCHAIN_REGISTRY_ADDRESSES_URL =
	'https://raw.githubusercontent.com/ethereum-optimism/superchain-registry/refs/heads/main/superchain/extra/addresses/addresses.json';

// TODO: There's way more than this but this is all we need for now, and unclear which ones are required vs. not
const zodAddressSet = z.object({
	L1StandardBridgeProxy: zodAddress,
});

const zodAddresses = z.record(z.coerce.number(), zodAddressSet);

export type SuperchainRegistryAddresses = z.infer<typeof zodAddresses>;

export const fetchSuperchainRegistryAddresses = async (
	addressesUrl: string,
) => {
	const response = await fetch(addressesUrl);
	if (!response.ok) {
		throw new Error(`Failed to fetch addresses: ${response.statusText}`);
	}

	const addressesJson = await response.json();

	return zodAddresses.parse(addressesJson);
};
