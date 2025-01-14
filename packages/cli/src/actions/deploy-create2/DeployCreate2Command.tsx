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
import {
	useConfig,
	useTransaction,
	useWaitForTransactionReceipt,
	useWriteContract,
} from 'wagmi';
import {useForgeArtifact} from '@/queries/forgeArtifact';
import {ForgeArtifact} from '@/lib/forge/readForgeArtifact';
import {CREATEX_ADDRESS, createXABI} from '@/lib/createx/constants';
import {useMappingChainByIdentifier} from '@/queries/chainByIdentifier';
import {privateKeyToAccount} from 'viem/accounts';
import {useTransactionTaskStore} from '@/stores/transactionTaskStore';
import {createTransactionTaskId} from '@/lib/transactionTask';
import {getBlockExplorerAddressLink} from '@/lib/blockExplorer';
import {getDeployCreate2Params} from '@/actions/deploy-create2/getDeployCreate2Params';
import {useQuery} from '@tanstack/react-query';
import {preVerificationCheckQueryOptions} from '@/actions/deploy-create2/queries/preVerificationCheckQuery';
import {simulationCheckQueryOptions} from '@/actions/deploy-create2/queries/simulationCheckQuery';
import {useChecksForChains} from '@/actions/deploy-create2/hooks/useChecksForChains';
import {
	ChooseExecutionOption,
	ExecutionOption,
} from '@/components/ChooseExecutionOption';
import {useCodeForChains} from '@/actions/deploy-create2/hooks/useCodeForChains';
import {useRefetchCodeOnReceipt} from '@/actions/deploy-create2/hooks/useRefetchCodeOnReceipt';
import {VerifyCommandInner} from '@/commands/verify';
import {useGasEstimation} from '@/hooks/useGasEstimation';
import {useBroadcastStore} from '@/stores/broadcastStore';
import {writeMultichainBroadcast} from '@/lib/broadcasts';
import {fromFoundryArtifactPath} from '@/lib/forge/foundryProject';

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
	const chains = flattenedChains.map(
		chain => chainByIdentifier[`${options.network}/${chain}`]!,
	);

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
	const {createBroadcast} = useBroadcastStore();

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

	const {isDeployedToAllChains} = useCodeForChains(
		deterministicAddress,
		chains.map(chain => chain.id),
	);

	const {chainsToDeployTo} = useChecksForChains({
		deterministicAddress,
		initCode,
		baseSalt,
		chainIds: chains.map(chain => chain.id),
	});

	useEffect(() => {
		(async () => {
			const {foundryProject, contractFileName} = await fromFoundryArtifactPath(
				options.forgeArtifactPath,
			);

			createBroadcast({
				contractAddress: deterministicAddress,
				contractName: contractFileName,
				foundryProjectRoot: foundryProject.baseDir,
				contractArguments: options.constructorArgs?.split(','),
			});
		})();
	}, []);

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
						onSubmit={setExecutionOption}
					/>
				</Box>
			)}
			{isDeployedToAllChains && (
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
	const {broadcasts} = useBroadcastStore();
	const [isGeneratingBroadcastArtifacts, setIsGeneratingBroadcastArtifacts] =
		useState(true);

	useEffect(() => {
		const multichainBroadcast = broadcasts[contractAddress];
		if (multichainBroadcast) {
			writeMultichainBroadcast(multichainBroadcast);
		}
		setIsGeneratingBroadcastArtifacts(false);
	}, [broadcasts]);

	if (isGeneratingBroadcastArtifacts) {
		return <Spinner label="Generating broadcast artifacts" />;
	}

	if (!shouldVerify) {
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

	if (executionOption.type === 'privateKey') {
		return (
			<PrivateKeyExecution
				chain={chain}
				initCode={initCode}
				baseSalt={baseSalt}
				deterministicAddress={deterministicAddress}
				privateKey={executionOption.privateKey}
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
	privateKey,
}: {
	chain: Chain;
	initCode: Hex;
	baseSalt: Hex;
	deterministicAddress: Address;
	privateKey: Hex;
}) => {
	const {
		writeContract,
		isPending,
		error,
		data: transactionHash,
	} = useWriteContract();

	const {addTransaction} = useBroadcastStore();

	const {data: receipt, isLoading: isReceiptLoading} =
		useWaitForTransactionReceipt({
			hash: transactionHash,
			chainId: chain.id,
		});

	const {data: transaction, isLoading: isTransactionLoading} = useTransaction({
		hash: transactionHash,
		chainId: chain.id,
	});

	useRefetchCodeOnReceipt(deterministicAddress, chain.id, receipt);

	useEffect(() => {
		writeContract({
			abi: createXABI,
			account: privateKeyToAccount(privateKey),
			address: CREATEX_ADDRESS,
			chainId: chain.id,
			functionName: 'deployCreate2',
			args: [baseSalt, initCode],
		});
	}, []);

	useEffect(() => {
		if (receipt && transaction) {
			addTransaction({
				chainId: chain.id,
				hash: transaction.hash,
				transaction: transaction,
				receipt: receipt,
				contractAddress: deterministicAddress,
			});
		}
	}, [receipt, transaction]);

	if (isPending) {
		return <Spinner label="Deploying contract" />;
	}

	if (error) {
		return <Text>Error deploying contract: {error.message}</Text>;
	}

	if (isReceiptLoading || isTransactionLoading) {
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
	const {addTransaction} = useBroadcastStore();
	const encodedData = encodeFunctionData({
		abi: createXABI,
		args: [baseSalt, initCode],
		functionName: 'deployCreate2',
	});

	const {createTask, taskEntryById} = useTransactionTaskStore();

	const taskId = createTransactionTaskId({
		chainId: chain.id,
		to: CREATEX_ADDRESS,
		data: encodedData,
	});

	useEffect(() => {
		createTask({
			chainId: chain.id,
			to: CREATEX_ADDRESS,
			data: encodedData,
		});
	}, []);

	const {data: receipt, isLoading: isReceiptLoading} =
		useWaitForTransactionReceipt({
			hash: taskEntryById[taskId]?.hash,
			chainId: chain.id,
		});

	const {data: transaction, isLoading: isTransactionLoading} = useTransaction({
		hash: taskEntryById[taskId]?.hash,
		chainId: chain.id,
	});

	useRefetchCodeOnReceipt(deterministicAddress, chain.id, receipt);

	useEffect(() => {
		if (receipt && transaction) {
			addTransaction({
				chainId: chain.id,
				hash: transaction.hash,
				transaction: transaction,
				receipt: receipt,
				contractAddress: deterministicAddress,
			});
		}
	}, [receipt, transaction]);

	if (isReceiptLoading || isTransactionLoading) {
		return <Spinner label="Waiting for receipt" />;
	}

	if (!taskEntryById[taskId]?.hash) {
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

	return (
		<Box gap={1}>
			<Badge color="green">Deployed</Badge>
			<Text>Contract successfully deployed</Text>
			<Text>{getBlockExplorerAddressLink(chain, deterministicAddress)}</Text>P
		</Box>
	);
};
