import {Box, Text} from 'ink';
import {useEffect} from 'react';
import {zodVerifyContractParams} from '@/actions/verifyContract';
import {z} from 'zod';
import {Badge, Spinner, StatusMessage} from '@inkjs/ui';
import {useStandardJsonInputQuery} from '@/actions/verify/getStandardJsonInputQuery';
import {Address, Chain} from 'viem';

import {useMappingChainByIdentifier} from '@/queries/chainByIdentifier';
import {useMutation, useQuery} from '@tanstack/react-query';
import {
	verifyOnBlockscoutMutation,
	verifyOnBlockscoutMutationKey,
} from '@/actions/verify/verifyOnBlockscoutMutation';
import {getBlockExplorerAddressLink} from '@/util/blockExplorer';
import {useForgeArtifact} from '@/queries/forgeArtifact';
import {ForgeArtifact} from '@/util/forge/readForgeArtifact';
import {
	getSmartContractOnBlockscoutQuery,
	getSmartContractOnBlockscoutQueryKey,
} from '@/actions/verify/getContractOnBlockscoutQuery';

const zodVerifyContractCommandParams = zodVerifyContractParams;

const VerifyCommand = ({
	options,
}: {
	options: z.infer<typeof zodVerifyContractCommandParams>;
}) => {
	const {data: chainByIdentifier, isLoading: isChainByIdentifierLoading} =
		useMappingChainByIdentifier();

	const {data: forgeArtifact, isLoading: isForgeArtifactLoading} =
		useForgeArtifact(options.forgeArtifactPath);

	if (isChainByIdentifierLoading || isForgeArtifactLoading) {
		return <Spinner />;
	}

	if (!chainByIdentifier) {
		return <Text>Error loading chains</Text>;
	}

	if (!forgeArtifact) {
		return <Text>Error loading forge artifact</Text>;
	}

	const chains = options.chains.map(
		chain => chainByIdentifier[`${options.network}/${chain}`]!,
	);

	return (
		<VerifyCommandInner
			chains={chains}
			forgeArtifactPath={options.forgeArtifactPath}
			forgeArtifact={forgeArtifact}
			contractAddress={options.contractAddress}
		/>
	);
};

export const VerifyCommandInner = ({
	chains,
	forgeArtifactPath,
	contractAddress,
	forgeArtifact,
	index,
}: {
	chains: Chain[];
	forgeArtifactPath: string;
	contractAddress: Address;
	forgeArtifact: ForgeArtifact;
	index?: number;
}) => {
	const {data: standardJsonInput, isLoading: isStandardJsonInputLoading} =
		useStandardJsonInputQuery(forgeArtifactPath);

	if (isStandardJsonInputLoading) {
		return <Spinner />;
	}

	if (!standardJsonInput) {
		return <Text>Error generating standard JSON input</Text>;
	}

	// TODO: support file with multiple contracts in single sol file & when there's multiple .sol files in a single artifact
	const contractName = Object.values(
		forgeArtifact.metadata.settings.compilationTarget,
	)[0];

	if (!contractName) {
		return <Text>Error getting contract name</Text>;
	}

	return (
		<Box flexDirection="column">
			<Box marginBottom={1}>
				<Text bold>
					Verify{index !== undefined ? ` ${index + 1}` : ''}:{' '}
					<Text color="cyan">{forgeArtifactPath}</Text>
				</Text>
			</Box>
			<Box flexDirection="row" paddingLeft={2}>
				<Box flexDirection="column" marginRight={2}>
					{chains.map(chain => (
						<Text key={chain.id} bold color="blue">
							{chain.name}:
						</Text>
					))}
				</Box>
				<Box flexDirection="column">
					{chains.map(chain => (
						<CheckThenVerifyForChain
							key={chain.id}
							chain={chain}
							address={contractAddress}
							standardJsonInput={standardJsonInput}
							contractName={contractName}
						/>
					))}
				</Box>
			</Box>
		</Box>
	);
};

const CheckThenVerifyForChain = ({
	chain,
	address,
	standardJsonInput,
	contractName,
}: {
	chain: Chain;
	address: Address;
	standardJsonInput: any;
	contractName: string;
}) => {
	const {data: contractOnBlockscout, isLoading: isContractOnBlockscoutLoading} =
		useQuery({
			queryKey: getSmartContractOnBlockscoutQueryKey(address, chain),
			queryFn: () => getSmartContractOnBlockscoutQuery(address, chain),
			retry: failureCount => failureCount < 5,
		});

	if (isContractOnBlockscoutLoading) {
		return (
			<Spinner label="Checking that contract has been indexed by Blockscout..." />
		);
	}

	if (!contractOnBlockscout) {
		return (
			<StatusMessage variant="error">
				Contract not found on Blockscout
			</StatusMessage>
		);
	}

	if (contractOnBlockscout.isVerified) {
		return <SuccessfullyVerified chain={chain} address={address} />;
	}

	return (
		<VerifyForChain
			chain={chain}
			address={address}
			standardJsonInput={standardJsonInput}
			contractName={contractName}
		/>
	);
};

const VerifyForChain = ({
	chain,
	address,
	standardJsonInput,
	contractName,
}: {
	chain: Chain;
	address: Address;
	standardJsonInput: any;
	contractName: string;
}) => {
	const {isPending, error, mutate} = useMutation({
		mutationKey: verifyOnBlockscoutMutationKey(
			address,
			chain,
			standardJsonInput,
		),
		mutationFn: async () => {
			return await verifyOnBlockscoutMutation(
				address,
				chain,
				standardJsonInput,
				contractName,
			);
		},
		retry: failureCount => failureCount < 3,
		retryDelay: failureCount => failureCount * 1000,
	});

	useEffect(() => {
		mutate();
	}, []);

	if (isPending) {
		return <Spinner label="Verifying contract..." />;
	}

	if (error) {
		return (
			<Box gap={1}>
				<Badge color="red">Failed</Badge>
				<Text>Error: {error.message}</Text>
			</Box>
		);
	}

	return <SuccessfullyVerified chain={chain} address={address} />;
};

const SuccessfullyVerified = ({
	chain,
	address,
}: {
	chain: Chain;
	address: Address;
}) => {
	return (
		<Box gap={1}>
			<Badge color="green">Verified</Badge>
			<Text>Contract successfully verified</Text>
			<Text>{getBlockExplorerAddressLink(chain, address)}</Text>
		</Box>
	);
};

export default VerifyCommand;
export const options = zodVerifyContractCommandParams;
