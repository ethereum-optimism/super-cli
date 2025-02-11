import {l1StandardBridgeAbi} from '@/constants/l1StandardBridgeAbi';
import {multicall3Abi} from '@/constants/multicall3Abi';
import {
	ChooseExecutionOption,
	ExecutionOption,
} from '@/components/ChooseExecutionOption';
import {useMappingChainByIdentifier} from '@/queries/chainByIdentifier';
import {useTransactionTaskStore} from '@/stores/transactionTaskStore';
import {zodSupportedNetwork} from '@/util/fetchSuperchainRegistryChainList';
import {createTransactionTaskId} from '@/util/transactionTask';
import {getBlockExplorerTxHashLink} from '@/util/blockExplorer';
import {zodAddress, zodPrivateKey, zodValueAmount} from '@/util/schemas';
import {viemChainById} from '@/util/viemChainById';
import {Badge, Spinner} from '@inkjs/ui';
import {Box, Text} from 'ink';
import {option} from 'pastel';
import {useEffect, useState} from 'react';
import {
	Address,
	Chain,
	encodeFunctionData,
	formatEther,
	formatGwei,
	Hex,
	toHex,
	zeroAddress,
} from 'viem';
import {privateKeyToAccount, privateKeyToAddress} from 'viem/accounts';
import {
	useEstimateGas,
	useGasPrice,
	useWaitForTransactionReceipt,
	useWriteContract,
} from 'wagmi';
import {z} from 'zod';
import {supersimL1} from '@eth-optimism/viem/chains';

const zodBridgeParams = z.object({
	network: zodSupportedNetwork.describe(
		option({
			description: 'Network to bridge to',
			alias: 'n',
		}),
	),
	chains: z
		.array(z.string())
		.describe(
			option({
				description: 'Chains to bridge to',
				alias: 'c',
			}),
		)
		.min(1),
	amount: zodValueAmount.describe(
		option({
			description: 'Amount to bridge per chain',
			alias: 'a',
		}),
	),
	privateKey: zodPrivateKey.optional().describe(
		option({
			description: 'Signer private key',
			alias: 'pk',
		}),
	),
	recipient: zodAddress.optional().describe(
		option({
			description: 'Recipient address to bridge to',
			alias: 'r',
		}),
	),
});

export const BridgeEntrypoint = ({
	options,
}: {
	options: z.infer<typeof zodBridgeParams>;
}) => {
	if (!options.privateKey && !options.recipient) {
		console.error(
			'Either --private-key OR --recipient is required. Please provide one.',
		);
		return (
			<Text color="red">
				Error: Either --private-key OR --recipient is required. Please provide
				one.
			</Text>
		);
	}

	const {data: chainByIdentifier, isLoading: isChainByIdentifierLoading} =
		useMappingChainByIdentifier();

	if (isChainByIdentifierLoading || !chainByIdentifier) {
		return <Spinner />;
	}

	const chains = options.chains.map(
		chain => chainByIdentifier[`${options.network}/${chain}`]!,
	);

	const sourceChain = viemChainById[chains[0]!.sourceId!]!;

	// Defaults to the private key address if no recipient is provided
	const recipientAddress =
		options.recipient ?? privateKeyToAddress(options.privateKey!);

	return (
		<BridgeInner
			sourceChain={sourceChain}
			chains={chains}
			recipientAddress={recipientAddress}
			privateKey={options.privateKey}
			amountPerChain={options.amount}
		/>
	);
};

