import {Chain, mainnet, sepolia} from 'viem/chains';
import {supersimL1} from '@eth-optimism/viem/chains';
import {superchainRegistryChainList} from '@/util/chains/superchainRegistryChainList';

const sourceChains = [
	{
		identifier: 'mainnet',
		chain: mainnet,
	},
	{
		identifier: 'sepolia',
		chain: sepolia,
	},
	{
		identifier: 'supersim',
		chain: supersimL1,
	},
];

export const sourceIdentifierByChainId = sourceChains.reduce((acc, chain) => {
	acc[chain.chain.id] = chain.identifier;
	return acc;
}, {} as Record<number, string>);

export const sourceChainByIdentifier = sourceChains.reduce((acc, chain) => {
	acc[chain.identifier] = chain.chain;
	return acc;
}, {} as Record<string, Chain>);

// TODO: this is error prone, update @eth-optimism/viem to export a mapping from name to identifier
const supersimIdentifierByChainId: Record<number, string> = {
	901: 'supersim/supersiml2a',
	902: 'supersim/supersiml2b',
	903: 'supersim/supersiml2c',
	904: 'supersim/supersiml2d',
	905: 'supersim/supersiml2e',
};

// TODO: this is error prone (and becomes outdated with chainlist updates), update @eth-optimism/viem to export a mapping from name to identifier
const superchainRegistryIdentifierByChainId =
	superchainRegistryChainList.reduce((acc, chainListItem) => {
		acc[chainListItem.chainId] = chainListItem.identifier;
		return acc;
	}, {} as Record<number, string>);

const identifierByChainId = {
	...superchainRegistryIdentifierByChainId,
	...supersimIdentifierByChainId,
};

export const rollupChainToIdentifier = (chain: Chain) => {
	return identifierByChainId[chain.id]!;
};
