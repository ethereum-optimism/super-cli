import {getDeployCreate2Params} from '@/actions/deploy-create2/getDeployCreate2Params';
import {zodForgeArtifact} from '@/util/forge/readForgeArtifact';
import {zodAddress} from '@/util/schemas';
import {DepGraph, DepGraphCycleError} from 'dependency-graph';
import z from 'zod';

// [supercli]
// [[supercli.contracts]]
// id = "TokenERC20"  # Optional identifier
// salt = "ethers phoenix"
// chains = ["op", "base"]
// network = "mainnet"
// verify = false
// constructor_args = [
//   "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
//   "TestSuperchainERC20",
//   "TSU",
//   18
// ]

// [[supercli.contracts]]
// id = "Exchange"
// salt = "other salt"
// chains = ["op", "base"]
// network = "mainnet"
// verify = false
// constructor_args = [
//   "{{TokenERC20.address}}",  # Reference to the first contract's address
//   "AnotherContract",
//   "AC"
// ]

export const zodDerivedParams = z.object({
	address: zodAddress,
});

export const zodTarget = zodDerivedParams.keyof();

export const zodConstructorArgReference = z.object({
	type: z.literal('reference'),
	id: z.string(),
	target: zodTarget,
});

export type DerivedParams = z.infer<typeof zodDerivedParams>;

const zodConstructorArg = z.any();

export const zodConstructorArgValue = z.object({
	type: z.literal('value'),
	value: zodConstructorArg,
});

export const zodUnresolvedConstructorArg = z.discriminatedUnion('type', [
	zodConstructorArgReference,
	zodConstructorArgValue,
]);

export type UnresolvedConstructorArg = z.infer<
	typeof zodUnresolvedConstructorArg
>;

export const zodUnresolvedContractDeploymentParams = z.object({
	id: z.string(),
	salt: z.string(),
	constructorArgs: z.array(zodUnresolvedConstructorArg).optional(),
	forgeArtifact: zodForgeArtifact,
});

export const zodResolvedContractDeploymentParams = z.object({
	id: z.string(),
	salt: z.string(),
	constructorArgs: z.array(zodConstructorArg).optional(),
	forgeArtifact: zodForgeArtifact,
});

export type UnresolvedContractDeploymentParams = z.infer<
	typeof zodUnresolvedContractDeploymentParams
>;

export type ResolvedContractDeploymentParams = z.infer<
	typeof zodResolvedContractDeploymentParams
>;

const getDerivedParams = (
	resolvedParams: ResolvedContractDeploymentParams,
): DerivedParams => {
	const {salt, constructorArgs, forgeArtifact} = resolvedParams;

	const {deterministicAddress} = getDeployCreate2Params({
		forgeArtifact,
		constructorArgs: constructorArgs?.join(','),
		salt,
	});

	return {
		address: deterministicAddress,
	};
};

const resolveForContract = (
	params: UnresolvedContractDeploymentParams,
	accumulatedParamsById: Record<string, DerivedParams>,
): ResolvedContractDeploymentParams => {
	const {id, salt, constructorArgs, forgeArtifact} = params;

	const resolvedConstructorArgs = constructorArgs?.map(arg => {
		if (arg.type === 'reference') {
			const value = accumulatedParamsById[arg.id]?.[arg.target];
			if (!value) {
				throw new Error(`Reference to ${arg.id} not found`);
			}

			return value;
		}

		return arg.value;
	});

	const resolvedParams = {
		id,
		salt,
		constructorArgs: resolvedConstructorArgs,
		forgeArtifact,
	};

	return resolvedParams;
};

export const resolveContractDeploymentParams = (
	params: UnresolvedContractDeploymentParams[],
): ResolvedContractDeploymentParams[] => {
	const graph = new DepGraph<UnresolvedContractDeploymentParams>();

	params.forEach(param => {
		graph.addNode(param.id, param);
	});

	params.forEach(({id, constructorArgs}) => {
		constructorArgs?.forEach(arg => {
			if (arg.type === 'reference') {
				graph.addDependency(id, arg.id);
			}
		});
	});

	let order: string[];
	try {
		order = graph.overallOrder();
	} catch (e) {
		if (e instanceof DepGraphCycleError) {
			// TODO: bubble this to user
			console.error(e.cyclePath);
			throw new Error('Failed to create deployment plan');
		}

		throw e;
	}

	const result = order.reduce<{
		derivedParamsById: Record<string, DerivedParams>;
		resolvedParamsById: Record<string, ResolvedContractDeploymentParams>;
	}>(
		(acc, id) => {
			const unresolvedParams = graph.getNodeData(id);
			const resolvedParams = resolveForContract(
				unresolvedParams,
				acc.derivedParamsById,
			);

			return {
				derivedParamsById: {
					...acc.derivedParamsById,
					[id]: getDerivedParams(resolvedParams),
				},
				resolvedParamsById: {
					...acc.resolvedParamsById,
					[id]: resolvedParams,
				},
			};
		},
		{derivedParamsById: {}, resolvedParamsById: {}},
	);

	return params.map(param => result.resolvedParamsById[param.id]!);
};