const BridgeInner = ({
	sourceChain,
	chains,
	recipientAddress,
	privateKey,
	amountPerChain,
}: {
	sourceChain: Chain;
	chains: Chain[];
	recipientAddress: Address;
	privateKey: Hex | undefined;
	amountPerChain: bigint;
}) => {
	const [executionOption, setExecutionOption] =
		useState<ExecutionOption | null>(
			privateKey ? {type: 'privateKey', privateKey: privateKey} : null,
		);

	return (
		<Box flexDirection="column" gap={1}>
			<Box flexDirection="column" gap={1}>
				<Text bold underline>
					Bridge
				</Text>
				<Box flexDirection="column" paddingLeft={2}>
					<Text>
						Source Chain: <Text color="green">{sourceChain.name}</Text>
					</Text>
					<Text>
						Target Chains:{' '}
						<Text color="green">
							{chains.map(chain => chain.name).join(', ')}
						</Text>
					</Text>
					<Text>
						Recipient: <Text color="green">{recipientAddress}</Text>
					</Text>
					<Text>
						Value:{' '}
						<Text color="green">
							{formatEther(amountPerChain)} ETH × {chains.length} chains ={' '}
							{formatEther(amountPerChain * BigInt(chains.length))} ETH total
						</Text>
					</Text>
					<Box gap={1}>
						<Text>Gas:</Text>
						<GasEstimation
							sourceChain={sourceChain}
							chains={chains}
							recipientAddress={recipientAddress}
							amountPerChain={amountPerChain}
							accountToEstimateFrom={getAccountToEstimateFrom(
								sourceChain,
								privateKey,
							)}
						/>
					</Box>
				</Box>
				{!executionOption && (
					<Box marginTop={1}>
						<ChooseExecutionOption
							label={'🌉 Ready to bridge!'}
							onSubmit={setExecutionOption}
						/>
					</Box>
				)}

				{executionOption && (
					<SendStatus
						chains={chains}
						sourceChain={sourceChain}
						recipientAddress={recipientAddress}
						amountPerChain={amountPerChain}
						executionOption={executionOption}
					/>
				)}
			</Box>
		</Box>
	);
};

const getAccountToEstimateFrom = (chain: Chain, privateKey?: Hex) => {
	if (privateKey) {
		return privateKeyToAddress(privateKey);
	}
	if (chain.id === supersimL1.id || chain.sourceId === supersimL1.id) {
		return `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`;
	}

	return zeroAddress;
};

const SendStatus = ({
	chains,
	sourceChain,
	recipientAddress,
	amountPerChain,
	executionOption,
}: {
	chains: Chain[];
	sourceChain: Chain;
	recipientAddress: Address;
	amountPerChain: bigint;
	executionOption: ExecutionOption;
}) => {
	if (executionOption.type === 'privateKey') {
		return (
			<PrivateKeyExecution
				chains={chains}
				sourceChain={sourceChain}
				recipientAddress={recipientAddress}
				amountPerChain={amountPerChain}
				privateKey={executionOption.privateKey}
			/>
		);
	}

	if (executionOption.type === 'externalSigner') {
		return (
			<ExternalSignerExecution
				chains={chains}
				sourceChain={sourceChain}
				recipientAddress={recipientAddress}
				amountPerChain={amountPerChain}
			/>
		);
	}

	throw new Error('Invalid execution option');
};

