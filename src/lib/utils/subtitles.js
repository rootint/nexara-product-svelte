function parseSrtTimeToSeconds(timeString) {
	// --- Input Validation ---
	if (!timeString || typeof timeString !== 'string') {
		return null; // Handle null, undefined, or non-string input
	}

	// --- Regex Matching ---
	// Matches HH:MM:SS,ms format strictly
	const regex = /^(\d{2}):(\d{2}):(\d{2}),(\d{3})$/;
	const match = timeString.trim().match(regex); // trim() handles potential whitespace

	if (!match) {
		console.error(`Invalid SRT time format: "${timeString}"`);
		return null; // Return null if the format doesn't match
	}

	// --- Extraction and Calculation ---
	try {
		// match[0] is the full matched string
		const hours = parseInt(match[1], 10);
		const minutes = parseInt(match[2], 10);
		const seconds = parseInt(match[3], 10);
		const milliseconds = parseInt(match[4], 10);

		// Calculate total seconds
		const totalSeconds = hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;

		return totalSeconds;
	} catch (error) {
		// Should not happen with the regex guard, but good practice
		console.error(`Error parsing time components from "${timeString}":`, error);
		return null;
	}
}

// --- How to use with the previous formatting function ---
export function formatDurationHMS(str) {
	let totalSeconds = parseSrtTimeToSeconds(str);
	// (Copied from previous answer)
	if (
		totalSeconds == null ||
		typeof totalSeconds !== 'number' ||
		!isFinite(totalSeconds) ||
		totalSeconds < 0
	) {
		return 'N/A';
	}
	const totalSecondsRounded = Math.floor(totalSeconds);
	const hours = Math.floor(totalSecondsRounded / 3600);
	const minutes = Math.floor((totalSecondsRounded % 3600) / 60);
	const seconds = totalSecondsRounded % 60;
	const formattedMinutes = minutes.toString().padStart(2, '0');
	const formattedSeconds = seconds.toString().padStart(2, '0');
	if (hours > 0) {
		const formattedHours = hours.toString().padStart(2, '0');
		return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
	} else {
		return `${formattedMinutes}:${formattedSeconds}`;
	}
}

/**
 * Parses an SRT subtitle string into an array of objects.
 * @param {string} srtString The raw SRT content.
 * @returns {Array<{id: number, startTime: string, endTime: string, text: string}> | null} Parsed subtitles or null if input is invalid.
 */
export function parseSrt(srtString) {
	if (!srtString || typeof srtString !== 'string') {
		console.error('Invalid SRT string provided for parsing.');
		return null;
	}

	const blocks = srtString.trim().split(/\r?\n\r?\n/);
	const subtitles = [];

	for (const block of blocks) {
		const lines = block.trim().split(/\r?\n/);
		if (lines.length < 3) continue; // Need at least ID, timestamp, text

		const id = parseInt(lines[0], 10);
		const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);

		if (isNaN(id) || !timeMatch) {
			console.warn('Skipping malformed SRT block:', block);
			continue; // Skip malformed blocks
		}

		const startTime = timeMatch[1];
		const endTime = timeMatch[2];
		const text = lines.slice(2).join('\n').trim(); // Join multi-line text

		if (text) {
			// Only add if there's actual text
			subtitles.push({ id, startTime, endTime, text });
		}
	}

	return subtitles.length > 0 ? subtitles : null; // Return null if no valid subtitles found
}
