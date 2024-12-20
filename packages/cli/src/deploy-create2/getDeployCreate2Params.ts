import {computeCreate2Address} from '@/contracts/createx/computeCreate2Address';
import {createBaseSalt, createGuardedSalt} from '@/contracts/createx/salt';
import {ForgeArtifact} from '@/forge/readForgeArtifact';
import {getEncodedConstructorArgs} from '@/utils/abi';
import {concatHex, keccak256, toHex} from 'viem';

// Prepares params for deployCreate2
export const getDeployCreate2Params = ({
	forgeArtifact,
	constructorArgs,
	salt,
}: {
	forgeArtifact: ForgeArtifact;
	constructorArgs?: string;
	salt: string;
}) => {
	const baseSalt = createBaseSalt({
		shouldAddRedeployProtection: false,
		additionalEntropy: toHex(salt, {size: 32}),
	});

	const guardedSalt = createGuardedSalt({
		baseSalt: toHex(salt, {size: 32}),
	});

	const encodedConstructorArgs = getEncodedConstructorArgs(
		forgeArtifact.abi,
		constructorArgs?.split(','),
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
