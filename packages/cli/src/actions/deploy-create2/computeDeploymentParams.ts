import {computeCreate2Address} from '@/util/createx/computeCreate2Address';
import {createBaseSalt, createGuardedSalt} from '@/util/createx/salt';
import {getEncodedConstructorArgs} from '@/util/abi';
import {concatHex, keccak256, toHex} from 'viem';
import {
	ComputedDeploymentParams,
	DeploymentIntent,
} from '@/actions/deploy-create2/types';

// Prepares params for deployCreate2
export const computeDeploymentParams = ({
	forgeArtifact,
	constructorArgs,
	salt,
}: Pick<
	DeploymentIntent,
	'forgeArtifact' | 'constructorArgs' | 'salt'
>): ComputedDeploymentParams => {
	const baseSalt = createBaseSalt({
		shouldAddRedeployProtection: false,
		additionalEntropy: toHex(salt, {size: 32}),
	});

	const guardedSalt = createGuardedSalt({
		baseSalt: toHex(salt, {size: 32}),
	});

	const encodedConstructorArgs = getEncodedConstructorArgs(
		forgeArtifact.abi,
		constructorArgs,
	);

	const initCode = encodedConstructorArgs
		? concatHex([forgeArtifact.bytecode.object, encodedConstructorArgs])
		: forgeArtifact.bytecode.object;

	const deterministicAddress = computeCreate2Address({
		guardedSalt,
		initCodeHash: keccak256(initCode),
	});

	return {
		initCode,
		baseSalt,
		deterministicAddress,
	};
};
