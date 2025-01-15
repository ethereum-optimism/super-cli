export const toCliFlags = (options: Record<string, any>): string => {
	return Object.entries(options)
		.filter(
			([_, value]) => value !== '' && value !== undefined && value !== null,
		)
		.map(([key, value]) => {
			// Convert camelCase to kebab-case
			const flag = key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
			// Handle arrays by joining with commas
			const flagValue = Array.isArray(value) ? value.join(',') : value;
			return `--${flag} ${flagValue}`;
		})
		.join(' ');
};
