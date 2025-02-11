import {rollupChainToIdentifier} from '@/util/chains/chainIdentifier';
import {networks} from '@/util/chains/networks';

import {base, baseSepolia, Chain, optimism, optimismSepolia} from 'viem/chains';

// TODO: move this override logic into @eth-optimism/viem/chains
const TEMP_overrideBlockExplorerUrlByChainId = {
	[baseSepolia.id]: 'https://base-sepolia.blockscout.com/',
	[base.id]: 'https://base.blockscout.com/',
	[optimismSepolia.id]: 'https://optimism-sepolia.blockscout.com/',
	[optimism.id]: 'https://optimism.blockscout.com/',
} as Record<number, string>;

export const sourceChains = networks.map(network => network.sourceChain);

export const rollupChains = networks
	.flatMap(network => network.chains as Chain[])
	.map(chain => {
		let newChain = {
			...chain,
		};
		if (TEMP_overrideBlockExplorerUrlByChainId[chain.id]) {
			newChain = {
				...newChain,
				blockExplorers: {
					default: {
						name: 'Blockscout',
						url: TEMP_overrideBlockExplorerUrlByChainId[chain.id]!,
					},
				},
			} as const;
		}

		return newChain;
	});

export const chains = [...sourceChains, ...rollupChains] as const;

type RollupChains = typeof rollupChains;

type Chains = typeof chains;

export const chainById = chains.reduce((acc, chain) => {
	acc[chain.id] = chain;
	return acc;
}, {} as Record<number, Chains[number]>);

export const rollupChainByIdentifier = rollupChains.reduce((acc, chain) => {
	acc[rollupChainToIdentifier(chain)] = chain;
	return acc;
}, {} as Record<string, RollupChains[number]>);
