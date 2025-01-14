import {zodSupportedNetwork} from '@/lib/fetchSuperchainRegistryChainList';
import {zodAddress} from '@/lib/schemas';

import {option} from 'pastel';
import {z} from 'zod';

export const zodVerifyContractParams = z.object({
	forgeArtifactPath: z
		.string()
		.describe(
			option({
				description: 'Path to the Forge artifact',
				alias: 'f',
			}),
		)
		.min(1),
	contractAddress: zodAddress.describe(
		option({description: 'Contract address', alias: 'a'}),
	),
	network: zodSupportedNetwork.describe(
		option({
			description: 'Network to verify on',
			alias: 'n',
		}),
	),
	chains: z.array(z.string()).describe(
		option({
			description: 'Chains to verify on',
			alias: 'c',
		}),
	),
});
