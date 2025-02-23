import {Spinner, StatusMessage} from '@inkjs/ui';
import {z} from 'zod';
import {option} from 'pastel';
import fs from 'fs/promises';
import {parse as parseTOML} from 'smol-toml';

import {zodSupportedNetwork} from '@/util/fetchSuperchainRegistryChainList';
import {useQueries} from '@tanstack/react-query';
import {getForgeArtifactQueryParams} from '@/queries/forgeArtifact';
import {
	resolveContractDeploymentParams,
	UnresolvedConstructorArg,
	UnresolvedContractDeploymentParams,
	zodTarget,
} from '@/util/resolveContractDeploymentParams';

import {Box, Text} from 'ink';
import {useEffect, useState} from 'react';

import {Address} from 'viem';
import {useConfig} from 'wagmi';
import {ForgeArtifact} from '@/util/forge/readForgeArtifact';
import {useMappingChainByIdentifier} from '@/queries/chainByIdentifier';
import {privateKeyToAccount} from 'viem/accounts';
import {computeDeploymentParams} from '@/actions/deploy-create2/computeDeploymentParams';
import {useMutation, useQuery} from '@tanstack/react-query';

import {
	ChooseExecutionOption,
	ExecutionOption,
} from '@/components/ChooseExecutionOption';

import {VerifyCommandInner} from '@/commands/verify';

