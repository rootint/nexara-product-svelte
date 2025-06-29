<script>
	import { dashboardStore } from '$lib/stores/dashboard';
	import { parseSrt, formatDurationHMS } from '$lib/utils/subtitles';
	import {
		UploadCloud,
		File as FileIcon,
		Loader2,
		AlertTriangle,
		X,
		Download, // Import Download icon
		Copy // Import Copy icon
	} from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';

	let selectedFile = null;
	let isDragging = false;
	let fileInputRef = null; // Reference to the hidden file input
	const acceptedMimeTypes = [
		'audio/wav',
		'audio/x-wav',
		'audio/wave',
		'audio/mp3',
		'audio/mpeg',
		'audio/mpg',
		'audio/x-mpeg',
		'audio/x-m4a',
		'audio/mp4',
		'audio/mp4a-latm',
		'audio/mpeg4',
		'audio/aac',
		'audio/flac',
		'audio/ogg',
		'audio/oga',
		'audio/opus',
		'audio/aiff',
		'audio/x-aiff',
		'audio/asf',
		'video/mp4',
		'video/quicktime',
		'video/x-msvideo',
		'video/x-matroska',
		'video/webm'
	];
	const acceptedExtensionsString =
		'.mp3, .m4a, .mp4, .wav, .ogg, .aac, .flac, .opus, .mov, .avi, .mkv, .webm';

	// Transcription State
	let isTranscribing = false;
	let transcriptionResult = null; // Will hold the full result object { verbose_json: {...}, srt: '...', vtt: '...' }
	let transcriptionError = null;
	// Removed srtResult variable as it's part of transcriptionResult
	let parsedSubtitles = null; // Array of { id, startTime, endTime, text }
	let copyButtonText = m.db_transcribe_copy();

	// --- File Handling Functions ---

	function handleDragOver(event) {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragLeave() {
		isDragging = false;
	}

	function handleDrop(event) {
		event.preventDefault();
		isDragging = false;
		const files = event.dataTransfer.files;
		processFiles(files);
	}

	function handleFileSelect(event) {
		const files = event.target.files;
		processFiles(files);
		if (event.target) event.target.value = null; // Allow selecting the same file again
	}

	function processFiles(files) {
		if (files.length === 0) return;
		if (files.length > 1) {
			alert(m.alert_select_single_file());
			return;
		}
		const file = files[0];
		selectedFile = file;
		transcriptionResult = null;
		transcriptionError = null;
		parsedSubtitles = null;
		copyButtonText = m.db_transcribe_copy(); // Reset copy button text
		console.log('Selected file:', selectedFile);
	}

	function triggerFileInput() {
		if (fileInputRef) {
			fileInputRef.click();
		}
	}

	function clearTranscriptionState() {
		selectedFile = null;
		isTranscribing = false;
		transcriptionResult = null;
		transcriptionError = null;
		parsedSubtitles = null;
		copyButtonText = m.db_transcribe_copy(); // Reset copy button text
		if (fileInputRef) fileInputRef.value = null;
	}

	// --- Transcription Function ---
	async function transcribeFile() {
		if (!selectedFile || isTranscribing || !$dashboardStore.apiKey) return;

		console.log('--- Starting Transcription ---');
		isTranscribing = true;
		transcriptionResult = null;
		transcriptionError = null;
		parsedSubtitles = null;
		copyButtonText = m.db_transcribe_copy(); // Reset copy button text

		try {
			const result = await dashboardStore.transcribeFile(selectedFile, $dashboardStore.apiKey);
			console.log('--- Transcription Successful ---', result);

			// Basic validation of the expected result structure
			if (
				typeof result !== 'object' ||
				result === null ||
				typeof result.srt !== 'string' ||
				typeof result.vtt !== 'string' ||
				typeof result.verbose_json?.text !== 'string'
			) {
				console.error('Unexpected transcription result structure:', result);
				throw new Error(m.error_invalid_transcription_format());
			}

			transcriptionResult = result; // Store the raw result

			// Parse the SRT text if available
			if (transcriptionResult.srt) {
				parsedSubtitles = parseSrt(transcriptionResult.srt);
				if (!parsedSubtitles || parsedSubtitles.length === 0) {
					console.warn('SRT parsing resulted in no valid subtitles.');
					// Keep result, parsedSubtitles will be empty/null, handled by template
				}
			} else {
				console.error('Transcription result is missing SRT data.');
				// This case is less likely now due to the check above, but kept for safety
				parsedSubtitles = null;
			}

			// Don't clear selectedFile immediately if we might want its name later,
			// but for now, the logic clears it.
			// selectedFile = null; // Let's keep the file info until 'clear' is clicked? Or maybe not needed now.
			// Let's clear it for now as per original logic. If needed later, we can store the name.
			selectedFile = null;
			await dashboardStore.loadDashboardData(); // Reload dashboard data (e.g., credits update)
		} catch (error) {
			console.error('--- Transcription Failed --- ', error);
			transcriptionError = error.message || m.error_unknown_transcription();
			selectedFile = null; // Clear file on error too
		} finally {
			isTranscribing = false;
		}
	}

	// --- Helper Functions for Actions ---

	function downloadFile(content, filename, mimeType = 'text/plain;charset=utf-8') {
		if (!content) {
			console.error('No content provided for download.');
			alert(m.alert_no_download_data());
			return;
		}
		try {
			const blob = new Blob([content], { type: mimeType });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (err) {
			console.error('Download failed:', err);
			alert(m.alert_download_failed({ filename }));
		}
	}

	async function copyToClipboard(text) {
		if (!text) {
			console.error('No text provided for copying.');
			alert(m.alert_no_copy_data());
			return;
		}
		if (!navigator.clipboard) {
			alert(m.alert_copy_not_supported());
			return;
		}
		try {
			await navigator.clipboard.writeText(text);
			copyButtonText = m.db_transcribe_copied();
			setTimeout(() => {
				copyButtonText = m.db_transcribe_copy();
			}, 2000); // Reset after 2 seconds
		} catch (err) {
			console.error('Failed to copy text: ', err);
			copyButtonText = m.db_transcribe_copy_error();
			setTimeout(() => {
				copyButtonText = m.db_transcribe_copy();
			}, 2000);
		}
	}

	// --- Event Handlers for Action Buttons ---

	function handleDownloadSrt() {
		if (transcriptionResult?.srt) {
			// Try to derive a filename if possible, otherwise use generic
			const baseName = selectedFile?.name?.split('.').slice(0, -1).join('.') || 'transcription';
			downloadFile(transcriptionResult.srt, `${baseName}.srt`, 'text/plain;charset=utf-8'); // SRT often uses text/plain
		}
	}

	function handleDownloadVtt() {
		if (transcriptionResult?.vtt) {
			const baseName = selectedFile?.name?.split('.').slice(0, -1).join('.') || 'transcription';
			downloadFile(transcriptionResult.vtt, `${baseName}.vtt`, 'text/vtt;charset=utf-8');
		}
	}

	function handleDownloadTxt() {
		if (transcriptionResult?.verbose_json?.text) {
			const baseName = selectedFile?.name?.split('.').slice(0, -1).join('.') || 'transcription';
			downloadFile(
				transcriptionResult.verbose_json.text,
				`${baseName}.txt`,
				'text/plain;charset=utf-8'
			);
		}
	}

	function handleCopyText() {
		if (transcriptionResult?.verbose_json?.text) {
			copyToClipboard(transcriptionResult.verbose_json.text);
		}
	}
</script>

<div class="transcription-card">
	<div class="top-row">
		<p class="card-title">{m.db_transcribe_title()}</p>
		{#if transcriptionResult && !isTranscribing}
			<!-- Action Buttons - Show only when transcriptionResult exists -->
			<div class="action-buttons">
				<button
					class="action-btn"
					title={m.db_transcribe_download_srt_title()}
					on:click={handleDownloadSrt}
					disabled={!transcriptionResult?.srt}
				>
					<Download size="16" /> SRT
				</button>
				<button
					class="action-btn"
					title={m.db_transcribe_download_vtt_title()}
					on:click={handleDownloadVtt}
					disabled={!transcriptionResult?.vtt}
				>
					<Download size="16" /> VTT
				</button>
				<button
					class="action-btn"
					title={m.db_transcribe_download_txt_title()}
					on:click={handleDownloadTxt}
					disabled={!transcriptionResult?.verbose_json?.text}
				>
					<Download size="16" /> TXT
				</button>
				<button
					class="action-btn"
					title={m.db_transcribe_copy_title()}
					on:click={handleCopyText}
					disabled={!transcriptionResult?.verbose_json?.text ||
						copyButtonText !== m.db_transcribe_copy()}
				>
					<Copy size="16" />
					{copyButtonText}
				</button>
			</div>
		{/if}
	</div>

	{#if !$dashboardStore.apiKey}
		<!-- Message if API Key is missing -->
		<div class="api-key-required">
			<AlertTriangle size={32} color="#aaa" />
			<p>{m.db_transcribe_api_key_needed()}</p>
			<p>{m.db_transcribe_check_api_key()}</p>
		</div>
	{:else}
		<!-- Main Content: Show based on state -->
		<div class="content-area">
			<!-- State: Idle (No file selected, no results/errors) -->
			{#if !selectedFile && !isTranscribing && !transcriptionResult && !transcriptionError}
				<input
					type="file"
					bind:this={fileInputRef}
					on:change={handleFileSelect}
					accept={acceptedMimeTypes.join(',')}
					style="display: none;"
					aria-hidden="true"
				/>
				<div
					class="drop-zone {isDragging ? 'dragging' : ''}"
					on:dragover={handleDragOver}
					on:dragleave={handleDragLeave}
					on:drop={handleDrop}
					on:click={triggerFileInput}
					role="button"
					tabindex="0"
					on:keypress={(e) => {
						if (e.key === 'Enter' || e.key === ' ') triggerFileInput();
					}}
					aria-label={m.db_transcribe_drop_zone_aria()}
				>
					<UploadCloud size={48} stroke-width={1} color="#888" />
					<p>{m.db_transcribe_drag_drop()}</p>
					<p class="drop-zone-or">{m.db_transcribe_or()}</p>
					<button type="button" class="select-file-btn" tabindex="-1"
						>{m.db_transcribe_upload()}</button
					>
					<p class="drop-zone-types">
						{m.db_transcribe_supported_formats()}
						{acceptedExtensionsString}
					</p>
				</div>

				<!-- State: File Selected, Ready to Transcribe -->
			{:else if selectedFile && !isTranscribing && !transcriptionResult && !transcriptionError}
				<div class="file-selected-info">
					<div class="file-details">
						<FileIcon size={32} color="#ccc" />
						<div class="file-meta">
							<p class="file-name" title={selectedFile.name}>{selectedFile.name}</p>
							<p class="file-size">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
						</div>
					</div>
					<div class="file-actions">
						<button
							class="clear-file-btn"
							on:click={clearTranscriptionState}
							title={m.db_transcribe_cancel_selection_title()}
						>
							<X size="18" />
						</button>
						<button class="buy-btn transcribe-btn" on:click={transcribeFile}>
							{m.db_transcribe_button()}
						</button>
					</div>
				</div>

				<!-- State: Transcribing -->
			{:else if isTranscribing}
				<div class="transcribing-indicator">
					<Loader2 class="spin-icon" size={48} color="#ccc" />
					<p>{m.db_transcribe_progress()}</p>
					{#if selectedFile}
						<p class="file-name-progress" title={selectedFile.name}>{selectedFile.name}</p>
					{/if}
					<p class="transcribing-note">{m.db_transcribe_progress_note()}</p>
				</div>

				<!-- State: Transcription Error -->
			{:else if transcriptionError}
				<div class="transcription-error">
					<AlertTriangle size={40} color="#ff6b6b" />
					<h4>{m.db_transcribe_error_title()}</h4>
					<p class="error-message">{transcriptionError}</p>
					<button class="select-file-btn try-again-btn" on:click={clearTranscriptionState}
						>{m.db_transcribe_try_again_button()}</button
					>
				</div>

				<!-- State: Transcription Success (parsed subtitles shown) -->
				<!-- Combined success states as buttons are handled above -->
			{:else if transcriptionResult && !isTranscribing}
				{#if parsedSubtitles && parsedSubtitles.length > 0}
					<div class="transcription-results">
						<h4>{m.db_transcribe_result()}:</h4>
						<div class="subtitle-list">
							{#each parsedSubtitles as subtitle (subtitle.id)}
								<div class="subtitle-card">
									<div class="subtitle-timestamp">
										<span class="time">{formatDurationHMS(subtitle.startTime)}</span>
										<span class="separator"> → </span>
										<span class="time">{formatDurationHMS(subtitle.endTime)}</span>
									</div>
									<p class="subtitle-text">{subtitle.text}</p>
								</div>
							{/each}
						</div>
						<button class="select-file-btn again-btn" on:click={clearTranscriptionState}>
							{m.db_transcribe_another_button()}
						</button>
					</div>
				{:else}
					<!-- State: Transcription Success (but parsing failed or no subtitles found) -->
					<div class="transcription-warning">
						<AlertTriangle size={40} color="#ffcc00" />
						<h4>{m.db_transcribe_warning_title()}</h4>
						<p class="warning-message">
							{parsedSubtitles === null
								? m.db_transcribe_warning_parse_failed()
								: m.db_transcribe_warning_no_subtitles()}
							{m.db_transcribe_warning_can_download()}
							{transcriptionResult.verbose_json?.text
								? m.db_transcribe_warning_full_text_available()
								: ''}
						</p>
						<!-- Optionally show raw SRT/VTT if needed for debug -->
						<!--
                         <textarea class="result-text" readonly value={ transcriptionResult.srt || 'Нет данных SRT' }></textarea>
                         <textarea class="result-text" readonly value={ transcriptionResult.vtt || 'Нет данных VTT' }></textarea>
                         -->
						<textarea
							class="result-text"
							readonly
							value={transcriptionResult.verbose_json?.text ||
								m.db_transcribe_warning_full_text_unavailable()}
						></textarea>
						<button class="select-file-btn try-again-btn" on:click={clearTranscriptionState}>
							{m.db_transcribe_try_again_button()}
						</button>
					</div>
				{/if}
			{/if}
		</div>
	{/if}
</div>

<style>
	/* Existing styles */
	.transcription-card {
		/* background-color: rgba(255, 255, 255, 0.015); */
        background-color: var(--card-bg-color);
		backdrop-filter: blur(16px);
		transform: translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)
			skew(0deg, 0deg);
		border-radius: var(--border-radius);
		padding: 24px;
		/* margin: 32px; */
		/* margin-top: 0; */
		display: flex;
		flex-direction: column;
		/* color: #fff; */
        color: var(--text);
		min-height: 360px; /* Ensure minimum height */
        border: 1px solid var(--border-color);
	}

	.top-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		margin-bottom: 16px;
		flex-wrap: wrap; /* Allow wrapping if space is tight */
		gap: 10px; /* Add gap for wrapping */
	}

	.card-title {
		font-size: 16px;
		color: var(--text);
		margin: 0;
		flex-shrink: 0; /* Prevent title from shrinking too much */
	}

	.content-area {
		flex-grow: 1;
		display: flex;
		flex-direction: column;
	}

	/* --- NEW: Action Buttons --- */
	.action-buttons {
		display: flex;
		gap: 8px; /* Spacing between buttons */
		flex-wrap: wrap; /* Allow buttons to wrap on small screens */
	}

	.action-btn {
		display: inline-flex; /* Align icon and text */
		align-items: center;
		gap: 6px; /* Space between icon and text */
		padding: 6px 12px; /* Slightly smaller padding */
		border-radius: 6px; /* Consistent radius */
		/* border: 1px solid rgba(255, 255, 255, 0.2); */
        border: 1px solid var(--border-color);
		/* background: rgba(255, 255, 255, 0.05); */
        background: var(--secondary-button);
		/* color: #bbb; */
        color: var(--text);
		cursor: pointer;
		font-size: 13px; /* Smaller font */
		transition:
			background-color 0.2s ease,
			border-color 0.2s ease,
			color 0.2s ease;
		white-space: nowrap; /* Prevent text wrapping */
	}

	.action-btn:hover:not(:disabled) {
        background-color: var(--secondary-button-hover);
		/* border-color: rgba(255, 255, 255, 0.4); */
		color: var(--text);
	}

	.action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	/* --- End Action Buttons --- */

	/* --- States --- */

	.api-key-required,
	.transcribing-indicator,
	.transcription-error,
	.transcription-warning {
		flex-grow: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		text-align: center;
		color: var(--text-2);
		padding: 20px;
	}
	.api-key-required p {
		margin: 8px 0 0 0;
		font-size: 14px;
		max-width: 350px;
		line-height: 1.5;
	}

	.drop-zone {
		flex-grow: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		/* border: 2px dashed rgba(255, 255, 255, 0.2); */
        border: 2px dashed var(--border-color);
		border-radius: var(--border-radius);
		padding: 32px;
		text-align: center;
		color: #aaa;
		cursor: pointer;
		transition:
			border-color 0.3s ease,
			background-color 0.3s ease;
	}
	.drop-zone.dragging {
		border-color: #fff;
		background-color: rgba(255, 255, 255, 0.05);
	}
	.drop-zone:hover {
		border-color: rgba(255, 255, 255, 0.4);
	}
	.drop-zone p {
		margin: 8px 0 0 0;
	}
	.drop-zone-or {
		margin: 4px 0 !important;
		font-size: 14px;
		color: #888;
	}
	.drop-zone-types {
		margin-top: 12px !important;
		font-size: 13px;
		color: #777;
	}

	.select-file-btn {
		margin-top: 12px;
		padding: 8px 16px;
		border-radius: var(--border-radius);
		/* border: 1px solid rgba(255, 255, 255, 0.3); */
        border: none;
		/* background: transparent; */
        background: var(--primary);
		color: var(--btn-text);
		cursor: pointer;
		font-size: 14px;
		transition:
			background-color 0.2s ease,
			border-color 0.2s ease;
	}
	.select-file-btn:hover {
		background-color: var(--primary-dark);
		/* border-color: rgba(255, 255, 255, 0.5); */
	}

	.file-selected-info {
		flex-grow: 1;
		display: flex;
		flex-direction: column; /* Stack details and actions vertically */
		justify-content: center; /* Center vertically */
		align-items: center; /* Center horizontally */
		padding: 20px;
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: var(--border-radius);
		background-color: rgba(255, 255, 255, 0.03);
		gap: 20px;
	}
	.file-details {
		display: flex;
		align-items: center;
		gap: 16px;
		width: 100%; /* Take full width */
		max-width: 450px; /* Limit width */
		overflow: hidden;
	}
	.file-meta {
		overflow: hidden;
		flex-grow: 1;
	}
	.file-name {
		font-weight: 500;
		color: var(--text-2);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin: 0;
		font-size: 15px;
	}
	.file-size {
		font-size: 13px;
		color: #999;
		margin: 2px 0 0 0;
	}
	.file-actions {
		display: flex;
		gap: 16px;
		align-items: center;
		width: 100%;
		justify-content: center;
		flex-wrap: wrap; /* Allow wrapping if needed */
	}

	.buy-btn.transcribe-btn {
		border-radius: 8px;
		background: var(--primary);
		padding: 12px 24px;
		border: none;
		cursor: pointer;
		transition: background-color 0.2s ease;
		color: var(--btn-text);
		font-size: 15px;
		font-weight: 500;
		line-height: 1;
	}
	.buy-btn.transcribe-btn:hover {
		/* background-color: #eee; */
        background-color: var(--primary-dark);
	}

	.clear-file-btn {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: #ccc;
		border-radius: 50%;
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		padding: 0;
		flex-shrink: 0;
		transition:
			background-color 0.2s ease,
			color 0.2s ease;
	}
	.clear-file-btn:hover {
		background: rgba(255, 255, 255, 0.2);
		color: #fff;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
	.spin-icon {
		animation: spin 1.5s linear infinite;
	}

	.transcribing-indicator p {
		margin: 8px 0 0 0;
	}
	.file-name-progress {
		font-size: 14px;
		color: #888;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 80%;
		margin-top: 4px !important;
	}
	.transcribing-note {
		font-size: 13px;
		color: #777;
		margin-top: 16px !important;
	}

	.transcription-error h4,
	.transcription-warning h4 {
		color: #eee;
		margin: 16px 0 8px 0;
		font-size: 18px;
		font-weight: 500;
	}
	.error-message,
	.warning-message {
		color: #bbb;
		margin-bottom: 20px;
		font-size: 14px;
		line-height: 1.5;
		max-width: 450px;
	}

	.try-again-btn,
	.again-btn {
		margin-top: 16px;
	}

	.transcription-results {
		/* Removed margin-top as buttons are now outside */
		flex-grow: 1;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
	}
	.transcription-results h4 {
		/* color: #ccc; */
        color: var(--text-2);
		font-size: 16px;
		font-weight: 500;
		margin-bottom: 16px;
		flex-shrink: 0;
	}

	.subtitle-list {
		flex-grow: 1;
		overflow-y: auto;
		padding-right: 8px;
		margin-bottom: 24px;
		scrollbar-width: thin;
		scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
	}
	.subtitle-list::-webkit-scrollbar {
		width: 6px;
	}
	.subtitle-list::-webkit-scrollbar-track {
		background: transparent;
	}
	.subtitle-list::-webkit-scrollbar-thumb {
		background-color: rgba(255, 255, 255, 0.2);
		border-radius: 3px;
	}

	.subtitle-card {
		display: flex;
		flex-direction: row;
		gap: 16px;
		align-items: center;
		margin-bottom: 12px;
		width: 100%;
	}
	.subtitle-timestamp {
		/* border: 1px solid rgba(255, 255, 255, 0.11); */
        border: 1px solid var(--border-color);
		border-radius: 2px;
		padding: 6px 10px;
		/* background-color: rgba(255, 255, 255, 0.05); */
        background-color: var(--secondary-button);
		flex-shrink: 0;
		white-space: nowrap;
		font-size: 13px;
	}
	.time,
	.separator {
		/* color: #bbb; */
        color: var(--text-2);
		font-family: 'IBM Plex Mono', monospace;
	}
	.subtitle-text {
		color:var(--text);
		flex-grow: 1;
		min-width: 0;
		word-wrap: break-word;
		overflow-wrap: break-word;
		line-height: 1.5;
		margin: 0;
		padding-top: 2px;
		font-size: 15px;
	}

	.result-text {
		width: 100%;
		min-height: 150px;
		background-color: rgba(0, 0, 0, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 8px;
		padding: 12px;
		color: var(--text-2);
		font-family: monospace;
		font-size: 13px;
		resize: vertical;
		margin-bottom: 16px;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		/* Adjusted breakpoint */
		.top-row {
			justify-content: center; /* Center title and buttons if they wrap */
		}
		.action-buttons {
			justify-content: center; /* Center buttons if they wrap */
			width: 100%; /* Allow buttons to take full width if needed */
			margin-top: 8px; /* Add space if title wraps above */
		}
	}
	@media (max-width: 600px) {
		.subtitle-card {
			flex-direction: column;
			align-items: flex-start;
			gap: 8px;
		}
		.subtitle-timestamp {
			margin-bottom: 4px;
		}
		.file-selected-info {
			align-items: stretch;
		}
		.file-details {
			max-width: 100%;
		}
		.file-actions {
			justify-content: space-between;
		}
	}
</style>
