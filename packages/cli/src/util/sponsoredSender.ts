const SPONSORED_SENDER_BASE_URL =
	'https://dapp-console-api.optimism.io/api/sponsored-sender';

export const getSponsoredSenderWalletRpcUrl = (
	apiKey: string,
	chainId: number,
) => {
	return `${SPONSORED_SENDER_BASE_URL}/${apiKey}/${chainId}`;
};
