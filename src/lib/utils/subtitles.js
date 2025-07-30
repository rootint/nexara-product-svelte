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
 * Handles optional speaker tags like "[SPEAKER_00]: Text..."
 * @param {string} srtString The raw SRT content.
 * @returns {Array<{id: number, startTime: string, endTime: string, text: string, speaker: string | null}> | null} Parsed subtitles or null if input is invalid.
 */
export function parseSrt(srtString) {
	if (!srtString || typeof srtString !== 'string') {
		console.error('Invalid SRT string provided for parsing.');
		return null;
	}

	const blocks = srtString.trim().split(/\r?\n\r?\n/);
	const subtitles = [];

	// Regex to capture speaker tags like "[SPEAKER_00]: " or "SPEAKER_00: "
	const speakerRegex = /^(?:\[(SPEAKER_\d+)\]:\s*|(SPEAKER_\d+):\s*)/;

	for (const block of blocks) {
		const lines = block.trim().split(/\r?\n/);
		if (lines.length < 2) continue; // Skip blocks with less than 2 lines.

		let timeMatch;
		let textStartIndex;

		// Check if the first line is a number (ID)
		if (/^\d+$/.test(lines[0])) {
			if (lines.length < 3) continue; // Need at least ID, timestamp, text
			timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
			textStartIndex = 2;
		} else {
			// If no ID, assume first line is timestamp
			timeMatch = lines[0].match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
			textStartIndex = 1;
		}


		if (!timeMatch) {
			console.warn('Skipping malformed SRT block (timestamp issue):', block);
			continue; // Skip malformed blocks
		}

		const startTime = timeMatch[1];
		const endTime = timeMatch[2];
		let text = lines.slice(textStartIndex).join('\n').trim();
		let speaker = null;

		const speakerMatch = text.match(speakerRegex);
		if (speakerMatch) {
			speaker = speakerMatch[1] || speakerMatch[2];
			text = text.substring(speakerMatch[0].length).trim();
		}

		if (text) {
			subtitles.push({
				id: subtitles.length + 1,
				startTime,
				endTime,
				text,
				speaker
			});
		}
	}

	return subtitles.length > 0 ? subtitles : null;
}
