import {
	interopAlphaChains,
	mainnetChains,
	sepoliaChains,
	supersimChains,
	supersimL1,
} from '@eth-optimism/viem/chains';
import {Chain, mainnet, sepolia} from 'viem/chains';

type Network = {
	name: string;
	sourceChain: Chain;
	chains: Chain[];
};

export const mainnetNetwork = {
	name: 'mainnet',
	sourceChain: mainnet,
	chains: mainnetChains,
} as const satisfies Network;

export const sepoliaNetwork = {
	name: 'sepolia',
	sourceChain: sepolia,
	chains: sepoliaChains,
} as const satisfies Network;

export const supersimNetwork = {
	name: 'supersim',
	sourceChain: supersimL1,
	chains: supersimChains,
} as const satisfies Network;

export const interopAlphaNetwork = {
	name: 'interop-alpha',
	sourceChain: sepolia,
	chains: interopAlphaChains,
} as const satisfies Network;

export const networks = [
	mainnetNetwork,
	sepoliaNetwork,
	interopAlphaNetwork,
	supersimNetwork,
];

export const networkByName = networks.reduce((acc, network) => {
	acc[network.name] = network;
	return acc;
}, {} as Record<string, Network>);
