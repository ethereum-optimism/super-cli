import {executeTransactionOperation} from '@/actions/deploy-create2/deployCreate2';
import {useOperation} from '@/stores/operationStore';
import {Spinner, Badge} from '@inkjs/ui';
import {Address, Chain, Hex} from 'viem';
import {useWaitForTransactionReceipt} from 'wagmi';
import {getBlockExplorerAddressLink} from '@/util/blockExplorer';
import {Text, Box} from 'ink';

export const PrivateKeyExecution = ({
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
