import {Box, Text, Newline} from 'ink';
import {useEffect} from 'react';

import {Spinner, UnorderedList, Badge, Alert, StatusMessage} from '@inkjs/ui';
import {DeploymentNetworks, useDeploymentsStore} from '@/stores/deployments';
import {
	deployCreateXCreate2,
	deployCreateXCreate2ComputeAddress,
	DeployCreateXCreate2Params,
	zodDeployCreateXCreate2Params,
} from '@/actions/deployCreateXCreate2';
import {useQuery} from '@tanstack/react-query';
import {useMappingChainById} from '@/queries/chainById';
import {z} from 'zod';
import {option} from 'pastel';
import {DeployCreate2Wizard} from '@/deploy-create2-wizard/DeployCreate2Wizard';
import {fromZodError} from 'zod-validation-error';
import VerifyCommand from '@/commands/verify';
import { parseSuperConfigFromTOML } from '@/utils/config';

const statusBadge = {
	pending: <Spinner />,
	success: <Badge color="green">Done</Badge>,
	skipped: <Badge color="yellow">Skipped</Badge>,
	error: (
		<Badge color="red">
			<Text color="white" bold>
				Failed
			</Text>
		</Badge>
	),
};

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
	if (options.interactive === true) {
		return <DeployCreate2Wizard />;
	}

	let commandOptions = { ...options };
	if (options.toml) {
		const superConfig = parseSuperConfigFromTOML(options.toml);

		const params = superConfig.creation_params?.[0];
		if (!params) {
			return <StatusMessage variant="error">No creation params found in config file.</StatusMessage>
		}

		commandOptions.salt = params.salt;
		commandOptions.chains = params.chains;
		commandOptions.network = params.network as DeploymentNetworks;
		commandOptions.verify = params.verify;
		commandOptions.constructorArgs = params.constructor_args?.join(',');
	}

	// If non-interactive, all fields must be there
	const parseResult = zodDeployCreateXCreate2Params.safeParse(commandOptions);
	if (parseResult.success == false) {
		return (
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
	}
	return <DeployCreate2Command options={parseResult.data} />;
};

const DeployCreate2Command = ({
	options,
}: {
	options: DeployCreateXCreate2Params;
}) => {
	const {data: chainById} = useMappingChainById();

	useEffect(() => {
		deployCreateXCreate2(options);
	}, [options]);

	const {data: deterministicAddress, isLoading: isAddressLoading} =
		useDeterministicAddress(options);

	const deployment = useDeploymentsStore(state =>
		deterministicAddress ? state.deployments[deterministicAddress] : undefined,
	);

	if (!chainById || isAddressLoading || !deterministicAddress || !deployment) {
		return <Spinner />;
	}

	const postVerificationComponents = [];
	if (deployment.state === 'completed') {
		if (options.verify) {
			postVerificationComponents.push(
				<VerifyCommand
					key="verify"
					options={{
						contractAddress: deterministicAddress,
						forgeArtifactPath: options.forgeArtifactPath,
						network: options.network,
						chains: options.chains,
					}}
				/>
			)
		}
		postVerificationComponents.push(<Text key="completed" bold>Deployment run completed</Text>);
	}

	return (
		<Box flexDirection="column" gap={1} paddingTop={2} paddingX={2}>
			<Text bold>Superchain ERC20 Deployment</Text>

			{deployment?.creationParams.initCode && (
				<Box flexDirection="column">
					<Text bold>Initialization Code:</Text>
					<Alert variant="success">{deployment?.creationParams.initCode}</Alert>
				</Box>
			)}

			{deployment?.deterministicAddress && (
				<Box flexDirection="column" width={50}>
					<Text bold>Deterministic Address:</Text>
					<Alert variant="success">{deployment?.deterministicAddress}</Alert>
				</Box>
			)}

			{deployment?.chainIds && (
				<Box flexDirection="column">
					<Text bold>Plan</Text>
					<UnorderedList>
						{deployment?.chainIds.map(chainId => (
							<UnorderedList.Item key={chainId}>
								<Text bold>{chainById[chainId]!.name}</Text>
								<UnorderedList>
									<UnorderedList.Item>
										<Box flexDirection="column">
											<Box flexDirection="row">
												<Text bold>Pre-Deployment Verification: </Text>
												{
													statusBadge[
														deployment!.steps[chainId]!.preVerification.status
													]
												}
											</Box>
											{deployment!.steps[chainId]!.preVerification.message && (
												<Alert variant="error">
													{deployment!.steps[chainId]!.preVerification.message}
												</Alert>
											)}
										</Box>
									</UnorderedList.Item>

									<UnorderedList.Item>
										<Box flexDirection="column">
											<Box flexDirection="row">
												<Text bold>Simulation: </Text>
												{
													statusBadge[
														deployment!.steps[chainId]!.simulation.status
													]
												}
											</Box>
											{deployment!.steps[chainId]!.simulation.message && (
												<Alert variant="error">
													{deployment!.steps[chainId]!.simulation.message}
												</Alert>
											)}
											{deployment!.steps[chainId]!.simulation.selector && (
												<Alert variant="error">
													{deployment!.steps[chainId]!.simulation.selector}
												</Alert>
											)}
										</Box>
									</UnorderedList.Item>

									<UnorderedList.Item>
										<Box flexDirection="row">
											<Text bold>Execution: </Text>
											{
												statusBadge[
													deployment!.steps[chainId]!.execution.status
												]
											}
										</Box>
										{deployment!.steps[chainId]!.execution.message && (
											<Alert variant="error">
												{deployment!.steps[chainId]!.execution.message}
											</Alert>
										)}
									</UnorderedList.Item>
								</UnorderedList>
							</UnorderedList.Item>
						))}
					</UnorderedList>
				</Box>
			)}

			{!!deployment?.broadcasts.length && (
				<Box flexDirection="column">
					<Text bold>Broadcasts</Text>
					<UnorderedList>
						{deployment?.broadcasts.map(broadcast => (
							<UnorderedList.Item key={broadcast.chainId}>
								<Box flexDirection="row">
									<Text bold>{chainById[broadcast.chainId]!.name}: </Text>
									<Text>{broadcast.hash}</Text>
								</Box>
							</UnorderedList.Item>
						))}
					</UnorderedList>
				</Box>
			)}

			{deployment?.state === 'completed' && postVerificationComponents}

			<Newline />
		</Box>
	);
};

const useDeterministicAddress = (params: DeployCreateXCreate2Params) => {
	return useQuery({
		// TODO check this query key is consistent
		queryKey: ['deterministicAddress', params],
		queryFn: async () => {
			return deployCreateXCreate2ComputeAddress(params);
		},
	});
};

export default DeployCreate2CommandEntrypoint;
export {DeployCreate2Command};
export const options = zodDeployCreate2CommandEntrypointOptions;
