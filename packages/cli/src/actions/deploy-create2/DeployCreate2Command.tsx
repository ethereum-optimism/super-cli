import {Box, Text} from 'ink';
import {useEffect, useState} from 'react';

import {Spinner, Badge} from '@inkjs/ui';
import {DeployCreateXCreate2Params} from '@/actions/deployCreateXCreate2';

import {
	Address,
	Chain,
	encodeFunctionData,
	formatEther,
	formatUnits,
	Hex,
	zeroAddress,
} from 'viem';
import {useConfig, useWaitForTransactionReceipt} from 'wagmi';
import {useForgeArtifact} from '@/queries/forgeArtifact';
import {ForgeArtifact} from '@/util/forge/readForgeArtifact';
import {CREATEX_ADDRESS, createXABI} from '@/util/createx/constants';
import {useMappingChainByIdentifier} from '@/queries/chainByIdentifier';
import {privateKeyToAccount} from 'viem/accounts';
import {getBlockExplorerAddressLink} from '@/util/blockExplorer';
import {getDeployCreate2Params} from '@/actions/deploy-create2/getDeployCreate2Params';
import {useMutation, useQuery} from '@tanstack/react-query';
import {preVerificationCheckQueryOptions} from '@/actions/deploy-create2/queries/preVerificationCheckQuery';
import {simulationCheckQueryOptions} from '@/actions/deploy-create2/queries/simulationCheckQuery';
import {useChecksForChains} from '@/actions/deploy-create2/hooks/useChecksForChains';
import {
	ChooseExecutionOption,
	ExecutionOption,
} from '@/components/ChooseExecutionOption';

import {VerifyCommandInner} from '@/commands/verify';
import {useGasEstimation} from '@/hooks/useGasEstimation';
import {useOperation} from '@/stores/operationStore';
import {
	deployCreate2,
	executeTransactionOperation,
} from '@/actions/deploy-create2/deployCreate2';
import {
	sendAllTransactionTasksWithPrivateKeyAccount,
	sendAllTransactionTasksWithCustomWalletRpc,
} from '@/actions/deploy-create2/sendAllTransactionTasks';
import {getSponsoredSenderWalletRpcUrl} from '@/util/sponsoredSender';

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

	return (
		<DeployCreate2CommandInner
			chains={chains}
			forgeArtifact={forgeArtifact}
			options={options}
		/>
	);
};

