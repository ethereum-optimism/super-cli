import {z} from 'zod';

export const zodSupportedNetwork = z.enum([
	'mainnet',
	'sepolia',
	'sepolia-dev-0',
]);

export type SupportedNetwork = z.infer<typeof zodSupportedNetwork>;

export const CHAIN_LIST_URL =
	'https://raw.githubusercontent.com/ethereum-optimism/superchain-registry/refs/heads/main/chainList.json';

const zodIdentifier = z.string().refine(
	(val): val is `${string}/${string}` => {
		const parts = val.split('/');
		const [prefix, suffix] = parts;
		if (!prefix || !suffix) {
			return false;
		}
		return prefix.length > 0 && suffix.length > 0;
	},
	{
		message:
			"Identifier must be in the format 'prefix/suffix' with non-empty parts",
	},
);

const zodChainListItem = z.object({
	name: z.string(),
	identifier: zodIdentifier,
	chainId: z.number(),
	rpc: z.array(z.string()),
	explorers: z.array(z.string()),
	parent: z.object({
		type: z.literal('L2'),
		chain: zodSupportedNetwork,
	}),
});

const zodChainList = z.array(zodChainListItem);

export type ChainListItem = z.infer<typeof zodChainListItem>;
export type ChainList = z.infer<typeof zodChainList>;

const zodChainListResponse = z.array(zodChainListItem);

export const fetchSuperchainRegistryChainList = async (
	chainListURL: string,
) => {
	const response = await fetch(chainListURL);
	if (!response.ok) {
		throw new Error(`Failed to fetch chain list: ${response.statusText}`);
	}

	const chainListJson = await response.json();

	const parsedChainList = zodChainListResponse.parse(chainListJson);

	return parsedChainList.filter(
		chain =>
			chain.parent.chain === 'mainnet' || chain.parent.chain === 'sepolia',
	);
};
