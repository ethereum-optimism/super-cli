import {querySuperchainRegistryAddresses} from '@/queries/superchainRegistryAddresses';
import {querySuperchainRegistryChainList} from '@/queries/superchainRegistryChainList';
import {SuperchainRegistryAddresses} from '@/superchain-registry/fetchSuperchainRegistryAddresses';
import {ChainListItem} from '@/superchain-registry/fetchSuperchainRegistryChainList';
import {chainConfig} from 'viem/op-stack';
import {mainnet, sepolia} from 'viem/chains';
import {defineChain} from 'viem';
import {queryClient} from '@/commands/_app';
import {viemChainById} from '@/viemChainById';

const chainIdByParentChainName = {
	mainnet: mainnet.id,
	sepolia: sepolia.id,
	'sepolia-dev-0': sepolia.id,
} as const;

const toViemChain = (
	chainListItem: ChainListItem,
	superchainRegistryAddresses: SuperchainRegistryAddresses,
) => {
	const name = chainListItem.identifier.split('/')[1] as string;
	const sourceId = chainIdByParentChainName[chainListItem.parent.chain];
	const chainId = chainListItem.chainId;

	// Not all viem chain definitions have this, so manually overriding it here
	const parametersToAdd = {
		sourceId: chainIdByParentChainName[chainListItem.parent.chain],
		contracts: {
			...chainConfig.contracts,
			l1StandardBridge: {
				[sourceId]: {
					// Should always be defined if we trust Superchain Registry
					address: superchainRegistryAddresses[chainId]!.L1StandardBridgeProxy,
				},
			},
		},
	};

	const viemChain = viemChainById[chainListItem.chainId];

	if (viemChain) {
		return defineChain({
			...viemChain,
			...parametersToAdd,
		});
	}

	return defineChain({
		...chainConfig,
		...parametersToAdd,
		id: chainId,
		name,
		nativeCurrency: {
			name: 'Ether',
			symbol: 'ETH',
			decimals: 18,
		},
		blockExplorers: {
			default: {
				name: 'Blockscout',
				url: chainListItem.explorers[0] as string,
			},
		},
		rpcUrls: {
			default: {
				http: [chainListItem.rpc[0] as string],
			},
		},
		multicall: {
			address: '0xcA11bde05977b3631167028862bE2a173976CA11',
		},
	});
};

// Returns viem chains
const fetchChains = async () => {
	const [addresses, chainList] = await Promise.all([
		querySuperchainRegistryAddresses(),
		querySuperchainRegistryChainList(),
	]);

	return chainList.map(chainListItem => toViemChain(chainListItem, addresses));
};

const getQueryParams = () => {
	return {
		queryKey: ['chains'],
		queryFn: () => fetchChains(),
		staleTime: Infinity, // For the duration of the CLI session, this is cached
	};
};

export const queryChains = async () => {
	return queryClient.fetchQuery(getQueryParams());
};
