// Converts bigints into special objects that can be serialized and deserialized by JSON.stringify

// Magic value to identify our serialized format
export const SERIALIZATION_MAGIC = '@sup/serialized-v1' as const;

export type SerializedValue<T> = {
	magic: typeof SERIALIZATION_MAGIC;
	type: string;
	value: T;
};

export type SerializedBigInt = SerializedValue<string>;

const isBigInt = (value: unknown): value is bigint => {
	return typeof value === 'bigint';
};

const isSerializedValue = <T>(
	value: unknown,
	type: string,
): value is SerializedValue<T> => {
	return (
		typeof value === 'object' &&
		value !== null &&
		'magic' in value &&
		'type' in value &&
		'value' in value &&
		value.magic === SERIALIZATION_MAGIC &&
		value.type === type &&
		value.value !== undefined
	);
};

const createSerializedValue = <T>(
	type: string,
	value: T,
): SerializedValue<T> => {
	return {
		magic: SERIALIZATION_MAGIC,
		type,
		value,
	};
};

export const transformValueToBigInt = (value: unknown): unknown => {
	if (isSerializedValue<string>(value, 'bigint')) {
		return BigInt(value.value);
	}

	if (Array.isArray(value)) {
		return value.map(transformValueToBigInt);
	}

	if (typeof value === 'object' && value !== null) {
		return Object.fromEntries(
			Object.entries(value).map(([k, v]) => [k, transformValueToBigInt(v)]),
		);
	}

	return value;
};

export const transformValueToSerializable = (value: unknown): unknown => {
	if (isBigInt(value)) {
		return createSerializedValue('bigint', value.toString());
	}

	if (Array.isArray(value)) {
		return value.map(transformValueToSerializable);
	}

	if (typeof value === 'object' && value !== null) {
		return Object.fromEntries(
			Object.entries(value).map(([k, v]) => [
				k,
				transformValueToSerializable(v),
			]),
		);
	}

	return value;
};
