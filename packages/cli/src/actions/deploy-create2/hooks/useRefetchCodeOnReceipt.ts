import {useQueryClient} from '@tanstack/react-query';
import {getBytecodeQueryKey} from '@wagmi/core/query';
import {useEffect} from 'react';
import {Address, TransactionReceipt} from 'viem';

export const useRefetchCodeOnReceipt = (
	address: Address,
	chainId: number,
	receipt?: TransactionReceipt,
) => {
	const queryClient = useQueryClient();

	useEffect(() => {
		if (receipt) {
			queryClient.invalidateQueries({
				queryKey: getBytecodeQueryKey({address, chainId}),
			});
		}
	}, [receipt]);
};
