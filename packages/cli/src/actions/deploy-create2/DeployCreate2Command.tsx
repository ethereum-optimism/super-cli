import {Box, Text} from 'ink';
import {useEffect, useState} from 'react';

import {Spinner} from '@inkjs/ui';
import {DeployCreateXCreate2Params} from '@/actions/deployCreateXCreate2';

import {Address, Chain} from 'viem';
import {useConfig} from 'wagmi';
import {useForgeArtifact} from '@/queries/forgeArtifact';
import {ForgeArtifact} from '@/util/forge/readForgeArtifact';
import {useMappingChainByIdentifier} from '@/queries/chainByIdentifier';
import {privateKeyToAccount} from 'viem/accounts';
import {computeDeploymentParams} from '@/actions/deploy-create2/computeDeploymentParams';
import {useMutation} from '@tanstack/react-query';

import {useChecksForChains} from '@/actions/deploy-create2/hooks/useChecksForChains';
import {
	ChooseExecutionOption,
	ExecutionOption,
} from '@/components/ChooseExecutionOption';

import {VerifyCommandInner} from '@/commands/verify';
import {deployCreate2} from '@/actions/deploy-create2/deployCreate2';
import {
	sendAllTransactionTasksWithPrivateKeyAccount,
	sendAllTransactionTasksWithCustomWalletRpc,
} from '@/actions/deploy-create2/sendAllTransactionTasks';
import {getSponsoredSenderWalletRpcUrl} from '@/util/sponsoredSender';
import {DeployStatus} from '@/actions/deploy-create2/components/DeployStatus';
import {DeploymentParams} from '@/actions/deploy-create2/types';

// Prepares any required data or loading state if waiting
export const DeployCreate2Command = ({
	options,
}: {
	options: DeployCreateXCreate2Params;
}) => {
	const {data: chainByIdentifier, isLoading: isChainByIdentifierLoading} =
		useMappingChainByIdentifier();

	const {data: forgeArtifact, isLoading: isForgeArtifactLoading} =
		useForgeArtifact(options.forgeArtifactPath);

	if (
		isForgeArtifactLoading ||
		!forgeArtifact ||
		isChainByIdentifierLoading ||
		!chainByIdentifier
	) {
		return <Spinner />;
	}

	// TODO: Fix option formatting between wizard and command
	// Wizards = [ 'op', 'base' ]
	// Command = [ 'op, base' ]
	const flattenedChains = options.chains.flatMap(chain => chain.split(','));
	const chains = flattenedChains.map(x => {
		const chain = chainByIdentifier[`${options.network}/${x}`]!;
		if (!chain) {
			throw new Error(`Chain ${`${options.network}/${x}`} not found`);
		}
		return chain;
	});

	const intent = {
		chains,
		forgeArtifactPath: options.forgeArtifactPath,
		forgeArtifact,
		constructorArgs: options.constructorArgs?.split(','),
		salt: options.salt,
	};

	const computedParams = computeDeploymentParams(intent);

	return (
		<DeployCreate2CommandInner
			deploymentParams={{
				intent,
				computedParams,
			}}
			options={options}
		/>
	);
};

