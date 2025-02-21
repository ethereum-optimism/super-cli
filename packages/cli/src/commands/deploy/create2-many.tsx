import {Spinner, StatusMessage} from '@inkjs/ui';
import {z} from 'zod';
import {option} from 'pastel';
import fs from 'fs/promises';
import {parse as parseTOML} from 'smol-toml';

import {
	SupportedNetwork,
	zodSupportedNetwork,
} from '@/util/fetchSuperchainRegistryChainList';
import {useQueries} from '@tanstack/react-query';
import {getForgeArtifactQueryParams} from '@/queries/forgeArtifact';
import {
	resolveContractDeploymentParams,
	ResolvedContractDeploymentParams,
	UnresolvedConstructorArg,
	UnresolvedContractDeploymentParams,
	zodTarget,
} from '@/util/resolveContractDeploymentParams';

import {Box, Text} from 'ink';
import {useEffect, useMemo, useState} from 'react';

import {Badge} from '@inkjs/ui';
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
import {zodPrivateKey} from '@/util/schemas';
import {useChecksForChainsForContracts} from '@/actions/deploy-create2/hooks/useChecksForChainsForContracts';

const zodContractConfig = z
	.object({
		id: z.string().optional(),
		salt: z.string(),
		constructor_args: z.array(z.any()).optional(),
		forge_artifact_path: z.string(),
	})
	.transform(params => {
		return {
			id: params.id,
			salt: params.salt,
			constructorArgs: params.constructor_args,
			forgeArtifactPath: params.forge_artifact_path,
		};
	});

export type ContractConfig = z.infer<typeof zodContractConfig>;

const zodCreate2ManyConfig = z.object({
	chains: z.array(z.string()),
	network: zodSupportedNetwork,
	contracts: z.array(zodContractConfig),
});

const zodDeployCreate2ManyCommandOptions = z.object({
	toml: z.string().describe(
		option({
			description: 'Path to a TOML file to use as a configuration',
			alias: 't',
		}),
	),
	privateKey: zodPrivateKey.optional().describe(
		option({
			description: 'Signer private key',
			alias: 'pk',
		}),
	),
});

const toUnresolvedConstructorArg = (arg: any): UnresolvedConstructorArg => {
	// handle {{TokenERC20.address}} or {{TokenERC20.someOtherProp}}
	// => { type: 'reference', id: 'TokenERC20', target: 'address' | 'someOtherProp' }
	if (typeof arg === 'string') {
		const match = arg.match(/^{{([^.]+)\.([^}]+)}}$/);
		if (match) {
			if (match.length !== 3) {
				throw new Error('Invalid reference format');
			}

			const target = zodTarget.safeParse(match[2]);
			if (target.success === false) {
				throw new Error('Invalid target');
			}

			return {
				type: 'reference',
				id: match[1]!,
				target: target.data,
			};
		}
	}

	return {type: 'value', value: arg};
};

const toUnresolvedContractDeploymentParams = (
	config: ContractConfig,
	forgeArtifact: ForgeArtifact,
): UnresolvedContractDeploymentParams => {
	return {
		id: config.id || config.forgeArtifactPath, // default to the forge artifact path if no id is provided
		salt: config.salt,
		constructorArgs: config.constructorArgs?.map(toUnresolvedConstructorArg),
		forgeArtifact,
	};
};

const DeployCreate2ManyCommand = ({
	options,
}: {
	options: z.infer<typeof zodDeployCreate2ManyCommandOptions>;
}) => {
	const {
		data: config,
		isLoading: isConfigLoading,
		error,
	} = useQuery({
		queryKey: ['read-toml', options.toml],
		queryFn: async () => {
			const raw = await fs.readFile(options.toml, {encoding: 'utf-8'});

			const parsedToml = parseTOML(raw);

			const parsed = zodCreate2ManyConfig.safeParse(parsedToml);

			if (parsed.success === false) {
				throw new Error('Invalid config file');
			}

			return parsed.data;
		},
	});

	if (isConfigLoading) {
		return <Spinner />;
	}

	if (error) {
		return <StatusMessage variant="error">{error.message}</StatusMessage>;
	}

	if (!config) {
		return <StatusMessage variant="error">No config found</StatusMessage>;
	}

	return <DeployCreate2ManyWithConfig config={config} options={options} />;
};

// TODO: Make this wayyy simpler or split out into multiple components
const DeployCreate2ManyWithConfig = ({
	config,
	options,
}: {
	config: z.infer<typeof zodCreate2ManyConfig>;
	options: z.infer<typeof zodDeployCreate2ManyCommandOptions>;
}) => {
	const forgeArtifactQueryResults = useQueries({
		queries: config.contracts.map(contract =>
			getForgeArtifactQueryParams(contract.forgeArtifactPath),
		),
	});

	const {data: chainByIdentifier, isLoading: isChainByIdentifierLoading} =
		useMappingChainByIdentifier();

	if (isChainByIdentifierLoading || !chainByIdentifier) {
		return <Spinner />;
	}

	if (forgeArtifactQueryResults.some(result => result.isLoading)) {
		return <Spinner />;
	}

	if (forgeArtifactQueryResults.some(result => result.error)) {
		return (
			<StatusMessage variant="error">
				{forgeArtifactQueryResults.find(result => result.error)?.error?.message}
			</StatusMessage>
		);
	}

	if (
		forgeArtifactQueryResults.some((result, index) => result.data === undefined)
	) {
		return (
			<StatusMessage variant="error">
				Error loading forge artifacts
			</StatusMessage>
		);
	}

	const unresolvedContractDeploymentParams = forgeArtifactQueryResults.map(
		(result, index) =>
			toUnresolvedContractDeploymentParams(
				config.contracts[index]!,
				result.data!,
			),
	);

	const resolvedContractDeploymentParams = resolveContractDeploymentParams(
		unresolvedContractDeploymentParams,
	);

	const flattenedChains = config.chains.flatMap(chain => chain.split(','));
	const chains = flattenedChains.map(x => {
		const chain = chainByIdentifier[`${config.network}/${x}`]!;
		if (!chain) {
			throw new Error(`Chain ${`${config.network}/${x}`} not found`);
		}
		return chain;
	});

	return (
		<DeployCreate2ManyCommandInner
			chains={chains}
			options={options}
			resolvedContractDeploymentParams={resolvedContractDeploymentParams}
			config={config}
		/>
	);
};

