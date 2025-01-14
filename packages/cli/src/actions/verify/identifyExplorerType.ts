// Heuristics to identify the type of explorer
export const identifyExplorer = async (baseUrl: string) => {
	const apiUrl = `${baseUrl}/api`;
	const testAddress = '0x0000000000000000000000000000000000000000';

	try {
		const response = await fetch(
			`${apiUrl}?module=account&action=balance&address=${testAddress}`,
		);
		const data = await response.json();

		// Etherscan returns a specific error for missing API key
		if (data.message === 'NOTOK' && data.result === 'Missing/Invalid API Key') {
			return 'etherscan' as const;
		}

		// If we get a successful response, it's likely Blockscout
		if (data.status === '1' && data.result) {
			return 'blockscout' as const;
		}
	} catch (error) {
		throw new Error('Error identifying explorer');
	}

	throw new Error('Unknown explorer type');
};