const DeployCreate2CommandInner = ({
	chains,
	forgeArtifact,
	options,
}: {
	chains: Chain[];
	forgeArtifact: ForgeArtifact;
	options: DeployCreateXCreate2Params;
}) => {
	const [executionOption, setExecutionOption] =
		useState<ExecutionOption | null>(
			options.privateKey
				? {type: 'privateKey', privateKey: options.privateKey}
				: null,
		);

	const {initCode, deterministicAddress, baseSalt} = getDeployCreate2Params({
		forgeArtifact,
		constructorArgs: options.constructorArgs,
		salt: options.salt,
	});

	const {chainsToDeployTo: chainIdsToDeployTo} = useChecksForChains({
		deterministicAddress,
		initCode,
		baseSalt,
		chainIds: chains.map(chain => chain.id),
	});

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
							{chains.map(chain => chain.name).join(', ')}
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
						{chains.map(chain => (
							<Text key={chain.id} bold color="blue">
								{chain.name}:
							</Text>
						))}
					</Box>
					<Box flexDirection="column">
						{chains.map(chain => (
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
					chains={chains}
					forgeArtifactPath={options.forgeArtifactPath}
					contractAddress={deterministicAddress}
					forgeArtifact={forgeArtifact}
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

const DeployStatus = ({
	chain,
	initCode,
	baseSalt,
	deterministicAddress,
	executionOption,
}: {
	chain: Chain;
	initCode: Hex;
	baseSalt: Hex;
	deterministicAddress: Address;
	executionOption: ExecutionOption | null;
}) => {
	const wagmiConfig = useConfig();

	const {
		data: preVerificationCheckData,
		isLoading: isPreVerificationCheckLoading,
		error: preVerificationCheckError,
	} = useQuery({
		...preVerificationCheckQueryOptions(wagmiConfig, {
			deterministicAddress,
			initCode,
			baseSalt,
			chainId: chain.id,
		}),
	});

	const {
		data: simulationData,
		isLoading: isSimulationLoading,
		error: simulationError,
	} = useQuery({
		...simulationCheckQueryOptions(wagmiConfig, {
			deterministicAddress,
			initCode,
			baseSalt,
			chainId: chain.id,
		}),
	});

	const {data: gasEstimation, isLoading: isGasEstimationLoading} =
		useGasEstimation({
			chainId: chain.id,
			to: CREATEX_ADDRESS,
			account: zeroAddress,

			data: encodeFunctionData({
				abi: createXABI,
				functionName: 'deployCreate2',
				args: [baseSalt, initCode],
			}),
		});

	if (preVerificationCheckError) {
		return (
			<Box gap={1}>
				<Badge color="red">Error</Badge>
				<Text>
					Pre-verification check failed:{' '}
					{preVerificationCheckError.message.split('\n')[0]}
				</Text>
			</Box>
		);
	}

	if (isPreVerificationCheckLoading || !preVerificationCheckData) {
		return <Spinner label="Checking if contract is already deployed" />;
	}

	if (preVerificationCheckData.isAlreadyDeployed) {
		return (
			<Box gap={1}>
				<Badge color="green">Deployed</Badge>
				<Text>Contract is already deployed</Text>

				<Text>{getBlockExplorerAddressLink(chain, deterministicAddress)}</Text>
			</Box>
		);
	}

	if (simulationError) {
		return (
			<Box gap={1}>
				<Badge color="red">Error</Badge>
				<Text>
					Simulation check failed: {simulationError.message.split('\n')[0]}
				</Text>
			</Box>
		);
	}

	if (isSimulationLoading || !simulationData) {
		return (
			<Spinner label="Simulating deployment to check for address mismatch" />
		);
	}

	if (!simulationData.isAddressSameAsExpected) {
		return (
			<Box gap={1}>
				<Badge color="red">Failed</Badge>
				<Text>Address mismatch</Text>
			</Box>
		);
	}

	if (!executionOption) {
		return (
			<Box gap={1}>
				<Badge color="blue">Ready</Badge>
				<Text>Estimated fees</Text>
				{isGasEstimationLoading || !gasEstimation ? (
					<Spinner />
				) : (
					<GasEstimation gasEstimation={gasEstimation} />
				)}
			</Box>
		);
	}

	if (
		executionOption.type === 'privateKey' ||
		executionOption.type === 'sponsoredSender'
	) {
		return (
			<PrivateKeyExecution
				chain={chain}
				initCode={initCode}
				baseSalt={baseSalt}
				deterministicAddress={deterministicAddress}
			/>
		);
	}

	return (
		<ExternalSignerExecution
			chain={chain}
			initCode={initCode}
			baseSalt={baseSalt}
			deterministicAddress={deterministicAddress}
		/>
	);
};

const GasEstimation = ({
	gasEstimation,
}: {
	gasEstimation: {
		totalFee: bigint;
		estimatedL1Fee: bigint;
		estimatedL2Gas: bigint;
		l2GasPrice: bigint;
	};
}) => {
	return (
		<Text>
			<Text>(L1 Fee: </Text>
			<Text color="green">{formatEther(gasEstimation.estimatedL1Fee)} ETH</Text>
			<Text>) + (L2 Gas: </Text>
			<Text color="yellow">{gasEstimation.estimatedL2Gas.toString()}</Text>
			<Text> gas × L2 Gas Price: </Text>
			<Text color="cyan">{formatUnits(gasEstimation.l2GasPrice, 9)} gwei</Text>
			<Text>) = </Text>
			<Text color="green" bold>
				{formatEther(gasEstimation.totalFee)} ETH
			</Text>
		</Text>
	);
};

const PrivateKeyExecution = ({
	chain,
	initCode,
	baseSalt,
	deterministicAddress,
}: {
	chain: Chain;
	initCode: Hex;
	baseSalt: Hex;
	deterministicAddress: Address;
}) => {
	const {
		status,
		data: transactionHash,
		error,
	} = useOperation(
		executeTransactionOperation({
			chainId: chain.id,
			deterministicAddress,
			initCode,
			baseSalt,
		}),
	);

	const {isLoading: isReceiptLoading} = useWaitForTransactionReceipt({
		hash: transactionHash,
		chainId: chain.id,
	});

	if (status === 'pending') {
		return <Spinner label="Deploying contract" />;
	}

	if (error) {
		return <Text>Error deploying contract: {error.message}</Text>;
	}

	if (isReceiptLoading) {
		return <Spinner label="Waiting for receipt" />;
	}

	return (
		<Box gap={1}>
			<Badge color="green">Deployed</Badge>
			<Text>Contract successfully deployed</Text>
			<Text>{getBlockExplorerAddressLink(chain, deterministicAddress)}</Text>
		</Box>
	);
};

const ExternalSignerExecution = ({
	chain,
	initCode,
	baseSalt,
	deterministicAddress,
}: {
	chain: Chain;
	initCode: Hex;
	baseSalt: Hex;
	deterministicAddress: Address;
}) => {
	const {data: hash} = useOperation(
		executeTransactionOperation({
			chainId: chain.id,
			deterministicAddress,
			initCode,
			baseSalt,
		}),
	);

	const {data: receipt, isLoading: isReceiptLoading} =
		useWaitForTransactionReceipt({
			hash,
			chainId: chain.id,
		});

	if (!hash) {
		return (
			<Box gap={1}>
				<Spinner label="Waiting for signature..." />
				<Box flexDirection="row">
					<Text>Send the transaction at </Text>
					<Text color="cyan" bold>
						http://localhost:3000
					</Text>
				</Box>
			</Box>
		);
	}

	if (isReceiptLoading || !receipt) {
		return <Spinner label="Waiting for receipt" />;
	}

	return (
		<Box gap={1}>
			<Badge color="green">Deployed</Badge>
			<Text>Contract successfully deployed</Text>
			<Text>{getBlockExplorerAddressLink(chain, deterministicAddress)}</Text>
		</Box>
	);
};
