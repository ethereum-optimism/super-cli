// converts snake case to camel case
export function capitalizeWords(s: string): string {
	return s.replace(/(?:^|-)([a-z])/g, (_, c) => c.toUpperCase());
}

// converts snake case to camel case

export type CapitalizeWords<S extends string> =
	S extends `${infer First}-${infer Rest}`
		? `${Capitalize<First>}${CapitalizeWords<Rest>}`
		: Capitalize<S>;

/**
 * @description Combines members of an intersection into a readable type.
 *
 * @see {@link https://twitter.com/mattpocockuk/status/1622730173446557697?s=20&t=NdpAcmEFXY01xkqU3KO0Mg}
 * @example
 * Prettify<{ a: string } & { b: string } & { c: number, d: bigint }>
 * => { a: string, b: string, c: number, d: bigint }
 */
export type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};