const DeployCreate2CommandInner = ({
	deploymentParams,
	options,
}: {
	deploymentParams: DeploymentParams;
	options: DeployCreateXCreate2Params;
}) => {
	const [executionOption, setExecutionOption] =
		useState<ExecutionOption | null>(
			options.privateKey
				? {type: 'privateKey', privateKey: options.privateKey}
				: null,
		);

	const {initCode, deterministicAddress, baseSalt} =
		deploymentParams.computedParams;

	const {chainIdsToDeployTo} = useChecksForChains(deploymentParams);

	const wagmiConfig = useConfig();

	const chainIdsToDeployToSet = new Set(chainIdsToDeployTo);

	const chainsToDeployTo = chainIdsToDeployTo
		? wagmiConfig.chains.filter(chain => chainIdsToDeployToSet.has(chain.id))
		: undefined;

	const {mutate, data} = useMutation({
		mutationFn: () => {
			if (!chainsToDeployTo) {
				throw new Error('No chains to deploy to');
			}

			return deployCreate2({
				wagmiConfig,
				deterministicAddress,
				initCode,
				baseSalt,
				chains: chainsToDeployTo,
				foundryArtifactPath: options.forgeArtifactPath,
				contractArguments: options.constructorArgs?.split(',') ?? [],
				account: options.privateKey
					? privateKeyToAccount(options.privateKey)
					: undefined,
			});
		},
	});

	useEffect(() => {
		if (!chainsToDeployTo) return;
		mutate();
	}, [chainsToDeployTo?.map(x => x.id).join('-')]);

	return (
		<Box flexDirection="column" gap={1}>
			<Box flexDirection="column" gap={1}>
				<Text bold underline>
					Deployments
				</Text>
				<Box flexDirection="column" paddingLeft={2}>
					<Text>
						Contract: <Text color="cyan">{options.forgeArtifactPath}</Text>
					</Text>
					<Text>
						Network: <Text color="blue">{options.network}</Text>
					</Text>
					<Text>
						Target Chains:{' '}
						<Text color="green">
							{deploymentParams.intent.chains
								.map(chain => chain.name)
								.join(', ')}
						</Text>
					</Text>
					<Text>
						Salt: <Text color="magenta">{baseSalt}</Text>
					</Text>

					{options.constructorArgs && (
						<Box flexDirection="column">
							<Text>Constructor Arguments:</Text>
							<Text color="cyan">
								{options.constructorArgs.split(',').join(', ')}
							</Text>
						</Box>
					)}
					<Box marginTop={1}>
						<Text>
							Address:{' '}
							<Text color="yellow" bold>
								{deterministicAddress}
							</Text>
						</Text>
					</Box>
				</Box>
			</Box>
			<Box flexDirection="column" paddingX={2}>
				<Box flexDirection="row">
					<Box flexDirection="column" marginRight={2}>
						{deploymentParams.intent.chains.map(chain => (
							<Text key={chain.id} bold color="blue">
								{chain.name}:
							</Text>
						))}
					</Box>
					<Box flexDirection="column">
						{deploymentParams.intent.chains.map(chain => (
							<DeployStatus
								key={chain.id}
								chain={chain}
								initCode={initCode}
								baseSalt={baseSalt}
								deterministicAddress={deterministicAddress}
								executionOption={executionOption}
							/>
						))}
					</Box>
				</Box>
			</Box>
			{chainsToDeployTo && chainsToDeployTo.length > 0 && !executionOption && (
				<Box>
					<ChooseExecutionOption
						label={'🚀 Ready to deploy!'}
						onSubmit={async executionOption => {
							if (executionOption.type === 'privateKey') {
								setExecutionOption(executionOption);
								await sendAllTransactionTasksWithPrivateKeyAccount(
									privateKeyToAccount(executionOption.privateKey),
								);
							} else if (executionOption.type === 'sponsoredSender') {
								setExecutionOption(executionOption);
								await sendAllTransactionTasksWithCustomWalletRpc(chainId =>
									getSponsoredSenderWalletRpcUrl(
										executionOption.apiKey,
										chainId,
									),
								);
							} else {
								setExecutionOption(executionOption);
							}
						}}
					/>
				</Box>
			)}
			{data && (
				<CompletedOrVerify
					shouldVerify={!!options.verify}
					chains={deploymentParams.intent.chains}
					forgeArtifactPath={options.forgeArtifactPath}
					contractAddress={deterministicAddress}
					forgeArtifact={deploymentParams.intent.forgeArtifact}
				/>
			)}
		</Box>
	);
};

const CompletedOrVerify = ({
	shouldVerify,
	chains,
	forgeArtifactPath,
	contractAddress,
	forgeArtifact,
}: {
	shouldVerify: boolean;
	chains: Chain[];
	forgeArtifactPath: string;
	contractAddress: Address;
	forgeArtifact: ForgeArtifact;
}) => {
	if (!shouldVerify) {
		// TODO: hacky way to quit until we remove pastel
		setTimeout(() => {
			process.exit(0);
		}, 1);
		return (
			<Box>
				<Text>Contract is successfully deployed to all chains</Text>
			</Box>
		);
	}

	return (
		<VerifyCommandInner
			chains={chains}
			forgeArtifactPath={forgeArtifactPath}
			contractAddress={contractAddress}
			forgeArtifact={forgeArtifact}
		/>
	);
};
