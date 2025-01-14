import {AbiConstructor} from 'abitype';
import {
	Abi,
	AbiFunction,
	AbiParameter,
	encodeAbiParameters,
	Hex,
	stringToBytes,
} from 'viem';

export function preparedParamForEncoding(input: AbiParameter, value: string) {
	const {type} = input;

	if (type.startsWith('uint') || type.startsWith('int')) {
		return BigInt(value);
	}

	if (type === 'boolean') {
		return value === 'true';
	}

	if (type.startsWith('bytes')) {
		return stringToBytes(value);
	}

	return value;
}

export function getConstructorAbi(abi: Abi): AbiConstructor | undefined {
	return abi.find(abi => abi.type === 'constructor');
}

export function getEncodedConstructorArgs(
	abi: Abi,
	args: string[] | undefined,
) {
	let encodedConstructorArgs: Hex | undefined;

	const constructorAbi = abi.find(abi => abi.type === 'constructor');
	if (args?.length && constructorAbi) {
		const constructorInputTypes = constructorAbi.inputs.map(input => ({
			type: input.type,
			name: input.name,
		}));

		if (args.length !== constructorInputTypes.length) {
			throw new Error(
				`Constructor input types length mismatch: ${args.length} !== ${constructorInputTypes.length}`,
			);
		}

		if (args.length && args.length === constructorInputTypes.length) {
			const preparedArgs = args.map((arg, i) =>
				preparedParamForEncoding(constructorInputTypes[i] as AbiParameter, arg),
			);
			encodedConstructorArgs = encodeAbiParameters(
				constructorInputTypes,
				preparedArgs,
			);
		}
	}

	return encodedConstructorArgs;
}

export function getEncodedInitializationArgs(
	abi: Abi,
	args: string[] | undefined,
) {
	let encodedInitializationArgs: Hex | undefined;

	const initializationAbi = abi.find(
		abi => abi.type === 'function' && abi.name === 'initialize',
	) as AbiFunction | undefined;
	if (initializationAbi) {
		const initializationInputTypes = initializationAbi.inputs.map(input => ({
			type: input.type,
			name: input.name,
		}));

		if (args?.length && args?.length == initializationInputTypes.length) {
			const preparedArgs = args.map((arg, i) =>
				preparedParamForEncoding(
					initializationInputTypes[i] as AbiParameter,
					arg,
				),
			);
			encodedInitializationArgs = encodeAbiParameters(
				initializationInputTypes,
				preparedArgs,
			);
		}
	}

	return encodedInitializationArgs;
}
