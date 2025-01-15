import {computeCreate2Address} from '@/lib/createx/computeCreate2Address';
import {createBaseSalt, createGuardedSalt} from '@/lib/createx/salt';
import {ForgeArtifact} from '@/lib/forge/readForgeArtifact';
import {getEncodedConstructorArgs} from '@/lib/abi';
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
