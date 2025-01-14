import {TextInput} from '@inkjs/ui';
import {AbiConstructor, AbiFunction, AbiParameter} from 'abitype';
import {Box, Text} from 'ink';
import {useState} from 'react';
import {decodeAbiParameters, encodeAbiParameters} from 'viem';
import {z} from 'zod';

const preprocess = <T extends AbiParameter['type']>(type: T, value: string) => {
	// this one we should try to not throw errors, that is job of encodeAbiParameters
	// encodeAbiParameters has more descriptive errors, so we don't need to duplicate that here
	// it simply handles the following and returns everything else as is
	//
	// 1. ints that need to be cast to bigint
	// 2. booleans that need to be cast to true/false
	// 3. doesn't handle tuples or structs (TODO)

	if (type.startsWith('int') || type.startsWith('uint')) {
		const {success, data} = z.coerce.bigint().safeParse(value);
		if (!success) return value;
		return data;
	}

	if (type === 'bool') {
		if (value === 'true') return true;
		if (value === 'false') return false;
	}

	return value;
};

const validate = <T extends AbiParameter>(
	abiParameter: T,
	value: string,
): any => {
	const preprocessed = preprocess(abiParameter.type, value);

	const abiParameters = [abiParameter];

	// if it throws any errors in this process, we know it's invalid
	// @ts-expect-error - this is all runtime validation anyway
	const encoded = encodeAbiParameters(abiParameters, [preprocessed]);

	const decoded = decodeAbiParameters(abiParameters, encoded);

	return decoded[0];
};

export const AbiItemInput = <T extends AbiParameter>({
	parameter,
	onSubmit,
}: {
	parameter: T;
	onSubmit: (value: any[]) => void;
}) => {
	const [error, setError] = useState('');
	const [attemptCount, setAttemptCount] = useState(0);

	const handleSubmit = (val: string) => {
		try {
			const validated = validate(parameter, val);
			onSubmit(validated);
			setError('');
		} catch (err: unknown) {
			const error = err as Error & {shortMessage?: string};
			setError('Invalid: ' + (error.shortMessage || error.message));
			setAttemptCount(count => count + 1);
		}
	};

	return (
		<Box flexDirection="column">
			<Text color="red">{error ? `❌ ${error}` : ' '}</Text>
			<TextInput key={`${attemptCount}`} onSubmit={handleSubmit} />
		</Box>
	);
};

export const AbiItemForm = <T extends AbiConstructor | AbiFunction>({
	abiItem,
	onSubmit,
}: {
	abiItem: T;
	onSubmit: (values: T['inputs']) => void;
}) => {
	const {inputs} = abiItem;
	const [values, setValues] = useState(new Array(inputs.length));
	const [currentIndex, setCurrentIndex] = useState(0);

	return (
		<Box flexDirection="column">
			<Box marginBottom={1}>
				<Text bold color="blue">
					📝 Enter function arguments
				</Text>
			</Box>

			<Box flexDirection="column">
				{inputs.map((input, index) => (
					<Box key={index}>
						<Text>
							{index === currentIndex ? '▶️ ' : '  '}
							<Text color="green">{input.name || 'unnamed'}</Text>
							<Text dimColor> ({input.type})</Text>
							{values[index] ? (
								<Text color="cyan"> = {values[index]}</Text>
							) : (
								<Text dimColor> ⋯</Text>
							)}
							{currentIndex > index && <Text color="green"> ✓</Text>}
						</Text>
					</Box>
				))}
			</Box>

			<Box marginTop={1}>
				<Text dimColor>Enter value for </Text>
				<Text bold color="yellow">
					{inputs[currentIndex]?.name || 'unnamed'}
				</Text>
			</Box>

			<AbiItemInput
				key={currentIndex}
				parameter={inputs[currentIndex]!}
				onSubmit={value => {
					const newValues = [...values];
					newValues[currentIndex] = value;

					if (currentIndex === inputs.length - 1) {
						onSubmit(newValues);
					} else {
						setValues(newValues);
						setCurrentIndex(currentIndex + 1);
					}
				}}
			/>
		</Box>
	);
};
