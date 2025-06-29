<script>
	import { onMount } from 'svelte';
	import { dashboardStore } from '$lib/stores/dashboard';
	import { Check, Copy, Eye, RefreshCcw, UploadCloud } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { languageTag } from '$lib/paraglide/runtime.js';
	import * as m from '$lib/paraglide/messages.js';

	import n8n from '$lib/assets/n8n.jpg';
	import binary from '$lib/assets/binary.jpg';

	let selectedGuide = 'python requests'; // Default selection
	let isCurlCopied = false;
	let isPythonCopied = false; // Add state for python code copy

	$: apiKey = $dashboardStore.apiKey || 'YOUR_API_KEY'; // Reactive API key

	$: pythonCode = `import requests

url = "https://api.nexara.ru/api/v1/audio/transcriptions"
api_key = "${apiKey}" # Your actual API key is inserted here

headers = {
    "Authorization": f"Bearer {api_key}",
}

file_path = "audio/example.mp3" # Make sure this path is correct

with open(file_path, "rb") as audio_file:
    files = {
        "file": (file_path, audio_file, "audio/mpeg"), # Use 'audio/mpeg' for MP3
    }
    data = {
        "response_format": "verbose_json", # Other options: 'json', 'text', 'srt', 'vtt'
    }

    response = requests.post(url, headers=headers, files=files, data=data)

    if response.status_code == 200:
        transcription = response.json()
        print(transcription)
    else:
        print(f"Error: {response.status_code}")
        print(response.text)`;

	$: pythonCodeDisplay = pythonCode.replace(
		`api_key = "${apiKey}"`,
		`api_key = "${apiKey ? apiKey.slice(0, 5) + '••••••••••••••••••••••••' : 'YOUR_API_KEY'}"`
	);

	async function handleCopyPython() {
		try {
			await navigator.clipboard.writeText(pythonCode);
			isPythonCopied = true;
			setTimeout(() => (isPythonCopied = false), 2000); // Reset after 2 seconds
		} catch (err) {
			console.error('Failed to copy Python code:', err);
		}
	}

	async function handleCopyCurl() {
		const curlCommand = `curl --request POST \\
  --url https://api.nexara.ru/api/v1/audio/transcriptions \\
  --header 'Authorization: Bearer ${apiKey}' \\
  --header 'Content-Type: multipart/form-data'`;

		try {
			await navigator.clipboard.writeText(curlCommand);
			isCurlCopied = true;
			setTimeout(() => (isCurlCopied = false), 2000); // Reset after 2 seconds
		} catch (err) {
			console.error('Failed to copy cURL command:', err);
		}
	}
</script>

