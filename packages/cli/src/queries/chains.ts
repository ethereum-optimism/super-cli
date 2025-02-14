import {querySuperchainRegistryAddresses} from '@/queries/superchainRegistryAddresses';
import {querySuperchainRegistryChainList} from '@/queries/superchainRegistryChainList';
import {SuperchainRegistryAddresses} from '@/util/fetchSuperchainRegistryAddresses';
import {ChainListItem} from '@/util/fetchSuperchainRegistryChainList';
import {chainConfig} from 'viem/op-stack';
import {
	base,
	baseSepolia,
	mainnet,
	optimism,
	optimismSepolia,
	sepolia,
} from 'viem/chains';
import {defineChain} from 'viem';
import {queryClient} from '@/commands/_app';
import {chainById} from '@/util/chains/chains';
import {supersimL1} from '@eth-optimism/viem/chains';

const TEMP_overrideBlockExplorerUrlByChainId = {
	[baseSepolia.id]: 'https://base-sepolia.blockscout.com/',
	[base.id]: 'https://base.blockscout.com/',
	[optimismSepolia.id]: 'https://optimism-sepolia.blockscout.com/',
	[optimism.id]: 'https://optimism.blockscout.com/',
} as Record<number, string>;

export const chainIdByParentChainName = {
	mainnet: mainnet.id,
	sepolia: sepolia.id,
	// 'sepolia-dev-0': sepolia.id,
	'interop-alpha': sepolia.id,
	supersim: supersimL1.id,
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
		blockExplorers: {
			default: {
				name: 'Blockscout',
				url:
					TEMP_overrideBlockExplorerUrlByChainId[chainId] ??
					(chainListItem.explorers[0] as string),
			},
		},
	};

	const viemChain = chainById[chainListItem.chainId];

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
