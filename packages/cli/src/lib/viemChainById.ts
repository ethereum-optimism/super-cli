import {Chain} from 'viem';

import * as chains from 'viem/chains';

export const viemChainById = Object.values(chains).reduce((acc, chain) => {
	acc[chain.id] = chain;
	return acc;
}, {} as Record<number, Chain>);