<div class="card">
	<div class="top-row">
		<div class="card-header">
			<p class="card-title">{m.db_guide_title()}</p>
		</div>
		<!-- <div class="guide-selector">
			<select bind:value={selectedGuide}>
				<option value="n8n">n8n</option>
				<option value="python requests">Python Requests</option>
			</select>
		</div> -->
	</div>
	<div style="height: 24px;"></div>

	<div class="guide-content">
		{#if selectedGuide === 'n8n'}
			<p>{m.db_guide_n8n_step_1()}</p>
			<img src={n8n} alt="n8n HTTP Request node setup" class="guide-image" />
			<p>{m.db_guide_n8n_step_2()}</p>
			<div class="code-block-card">
				<button class="copy-btn-code" on:click={handleCopyCurl}>
					{#if isCurlCopied}
						<Check size={16} />
					{:else}
						<Copy size={16} />
					{/if}
				</button>
				<pre><code
						>curl --request POST \
  --url https://api.nexara.ru/api/v1/audio/transcriptions \
  --header 'Authorization: Bearer {$dashboardStore.apiKey
							? $dashboardStore.apiKey.slice(0, 5) + '••••••••••••••••••••••••'
							: 'YOUR_API_KEY'}' \
  --header 'Content-Type: multipart/form-data'</code
					></pre>
			</div>
			<p>{m.db_guide_n8n_step_3()}</p>
			<img src={binary} alt="n8n Body Parameters setup" class="guide-image" />
			<p>
				{m.db_guide_n8n_step_4()}
				<a
					href={languageTag() === 'ru'
						? 'https://docs.nexara.ru/ru/api-reference/endpoint/transcription'
						: 'https://docs.nexara.ru/en/api-reference/endpoint/transcription'}
					target="_blank">{m.db_guide_n8n_step_4_docs()}</a
				>
			</p>
		{:else if selectedGuide === 'openai python'}
			<p>{m.db_guide_python_step_1()}</p>
			<div class="code-block-card">
				<button class="copy-btn-code" on:click={handleCopyPython}>
					{#if isPythonCopied}
						<Check size={16} />
					{:else}
						<Copy size={16} />
					{/if}
				</button>
				<pre><code>{pythonCodeDisplay}</code></pre>
			</div>
			<p>
				{m.db_guide_python_step_2()}
				<a
					href={languageTag() === 'ru'
						? 'https://docs.nexara.ru/ru/api-reference/endpoint/transcription'
						: 'https://docs.nexara.ru/en/api-reference/endpoint/transcription'}
					target="_blank">{m.db_guide_python_step_2_docs()}</a
				>
			</p>
		{:else if selectedGuide === 'python requests'}
			<p>{m.db_guide_python_step_1()}</p>
			<div class="code-block-card">
				<button class="copy-btn-code" on:click={handleCopyPython}>
					{#if isPythonCopied}
						<Check size={16} />
					{:else}
						<Copy size={16} />
					{/if}
				</button>
				<pre><code>{pythonCodeDisplay}</code></pre>
			</div>
			<p>
				{m.db_guide_python_step_2()}
				<a
					href={languageTag() === 'ru'
						? 'https://docs.nexara.ru/ru/api-reference/endpoint/transcription'
						: 'https://docs.nexara.ru/en/api-reference/endpoint/transcription'}
					target="_blank">{m.db_guide_python_step_2_docs()}</a
				>
			</p>
		{/if}
	</div>
</div>

<style>
	code {
		font-family: 'IBM Plex Mono', monospace;
	}
	.guide-content {
		display: flex;
		flex-direction: column;
		gap: 16px; /* Spacing between guide elements */
	}

	.guide-content p {
		/* color: rgba(250, 250, 250, 0.8); */
        color: var(--text-2);
		margin: 0;
		line-height: 1.5;
	}

	.guide-content a {
		color: #60a5fa; /* Light blue for links */
		text-decoration: none;
	}

	.guide-content a:hover {
		text-decoration: underline;
	}

	.guide-image {
		width: 100%;
		border-radius: var(--border-radius);
		display: block; /* Prevent extra space below image */
	}

	.code-block-card {
		position: relative; /* For positioning the copy button */
		border-radius: var(--border-radius);
        background-color: var(--card-bg-color);
		padding: 16px;
		border: 1px solid var(--border-color); /* Default border */
		width: 100%;
		box-sizing: border-box; /* Include padding and border in width */
	}

	.code-block-card pre {
		margin: 0;
		font-family: monospace;
		/* color: rgba(250, 250, 250, 0.9); */
        color: var(--text);
		white-space: pre-wrap; /* Wrap long lines */
		word-break: break-all; /* Break long words/URLs */
		font-size: 14px;
	}

	.copy-btn-code {
		position: absolute;
		top: 12px;
		right: 12px;
		outline: none;
		border: 1px solid var(--border-color);
		background-color: var(--secondary-button);
		padding: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 2px; /* Slightly smaller radius for button */
		cursor: pointer;
		color: rgba(250, 250, 250, 0.7);
	}

	.copy-btn-code:hover {
		/* background-color: rgba(250, 250, 250, 0.1); */
        background-color: var(--secondary-button-hover);
		color: rgba(250, 250, 250, 0.9);
	}

	.top-row {
		display: flex;
		justify-content: space-between;
		align-items: top;
		/* padding: 16px 24px; */ /* Removed padding here, added to card */
		width: 100%;
	}

	.guide-selector {
		/* position: relative; */ /* No longer needed if not using custom arrow */
	}

	.guide-selector select {
		background-color: rgba(250, 250, 250, 0.1);
		color: rgba(250, 250, 250, 0.8);
		border: 1px solid rgba(250, 250, 250, 0.2);
		border-radius: 8px;
		padding: 8px 12px;
		font-size: 14px;
		cursor: pointer;
		outline: none;
		/* min-width: 150px; */ /* Removed min-width */
	}

	.guide-selector select:focus {
		border-color: rgba(250, 250, 250, 0.5);
	}

	/* Style options if needed, though browser support varies */
	.guide-selector option {
		background-color: #333;
		color: #fafafa;
	}
	.card {
		/* background-color: rgba(250, 250, 250, 0.01); */
        background-color: var(--card-bg-color);
		backdrop-filter: blur(16px);
		transform: translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)
			skew(0deg, 0deg);
		border-radius: var(--border-radius);
		padding: 24px; /* Main card padding */
	}
	.card-title {
		/* color: rgba(250, 250, 250, 0.5); */
        color: var(--text);
		margin: 0;
	}
</style>
