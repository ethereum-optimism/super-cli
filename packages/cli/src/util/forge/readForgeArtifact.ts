import {zodAddress, zodHash, zodHex} from '@/util/schemas';
import {Abi} from 'abitype/zod';
import {z} from 'zod';
import fs from 'fs';

const zodCompilerOutputSource = z.object({
	keccak256: zodHash,
	urls: z.array(z.string()),
	license: z.string(),
});

export const zodForgeArtifact = z.object({
	abi: Abi,
	bytecode: z.object({
		object: zodHex,
	}),
	metadata: z.object({
		compiler: z.object({
			version: z.string(),
		}),
		language: z.enum(['Solidity', 'Vyper']),
		sources: z.record(z.string(), zodCompilerOutputSource),
		version: z.number(),
		settings: z.object({
			remappings: z.array(z.string()),
			optimizer: z.object({
				enabled: z.boolean(),
				runs: z.number(),
				details: z
					.object({
						peephole: z.boolean(),
					})
					.optional(),
			}),
			metadata: z.object({
				bytecodeHash: z.string(),
			}),
			compilationTarget: z.record(z.string(), z.string()),
			evmVersion: z.string(),
			libraries: z.record(z.string(), z.record(z.string(), zodAddress)),
		}),
	}),
});

export type CompilerOutputSource = z.infer<typeof zodCompilerOutputSource>;

export type ForgeArtifact = z.infer<typeof zodForgeArtifact>;

export const readForgeArtifact = async (artifactPath: string) => {
	const artifact = await fs.promises.readFile(artifactPath, 'utf8');
	return zodForgeArtifact.parse(JSON.parse(artifact));
};
