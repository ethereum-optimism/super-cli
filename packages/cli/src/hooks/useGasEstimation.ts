import {useQuery} from '@tanstack/react-query';
import {Account, Address, Hex} from 'viem';
import {estimateL1Fee} from 'viem/op-stack';
import {useEstimateGas, usePublicClient, useGasPrice} from 'wagmi';

export const useGasEstimation = ({
	to,
	data,
	account,
	chainId,
}: {
	to: Address;
	data: Hex;
	account: Account | Address;
	chainId: number;
}) => {
	const publicClient = usePublicClient({
		chainId,
	});

	const {
		data: estimatedL1Fee,
		isLoading: isL1FeeEstimationLoading,
		error: l1FeeEstimationError,
	} = useQuery({
		queryKey: ['estimateL1Fee', chainId, to, account, data],
		queryFn: () => {
			// @ts-expect-error
			return estimateL1Fee(publicClient, {
				chainId,
				to,
				account,
				data,
			});
		},
	});

	const {
		data: estimatedL2Gas,
		isLoading: isL2GasEstimationLoading,
		error: l2GasEstimationError,
	} = useEstimateGas({
		chainId,
		to,
		account,
		data,
	});

	const {
		data: l2GasPrice,
		isLoading: isL2GasPriceLoading,
		error: l2GasPriceError,
	} = useGasPrice({
		chainId,
	});

	const isLoading =
		isL1FeeEstimationLoading || isL2GasEstimationLoading || isL2GasPriceLoading;

	const error =
		l1FeeEstimationError ||
		l2GasEstimationError ||
		l2GasPriceError ||
		undefined;

	const areValuesAvailable =
		estimatedL1Fee !== undefined &&
		estimatedL2Gas !== undefined &&
		l2GasPrice !== undefined;

	if (isLoading || !areValuesAvailable) {
		return {
			data: undefined,
			error: null,
			isLoading: true,
		};
	}

	if (error) {
		return {
			data: undefined,
			error: new Error('Gas estimation failed'),
			isLoading: false,
		};
	}

	const totalFee = estimatedL1Fee + estimatedL2Gas * l2GasPrice;

	return {
		data: {
			totalFee: totalFee,
			estimatedL1Fee: estimatedL1Fee,
			estimatedL2Gas: estimatedL2Gas,
			l2GasPrice: l2GasPrice,
		},
		error: null,
		isLoading: false,
	};
};