import {deployCreate2} from '@/actions/deploy-create2/deployCreate2';
import {sendAllTransactionTasks} from '@/actions/deploy-create2/sendAllTransactionTasks';
import {getSponsoredSenderWalletRpcUrl} from '@/util/sponsoredSender';
import {zodPrivateKey} from '@/util/schemas';
import {useChecksForChainsForContracts} from '@/actions/deploy-create2/hooks/useChecksForChainsForContracts';
import {DeployStatus} from '@/actions/deploy-create2/components/DeployStatus';
import {DeploymentParams} from '@/actions/deploy-create2/types';
import {
	createTxSenderFromCustomWalletRpc,
	createTxSenderFromPrivateKeyAccount,
	TxSender,
} from '@/util/TxSender';

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
	verify: z
		.boolean()
		.optional()
		.describe(
			option({
				description: 'Verify contracts after deployment',
				alias: 'v',
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
		return <Spinner label="Loading chain configurations..." />;
	}

	if (forgeArtifactQueryResults.some(result => result.isLoading)) {
		return <Spinner label="Loading forge artifacts..." />;
	}

	if (forgeArtifactQueryResults.some(result => result.error)) {
		return (
			<StatusMessage variant="error">
				{forgeArtifactQueryResults.find(result => result.error)?.error?.message}
			</StatusMessage>
		);
	}

	if (forgeArtifactQueryResults.some(result => result.data === undefined)) {
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

	const deploymentParams = config.contracts.map((contract, index) => {
		const {forgeArtifact, constructorArgs, salt} =
			resolvedContractDeploymentParams[index]!;

		const intent = {
			chains,
			forgeArtifactPath: contract.forgeArtifactPath,
			forgeArtifact,
			constructorArgs,
			salt,
		};

		return {
			intent,
			computedParams: computeDeploymentParams(intent),
		};
	});

	return (
		<DeployCreate2ManyCommandInner
			deploymentParams={deploymentParams}
			options={options}
		/>
	);
};

const DeployCreate2ManyCommandInner = ({
	deploymentParams,
	options,
}: {
	deploymentParams: DeploymentParams[];
	options: z.infer<typeof zodDeployCreate2ManyCommandOptions>;
}) => {
	const [executionOption, setExecutionOption] =
		useState<ExecutionOption | null>(
			options.privateKey
				? {type: 'privateKey', privateKey: options.privateKey}
				: null,
		);

	const {chainIdSetByAddress, hasDeployableChains} =
		useChecksForChainsForContracts(deploymentParams);
	const wagmiConfig = useConfig();

	const {mutate, data} = useMutation({
		mutationFn: () => {
			if (!chainIdSetByAddress) {
				throw new Error('No chains to deploy to');
			}

			const txSender = options.privateKey
				? createTxSenderFromPrivateKeyAccount(
						wagmiConfig,
						privateKeyToAccount(options.privateKey),
				  )
				: undefined;

			return Promise.all(
				deploymentParams.map(async ({intent, computedParams}) => {
					const {forgeArtifactPath, constructorArgs, chains} = intent;
					const {deterministicAddress, initCode, baseSalt} = computedParams;
					const chainIdsToDeployTo = chainIdSetByAddress[deterministicAddress]!;

					if (chainIdsToDeployTo.size === 0) {
						return;
					}

					return await deployCreate2({
						wagmiConfig,
						deterministicAddress,
						initCode,
						baseSalt,
						chains: chains.filter(chain => chainIdsToDeployTo.has(chain.id)),
						foundryArtifactPath: forgeArtifactPath,
						contractArguments: constructorArgs || [],
						txSender,
					});
				}),
			);
		},
	});

	useEffect(() => {
		if (!chainIdSetByAddress) return;
		mutate();
	}, [
		Object.keys(chainIdSetByAddress || {})
			.map(key => {
				return Array.from(
					(chainIdSetByAddress?.[key as Address] || []).values(),
				).join(',');
			})
			.join(','),
	]);

	return (
		<Box flexDirection="column" gap={1}>
			{deploymentParams.map(({intent, computedParams}, i) => (
				<Box flexDirection="column" gap={1} key={intent.forgeArtifactPath}>
					<Box flexDirection="column" gap={1}>
						<Text bold>
							Deploy {i + 1}:{' '}
							<Text color="cyan">{intent.forgeArtifactPath}</Text>
						</Text>

						<Box flexDirection="column" paddingLeft={2}>
							<Text></Text>
							<Text>
								Salt: <Text color="magenta">{intent.salt}</Text>
							</Text>

							{intent.constructorArgs && (
								<Box flexDirection="column">
									<Text>Constructor Arguments:</Text>
									<Text color="cyan">{intent.constructorArgs?.join(', ')}</Text>
								</Box>
							)}
							<Box>
								<Text>
									Address:{' '}
									<Text color="yellow" bold>
										{computedParams.deterministicAddress}
									</Text>
								</Text>
							</Box>
						</Box>
					</Box>
					<Box flexDirection="column" paddingX={2}>
						<Box flexDirection="row">
							<Box flexDirection="column" marginRight={2}>
								{intent.chains.map(chain => (
									<Text key={chain.id} bold color="blue">
										{chain.name}:
									</Text>
								))}
							</Box>
							<Box flexDirection="column">
								{intent.chains.map(chain => (
									<DeployStatus
										key={chain.id}
										chain={chain}
										initCode={computedParams.initCode}
										baseSalt={computedParams.baseSalt}
										deterministicAddress={computedParams.deterministicAddress}
										executionOption={executionOption}
									/>
								))}
							</Box>
						</Box>
					</Box>
				</Box>
			))}
			{hasDeployableChains && !executionOption && (
				<Box>
					<ChooseExecutionOption
						label={'🚀 Ready to deploy!'}
						onSubmit={async executionOption => {
							setExecutionOption(executionOption);

							if (executionOption.type === 'externalSigner') {
								return;
							}

							let txSender: TxSender;
							if (executionOption.type === 'privateKey') {
								txSender = createTxSenderFromPrivateKeyAccount(
									wagmiConfig,
									privateKeyToAccount(executionOption.privateKey),
								);
							} else if (executionOption.type === 'sponsoredSender') {
								txSender = createTxSenderFromCustomWalletRpc(chainId =>
									getSponsoredSenderWalletRpcUrl(
										executionOption.apiKey,
										chainId,
									),
								);
							} else {
								throw new Error('Invariant broken');
							}

							await sendAllTransactionTasks(txSender);
						}}
					/>
				</Box>
			)}
			{data && (
				<CompletedOrVerify
					shouldVerify={!!options.verify}
					deploymentParams={deploymentParams}
				/>
			)}
		</Box>
	);
};

const CompletedOrVerify = ({
	shouldVerify,
	deploymentParams,
}: {
	shouldVerify: boolean;
	deploymentParams: DeploymentParams[];
}) => {
	if (!shouldVerify) {
		// TODO: hacky way to quit until we remove pastel
		setTimeout(() => {
			process.exit(0);
		}, 1);
		return (
			<Box>
				<Text>Contracts are successfully deployed to all chains</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" gap={1}>
			{deploymentParams.map((deploymentParam, index) => (
				<VerifyCommandInner
					key={deploymentParam.computedParams.deterministicAddress}
					chains={deploymentParam.intent.chains}
					forgeArtifactPath={deploymentParam.intent.forgeArtifactPath}
					contractAddress={deploymentParam.computedParams.deterministicAddress}
					forgeArtifact={deploymentParam.intent.forgeArtifact}
					index={index}
				/>
			))}
		</Box>
	);
};

export default DeployCreate2ManyCommand;
export const options = zodDeployCreate2ManyCommandOptions;
