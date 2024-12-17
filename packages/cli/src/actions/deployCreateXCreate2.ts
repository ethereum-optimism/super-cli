import {zodSupportedNetwork} from '@/superchain-registry/fetchChainList';
import {zodPrivateKey} from '@/validators/schemas';
import {option} from 'pastel';

import z from 'zod';

export const zodDeployCreateXCreate2Params = z.object({
	forgeArtifactPath: z
		.string()
		.describe(
			option({
				description: 'Path to the Forge artifact',
				alias: 'f',
			}),
		)
		.min(1),
	constructorArgs: z
		.string()
		.describe(
			option({
				description: 'Arguments to the constructor',
				alias: 'cargs',
			}),
		)
		.min(4)
		.optional(),
	salt: z.string().describe(
		option({
			description: 'Salt',
			alias: 's',
		}),
	),
	privateKey: zodPrivateKey.optional().describe(
		option({
			description: 'Signer private key',
			alias: 'pk',
		}),
	),
	chains: z.array(z.string()).describe(
		option({
			description: 'Chains to deploy to',
			alias: 'c',
		}),
	),
	network: zodSupportedNetwork.describe(
		option({
			description: 'Network to deploy to',
			alias: 'n',
		}),
	),
	verify: z
		.boolean()
		.default(false)
		.optional()
		.describe(
			option({
				description: 'Verify contract on deployed chains',
				alias: 'v',
			}),
		),
});

export type DeployCreateXCreate2Params = z.infer<
	typeof zodDeployCreateXCreate2Params
>;