const DeployCreate2ManyCommandInner = ({
	chains,
	resolvedContractDeploymentParams,
	options,
	config,
}: {
	chains: Chain[];
	resolvedContractDeploymentParams: ResolvedContractDeploymentParams[];
	options: z.infer<typeof zodDeployCreate2ManyCommandOptions>;
	config: z.infer<typeof zodCreate2ManyConfig>;
}) => {
	const [executionOption, setExecutionOption] =
		useState<ExecutionOption | null>(
			options.privateKey
				? {type: 'privateKey', privateKey: options.privateKey}
				: null,
		);

	// const {initCode, deterministicAddress, baseSalt} = getDeployCreate2Params({
	// 	forgeArtifact,
	// 	constructorArgs: options.constructorArgs,
	// 	salt: options.salt,
	// });

	// TODO: memoize

	const deployParams = useMemo(
		() =>
			resolvedContractDeploymentParams.map(params => {
				const {initCode, deterministicAddress, baseSalt} =
					getDeployCreate2Params({
						forgeArtifact: params.forgeArtifact,
						constructorArgs: params.constructorArgs?.join(','),
						salt: params.salt,
					});

				return {
					deterministicAddress,
					initCode,
					baseSalt,
					chainIds: chains.map(chain => chain.id),
				};
			}),
		[resolvedContractDeploymentParams],
	);

	const {chainIdArraysPerContract} =
		useChecksForChainsForContracts(deployParams);

	const wagmiConfig = useConfig();

	const chainsToDeployToPerContract = chainIdArraysPerContract?.map(
		chainIds => {
			const chainIdsToDeployToSet = new Set(chainIds);

			const chainsToDeployTo = wagmiConfig.chains.filter(chain =>
				chainIdsToDeployToSet.has(chain.id),
			);

			return chainsToDeployTo;
		},
	);

	const {mutate, data} = useMutation({
		mutationFn: () => {
			if (!chainsToDeployToPerContract) {
				throw new Error('No chains to deploy to');
			}

			return Promise.all(
				config.contracts.map(async (contract, i) => {
					const {forgeArtifactPath, constructorArgs, salt} = contract;

					return await deployCreate2({
						wagmiConfig,
						deterministicAddress: deployParams[i]!.deterministicAddress,
						initCode: deployParams[i]!.initCode,
						baseSalt: deployParams[i]!.baseSalt,
						chains: chainsToDeployToPerContract[i]!,
						foundryArtifactPath: forgeArtifactPath,
						contractArguments: constructorArgs || [],
						account: options.privateKey
							? privateKeyToAccount(options.privateKey)
							: undefined,
					});
				}),
			);
		},
	});

	useEffect(() => {
		if (chainsToDeployToPerContract?.flatMap(x => x).length === 0) return;
		mutate();
	}, [chainsToDeployToPerContract?.flatMap(x => x).join('-')]);

	return (
		<Box flexDirection="column" gap={1}>
			{config.contracts.map((contract, i) => (
				<Box flexDirection="column" gap={1} key={contract.forgeArtifactPath}>
					<Box flexDirection="column" gap={1}>
						<Text bold>
							Contract: <Text color="cyan">{contract.forgeArtifactPath}</Text>
						</Text>

						<Box flexDirection="column" paddingLeft={2}>
							<Text></Text>
							<Text>
								Network: <Text color="blue">{config.network}</Text>
							</Text>
							<Text>
								Target Chains:{' '}
								<Text color="green">
									{chains.map(chain => chain.name).join(', ')}
								</Text>
							</Text>
							<Text>
								Salt: <Text color="magenta">{contract.salt}</Text>
							</Text>

							{contract.constructorArgs && (
								<Box flexDirection="column">
									<Text>Constructor Arguments:</Text>
									<Text color="cyan">
										{resolvedContractDeploymentParams[i]!.constructorArgs?.join(
											', ',
										)}
									</Text>
								</Box>
							)}
							<Box marginTop={1}>
								<Text>
									Address:{' '}
									<Text color="yellow" bold>
										{deployParams[i]!.deterministicAddress}
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
										initCode={deployParams[i]!.initCode}
										baseSalt={deployParams[i]!.baseSalt}
										deterministicAddress={deployParams[i]!.deterministicAddress}
										executionOption={executionOption}
									/>
								))}
							</Box>
						</Box>
					</Box>
				</Box>
			))}
			{chainsToDeployToPerContract &&
				chainsToDeployToPerContract.flatMap(x => x).length > 0 &&
				!executionOption && (
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
			{/* {data && (
				<CompletedOrVerify
					shouldVerify={!!options.verify}
					chains={chains}
					forgeArtifactPath={options.forgeArtifactPath}
					contractAddress={deterministicAddress}
					forgeArtifact={forgeArtifact}
				/>
			)} */}
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

export default DeployCreate2ManyCommand;
export const options = zodDeployCreate2ManyCommandOptions;
