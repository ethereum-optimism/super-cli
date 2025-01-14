import { z } from "zod";
import { parse as parseTOML } from "smol-toml";
import fs from "fs";

export const zodSuperConfig = z.object({
	rpc_endpoints: z.record(z.string(), z.string()).optional(),
        verification_endpoints: z.record(z.string(), z.string()).optional(),
        creation_params: z.array(
                z.object({
                        salt: z.string(),
                        chains: z.array(z.string()),
                        network: z.string(),
                        verify: z.boolean(),
                        constructor_args: z.array(z.any()).optional()
                })
        ).optional()
})

export function parseSuperConfigFromTOML(pathToConfig: string) {
    const toml = fs.readFileSync(pathToConfig, {encoding: 'utf-8'});

    if (!toml) {
        throw new Error('Config file is empty');
    }

    const parsed = parseTOML(toml);
    const config = parsed['supercli'];
    if (!config) {
        throw new Error('[supercli] config not found in toml file.');
    }

    const parsedConfig = zodSuperConfig.safeParse(config);
    if (parsedConfig.success === false) {
        throw new Error('Config file is invalid');
    }

    return parsedConfig.data;
}
