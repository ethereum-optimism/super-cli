import {StatusMessage} from '@inkjs/ui';
import {zodDeployCreateXCreate2Params} from '@/actions/deployCreateXCreate2';
import {z} from 'zod';
import {option} from 'pastel';
import {DeployCreate2Wizard} from '@/deploy-create2-wizard/DeployCreate2Wizard';
import {fromZodError} from 'zod-validation-error';
import {parseSuperConfigFromTOML} from '@/utils/config';

import {DeployCreate2Command} from '@/deploy-create2/DeployCreate2Command';
import {SupportedNetwork} from '@/superchain-registry/fetchChainList';

const zodDeployCreate2CommandEntrypointOptions = zodDeployCreateXCreate2Params
	.partial()
	.merge(
		z.object({
			interactive: z
				.boolean()
				.default(false)
				.optional()
				.describe(
					option({
						description: 'Interactive mode',
						alias: 'i',
					}),
				),
			toml: z
				.string()
				.optional()
				.describe(
					option({
						description: 'Path to a TOML file to use as a configuration',
						alias: 't',
					}),
				),
		}),
	);

type EntrypointOptions = z.infer<
	typeof zodDeployCreate2CommandEntrypointOptions
>;

const DeployCreate2CommandEntrypoint = ({
	options,
}: {
	options: EntrypointOptions;
}) => {
	if (options.interactive) {
		return <DeployCreate2Wizard />;
	}

	const commandOptions = options.toml
		? getOptionsFromTOML(options.toml)
		: options;

	const parseResult = zodDeployCreateXCreate2Params.safeParse(commandOptions);

	return parseResult.success ? (
		<DeployCreate2Command options={parseResult.data} />
	) : (
		<StatusMessage variant="error">
			{
				fromZodError(parseResult.error, {
					maxIssuesInMessage: 1,
					prefix: '',
					prefixSeparator: '',
				}).message
			}
		</StatusMessage>
	);
};

const getOptionsFromTOML = (tomlPath: string) => {
	const superConfig = parseSuperConfigFromTOML(tomlPath);
	const params = superConfig.creation_params?.[0];

	if (!params) {
		throw new Error('No creation params found in config file.');
	}

	return {
		salt: params.salt,
		chains: params.chains,
		network: params.network as SupportedNetwork,
		verify: params.verify,
		constructorArgs: params.constructor_args?.join(','),
	};
};

export default DeployCreate2CommandEntrypoint;
export const options = zodDeployCreate2CommandEntrypointOptions;
