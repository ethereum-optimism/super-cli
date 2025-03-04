import {executeTransactionOperation} from '@/actions/deploy-create2/deployCreate2';
import {useOperation} from '@/stores/operationStore';
import {Address, Chain, Hex} from 'viem';
import {useWaitForTransactionReceipt} from 'wagmi';
import {Spinner, Badge} from '@inkjs/ui';
import {Text, Box} from 'ink';
import {getBlockExplorerAddressLink} from '@/util/blockExplorer';

export const ExternalSignerExecution = ({
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
