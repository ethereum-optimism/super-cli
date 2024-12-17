import {Chain, http} from 'viem';
import {createConfig} from 'wagmi';

export const createWagmiConfig = (chainById: Record<number, Chain>) => {
	return createConfig({
		chains: Object.values(chainById) as [Chain, ...Chain[]],
		transports: Object.fromEntries(
			Object.entries(chainById).map(([id]) => [Number(id), http()]),
		),
	});
};
