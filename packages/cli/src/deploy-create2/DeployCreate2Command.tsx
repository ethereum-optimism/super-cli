import {Box, Text} from 'ink';
import {useEffect, useState} from 'react';

import {Spinner, Badge} from '@inkjs/ui';
import {DeployCreateXCreate2Params} from '@/actions/deployCreateXCreate2';
import {useMappingChainById} from '@/queries/chainById';

import {Address, Chain, encodeFunctionData, Hex} from 'viem';
import {useConfig, useWriteContract} from 'wagmi';
import {useForgeArtifact} from '@/queries/forgeArtifact';
import {ForgeArtifact} from '@/forge/readForgeArtifact';
import {CREATEX_ADDRESS, createXABI} from '@/contracts/createx/constants';
import {useMappingChainByIdentifier} from '@/queries/chainByIdentifier';
import {privateKeyToAccount} from 'viem/accounts';
import {useTransactionTaskStore} from '@/stores/transactionTaskStore';
import {createTransactionTaskId} from '@/transaction-task/transactionTask';
import {getBlockExplorerAddressLink} from '@/utils/blockExplorer';
import {getDeployCreate2Params} from '@/deploy-create2/getDeployCreate2Params';
import {useQuery} from '@tanstack/react-query';
import {preVerificationCheckQueryOptions} from '@/deploy-create2/preVerificationCheckQuery';
import {simulationCheckQueryOptions} from '@/deploy-create2/simulationCheckQuery';
import {useChecksForChains} from '@/deploy-create2/useChecksForChains';
import {
	ChooseExecutionOption,
	ExecutionOption,
} from '@/deploy-create2/ChooseExecutionOption';

// Prepares any required data or loading state if waiting
export const DeployCreate2Command = ({
	options,
}: {
	options: DeployCreateXCreate2Params;
}) => {
	const {data: chainById, isLoading: isChainByIdLoading} =
		useMappingChainById();

	const {data: chainByIdentifier, isLoading: isChainByIdentifierLoading} =
		useMappingChainByIdentifier();

	const {data: forgeArtifact, isLoading: isForgeArtifactLoading} =
		useForgeArtifact(options.forgeArtifactPath);

	if (
		isChainByIdLoading ||
		!chainById ||
		isForgeArtifactLoading ||
		!forgeArtifact ||
		isChainByIdentifierLoading ||
		!chainByIdentifier
	) {
		return <Spinner />;
	}

	const chains = options.chains.map(
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
	const {chainsToDeployTo} = useChecksForChains({
		deterministicAddress,
		initCode,
		baseSalt,
		chainIds: chains.map(chain => chain.id),
	});

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
					<ChooseExecutionOption onSubmit={setExecutionOption} />
				</Box>
			)}
		</Box>
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
				<Text>Contract is ready to be deployed</Text>
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
	const {writeContract, isPending, error} = useWriteContract();

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

	if (isPending) {
		return <Spinner label="Deploying contract" />;
	}

	if (error) {
		return <Text>Error deploying contract: {error.message}</Text>;
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
			<Text>{getBlockExplorerAddressLink(chain, deterministicAddress)}</Text>
		</Box>
	);
};
