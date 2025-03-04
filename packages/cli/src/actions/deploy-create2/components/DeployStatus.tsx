import {preVerificationCheckQueryOptions} from '@/actions/deploy-create2/queries/preVerificationCheckQuery';
import {simulationCheckQueryOptions} from '@/actions/deploy-create2/queries/simulationCheckQuery';
import {ExecutionOption} from '@/components/ChooseExecutionOption';
import {useGasEstimation} from '@/hooks/useGasEstimation';
import {CREATEX_ADDRESS, createXABI} from '@/util/createx/constants';
import {useQuery} from '@tanstack/react-query';
import {Badge, Spinner} from '@inkjs/ui';
import {Text, Box} from 'ink';
import {Address, Chain, encodeFunctionData, Hex, zeroAddress} from 'viem';
import {useConfig} from 'wagmi';
import {getBlockExplorerAddressLink} from '@/util/blockExplorer';
import {PrivateKeyExecution} from '@/actions/deploy-create2/components/PrivateKeyExecution';
import {ExternalSignerExecution} from '@/actions/deploy-create2/components/ExternalSignerExecution';
import {GasEstimation} from '@/actions/deploy-create2/components/GasEstimation';
import {supersimL1} from '@eth-optimism/viem/chains';
import {privateKeyToAccount} from 'viem/accounts';

export const DeployStatus = ({
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
			account:
				// TODO: fix - hacky way to get the account for the chain
				chain.sourceId === supersimL1.id
					? privateKeyToAccount(
							'0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
					  )
					: executionOption?.type === 'privateKey'
					? privateKeyToAccount(executionOption.privateKey)
					: zeroAddress,
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
