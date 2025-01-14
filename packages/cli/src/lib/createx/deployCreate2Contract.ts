import {Address, Hash, Hex, WalletClient} from 'viem';
import {estimateContractGas, simulateContract} from 'viem/actions';
import {CREATEX_ADDRESS, createXABI} from './constants.js';

export type DeployCreate2ContractParameters = {
	client: WalletClient;
	salt: Hex;
	initCode: Hex;
	createXAddress?: Address;
};

export const deployCreate2Contract = async ({
	client,
	salt,
	initCode,
	createXAddress,
}: DeployCreate2ContractParameters): Promise<Hash> => {
	const hash = await client.writeContract({
		abi: createXABI,
		chain: client.chain,
		account: client.account!,
		address: createXAddress ?? CREATEX_ADDRESS,
		functionName: 'deployCreate2',
		args: [salt, initCode],
	});

	return hash;
};

export const simulateDeployCreate2Contract = async ({
	client,
	salt,
	initCode,
	createXAddress,
}: DeployCreate2ContractParameters): Promise<Address> => {
	const result = await simulateContract(client, {
		abi: createXABI,
		account: client.account?.address as Address,
		address: createXAddress ?? CREATEX_ADDRESS,
		functionName: 'deployCreate2',
		args: [salt, initCode],
	});

	return result.result as Address;
};

export const estimateDeployCreate2Contract = async ({
	client,
	salt,
	initCode,
	createXAddress,
}: DeployCreate2ContractParameters): Promise<bigint> => {
	return await estimateContractGas(client, {
		abi: createXABI,
		address: createXAddress ?? CREATEX_ADDRESS,
		functionName: 'deployCreate2',
		args: [salt, initCode],
	});
};