const ExternalSignerExecution = ({
	chains,
	sourceChain,
	recipientAddress,
	amountPerChain,
}: {
	chains: Chain[];
	sourceChain: Chain;
	recipientAddress: Address;
	amountPerChain: bigint;
}) => {
	const encodedData = encodeFunctionData(
		getContractWriteParams({
			chains,
			recipientAddress,
			amountPerChain,
		}),
	);

	const {createTask, taskEntryById} = useTransactionTaskStore();

	const task = {
		chainId: sourceChain.id,
		to: '0xcA11bde05977b3631167028862bE2a173976CA11',
		data: encodedData,
		value: toHex(amountPerChain * BigInt(chains.length)),
	} as const;

	const taskId = createTransactionTaskId(task);

	useEffect(() => {
		createTask(task);
	}, []);

	const transactionHash =
		taskEntryById[taskId]?.result?.type === 'success'
			? taskEntryById[taskId]?.result?.hash
			: undefined;

	const {isLoading: isReceiptLoading} = useWaitForTransactionReceipt({
		hash: transactionHash,
		chainId: sourceChain.id,
	});

	if (!transactionHash) {
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

	if (isReceiptLoading && transactionHash) {
		return (
			<Box flexDirection="column">
				<Text>
					Transaction sent:{' '}
					{getBlockExplorerTxHashLink(sourceChain, transactionHash)}
				</Text>
				<Spinner label="Waiting for transaction confirmation" />
			</Box>
		);
	}

	return (
		<Box gap={1}>
			<Badge color="green">Bridged</Badge>
			<Text>
				{formatEther(amountPerChain * BigInt(chains.length))} ETH successfully
				bridged
			</Text>
			<Text>{getBlockExplorerTxHashLink(sourceChain, transactionHash)}</Text>
		</Box>
	);
};

const PrivateKeyExecution = ({
	chains,
	sourceChain,
	recipientAddress,
	amountPerChain,
	privateKey,
}: {
	chains: Chain[];
	sourceChain: Chain;
	recipientAddress: Address;
	amountPerChain: bigint;
	privateKey: Hex;
}) => {
	const {
		writeContract,
		isPending,
		error,
		data: transactionHash,
	} = useWriteContract();

	const {isLoading: isReceiptLoading} = useWaitForTransactionReceipt({
		hash: transactionHash,
		chainId: sourceChain.id,
	});

	useEffect(() => {
		writeContract({
			chainId: sourceChain.id,
			...getContractWriteParams({
				chains,
				recipientAddress,
				amountPerChain,
			}),
			account: privateKeyToAccount(privateKey),
		});
	}, []);

	if (error) {
		return <Text>Error bridging ETH: {error.message}</Text>;
	}

	if (isPending || !transactionHash) {
		return <Spinner label="Bridging ETH" />;
	}

	if (isReceiptLoading) {
		return (
			<Box flexDirection="column">
				<Text>
					Transaction sent:{' '}
					{getBlockExplorerTxHashLink(sourceChain, transactionHash)}
				</Text>
				<Spinner label="Waiting for transaction confirmation" />
			</Box>
		);
	}

	return (
		<Box gap={1}>
			<Badge color="green">Bridged</Badge>
			<Text>
				{formatEther(amountPerChain * BigInt(chains.length))} ETH successfully
				bridged
			</Text>
			<Text>{getBlockExplorerTxHashLink(sourceChain, transactionHash)}</Text>
		</Box>
	);
};

const GasEstimation = ({
	sourceChain,
	chains,
	recipientAddress,
	amountPerChain,
	accountToEstimateFrom,
}: {
	sourceChain: Chain;
	chains: Chain[];
	recipientAddress: Address;
	amountPerChain: bigint;
	accountToEstimateFrom: Address;
}) => {
	const contractWriteParams = getContractWriteParams({
		chains,
		recipientAddress,
		amountPerChain,
	});

	const encodedData = encodeFunctionData(
		getContractWriteParams({
			chains,
			recipientAddress,
			amountPerChain,
		}),
	);

	const {
		data: estimatedGas,
		isLoading: isEstimateGasLoading,
		error: estimateGasError,
	} = useEstimateGas({
		chainId: sourceChain.id,
		to: '0xcA11bde05977b3631167028862bE2a173976CA11',
		data: encodedData,
		value: contractWriteParams.value,
		account: accountToEstimateFrom,
	});

	const {
		data: gasPrice,
		isLoading: isGasPriceLoading,
		error: gasPriceError,
	} = useGasPrice({
		chainId: sourceChain.id,
	});

	if (isEstimateGasLoading || isGasPriceLoading) {
		return <Spinner label="Estimating..." />;
	}

	if (estimateGasError || gasPriceError) {
		console.error(estimateGasError, gasPriceError);
		return <Text color="red">Error estimating gas</Text>;
	}

	if (estimatedGas === undefined || gasPrice === undefined) {
		// Invariant: we should always have gas data
		throw new Error('No gas data');
	}

	const fees = estimatedGas * gasPrice;

	return (
		<Text>
			<Text color="yellow">{estimatedGas.toLocaleString()}</Text> ×{' '}
			<Text color="cyan">{Number(formatGwei(gasPrice)).toFixed(2)} gwei</Text> ={' '}
			<Text color="green">{Number(formatEther(fees)).toFixed(5)} ETH</Text>
		</Text>
	);
};

const getContractWriteParams = ({
	chains,
	recipientAddress,
	amountPerChain,
}: {
	chains: Chain[];
	recipientAddress: Address;
	amountPerChain: bigint;
}) => {
	return {
		abi: multicall3Abi,
		functionName: 'aggregate3Value',
		address: '0xcA11bde05977b3631167028862bE2a173976CA11',
		args: [
			chains.map(chain => {
					const l1StandardBridgeAddress: Address =
						// @ts-expect-error
						chain.contracts?.l1StandardBridge?.[chain.sourceId!]?.address;

					if (!l1StandardBridgeAddress) {
						// Invariant: we should always have a l1StandardBridge defined (see chains.ts)
						throw new Error('l1StandardBridge not found');
					}

					return {
						target: l1StandardBridgeAddress,
						allowFailure: false,
						callData: encodeFunctionData({
							abi: l1StandardBridgeAbi,
							functionName: 'bridgeETHTo',
							args: [recipientAddress, 1000000, toHex('')],
						}),
						value: amountPerChain,
					};
				}),
		],
		value: amountPerChain * BigInt(chains.length),
	} as const;
};

export default BridgeEntrypoint;
export const options = zodBridgeParams;
