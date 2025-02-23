import {formatEther, formatUnits} from 'viem';
import {Text} from 'ink';

export const GasEstimation = ({
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
