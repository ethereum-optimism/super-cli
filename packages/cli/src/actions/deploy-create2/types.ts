import {ForgeArtifact} from '@/util/forge/readForgeArtifact';
import {Address, Chain, Hex} from 'viem';

export type DeploymentIntent = {
	chains: Chain[];
	forgeArtifactPath: string;
	forgeArtifact: ForgeArtifact;
	constructorArgs?: any[];
	salt: string;
};

export type ComputedDeploymentParams = {
	deterministicAddress: Address;
	initCode: Hex;
	baseSalt: Hex;
};

export type DeploymentParams = {
	intent: DeploymentIntent;
	computedParams: ComputedDeploymentParams;
};
