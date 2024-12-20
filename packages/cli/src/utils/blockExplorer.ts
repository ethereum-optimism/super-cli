import {Address, Chain, Hash} from 'viem';

const getBaseBlockExplorerUrl = (chain: Chain) => {
	const result =
		chain.blockExplorers?.['blockscout']?.url ||
		chain.blockExplorers?.default?.url ||
		'';

	// trim / at the end
	return result.endsWith('/') ? result.slice(0, -1) : result;
};

export const getBlockExplorerAddressLink = (chain: Chain, address: Address) => {
	return `${getBaseBlockExplorerUrl(chain)}/address/${address}`;
};

export const getBlockExplorerTxHashLink = (chain: Chain, txHash: Hash) => {
	return `${getBaseBlockExplorerUrl(chain)}/tx/${txHash}`;
};
