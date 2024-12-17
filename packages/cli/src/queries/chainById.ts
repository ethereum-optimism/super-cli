import {queryClient} from '@/commands/_app';
import {queryChainConfig} from '@/queries/chainConfig';
import {
	CHAIN_LIST_URL,
	ChainListItem,
} from '@/superchain-registry/fetchChainList';
import {useQuery} from '@tanstack/react-query';
import {Chain, defineChain} from 'viem';
import {mainnet, sepolia} from 'viem/chains';
import {chainConfig} from 'viem/op-stack';
import * as chains from 'viem/chains';

const viemChainById = [...Object.values(chains)].reduce((acc, chain) => {
		acc[chain.id] = chain;
		return acc;
	}, {} as Record<number, Chain>);

const chainIdByParentChainName = {
	mainnet: mainnet.id,
	sepolia: sepolia.id,
} as const;

export const chainListItemToChain = (
	config: ChainListItem,
	sourceChainIdByChainId: Record<number, number>,
): Chain => {
	const stringId = config.identifier.split('/')[1] as string;

	const isMainnet = config.parent.chain === 'mainnet';

	if (viemChainById[config.chainId]) {
		const viemChain = viemChainById[config.chainId]!;
		if (viemChain.sourceId) {
			return viemChain;
		}

		return defineChain({
			...viemChain,
			id: config.chainId,
			sourceId: sourceChainIdByChainId[config.chainId],
		});
	}

	// TODO: Does not support custom gas tokens
	return defineChain({
		...chainConfig,
		id: config.chainId,
		name: stringId,
		sourceId: isMainnet ? mainnet.id : sepolia.id,
		nativeCurrency: {
			name: 'Ether',
			symbol: 'ETH',
			decimals: 18,
		},
		blockExplorers: {
			default: {
				name: 'Blockscout',
				url: config.explorers[0] as string,
			},
		},
		rpcUrls: {
			default: {
				http: [config.rpc[0] as string],
			},
		},
		multicall: {
			address: '0xcA11bde05977b3631167028862bE2a173976CA11',
		},
	});
};

const getQueryParams = (chainListURL: string) => {
	return {
		queryKey: ['chainById', chainListURL],
		queryFn: async () => {
			const chainList = await queryChainConfig();

			const sourceChainIdByChainId = chainList.reduce((acc, chain) => {
				const parentChainName = chain.parent.chain;
				// @ts-expect-error
				acc[chain.chainId] = chainIdByParentChainName[parentChainName];
				return acc;
			}, {} as Record<number, number>);

			const chainByID = chainList.reduce((acc, config) => {
				const chain = chainListItemToChain(config, sourceChainIdByChainId);
				acc[chain.id] = chain;
				return acc;
			}, {} as Record<number, Chain>);

			return chainByID;
		},
		staleTime: 1000 * 60 * 60, // 1 hour
	};
};

export const queryMappingChainById = async (
	chainListURL: string = CHAIN_LIST_URL,
) => {
	return queryClient.fetchQuery(getQueryParams(chainListURL));
};

export const useMappingChainById = (chainListURL: string = CHAIN_LIST_URL) => {
	return useQuery({
		...getQueryParams(chainListURL),
		staleTime: Infinity, // For the duration of the CLI session, this is cached
	});
};
