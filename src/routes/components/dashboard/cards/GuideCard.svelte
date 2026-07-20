<script>
	import { dashboardStore } from '$lib/stores/dashboard';
	import { Check, Copy } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js';

	const DOCS_URL = 'https://docs.nexara.ru';
	const PYTHON_INSTALL = 'pip install nexara';
	const TS_INSTALL = 'npm install nexara-sdk';
	const N8N_PACKAGE = 'n8n-nodes-nexara';

	let selectedGuide = 'python'; // Default selection: Python SDK
	let copiedId = null;

	$: apiKey = $dashboardStore.apiKeys?.[0]?.api_key || 'YOUR_API_KEY';
	// Full key for the copy-to-clipboard action; masked variant for on-screen display.
	$: maskedKey =
		apiKey !== 'YOUR_API_KEY' ? apiKey.slice(0, 5) + '••••••••••••••••••••••••' : 'YOUR_API_KEY';

	$: pythonCode = `from nexara import Nexara

client = Nexara(api_key="${apiKey}")

text = client.transcriptions.create(file="audio.mp3").text
print(text)`;
	$: pythonCodeDisplay = `from nexara import Nexara

client = Nexara(api_key="${maskedKey}")

text = client.transcriptions.create(file="audio.mp3").text
print(text)`;

	$: tsCode = `import { Nexara } from "nexara-sdk";

const client = new Nexara({ apiKey: "${apiKey}" });

const { text } = await client.transcriptions.create({ file: "audio.mp3" });
console.log(text);`;
	$: tsCodeDisplay = `import { Nexara } from "nexara-sdk";

const client = new Nexara({ apiKey: "${maskedKey}" });

const { text } = await client.transcriptions.create({ file: "audio.mp3" });
console.log(text);`;

	async function copyText(text, id) {
		try {
			await navigator.clipboard.writeText(text);
			copiedId = id;
			setTimeout(() => {
				if (copiedId === id) copiedId = null;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy code:', err);
		}
	}
</script>

<div class="card">
	<div class="top-row">
		<div class="card-header">
			<p class="card-title">{m.db_guide_title()}</p>
		</div>
		<div class="guide-selector">
			<select bind:value={selectedGuide}>
				<option value="python">Python SDK</option>
				<option value="typescript">TypeScript SDK</option>
				<option value="n8n">n8n</option>
			</select>
		</div>
	</div>
	<div style="height: 24px;"></div>

	<div class="guide-content">
		{#if selectedGuide === 'python'}
			<p>{m.db_guide_py_install()}</p>
			<div class="code-block-card">
				<button class="copy-btn-code" on:click={() => copyText(PYTHON_INSTALL, 'py-install')}>
					{#if copiedId === 'py-install'}<Check size={16} />{:else}<Copy size={16} />{/if}
				</button>
				<pre><code>{PYTHON_INSTALL}</code></pre>
			</div>
			<p>{m.db_guide_py_code()}</p>
			<div class="code-block-card">
				<button class="copy-btn-code" on:click={() => copyText(pythonCode, 'py-code')}>
					{#if copiedId === 'py-code'}<Check size={16} />{:else}<Copy size={16} />{/if}
				</button>
				<pre><code>{pythonCodeDisplay}</code></pre>
			</div>
			<p>
				{m.db_guide_done_docs()}
				<a href={DOCS_URL} target="_blank" rel="noopener">{m.db_guide_python_step_2_docs()}</a>
			</p>
		{:else if selectedGuide === 'typescript'}
			<p>{m.db_guide_ts_install()}</p>
			<div class="code-block-card">
				<button class="copy-btn-code" on:click={() => copyText(TS_INSTALL, 'ts-install')}>
					{#if copiedId === 'ts-install'}<Check size={16} />{:else}<Copy size={16} />{/if}
				</button>
				<pre><code>{TS_INSTALL}</code></pre>
			</div>
			<p>{m.db_guide_ts_code()}</p>
			<div class="code-block-card">
				<button class="copy-btn-code" on:click={() => copyText(tsCode, 'ts-code')}>
					{#if copiedId === 'ts-code'}<Check size={16} />{:else}<Copy size={16} />{/if}
				</button>
				<pre><code>{tsCodeDisplay}</code></pre>
			</div>
			<p>
				{m.db_guide_done_docs()}
				<a href={DOCS_URL} target="_blank" rel="noopener">{m.db_guide_python_step_2_docs()}</a>
			</p>
		{:else if selectedGuide === 'n8n'}
			<p>{m.db_guide_n8n_install()}</p>
			<div class="code-block-card">
				<button class="copy-btn-code" on:click={() => copyText(N8N_PACKAGE, 'n8n-pkg')}>
					{#if copiedId === 'n8n-pkg'}<Check size={16} />{:else}<Copy size={16} />{/if}
				</button>
				<pre><code>{N8N_PACKAGE}</code></pre>
			</div>
			<p>{m.db_guide_n8n_credential()}</p>
			<div class="code-block-card">
				<button class="copy-btn-code" on:click={() => copyText(apiKey, 'n8n-key')}>
					{#if copiedId === 'n8n-key'}<Check size={16} />{:else}<Copy size={16} />{/if}
				</button>
				<pre><code>{maskedKey}</code></pre>
			</div>
			<p>{m.db_guide_n8n_usage()}</p>
			<p>
				{m.db_guide_done_docs()}
				<a href={DOCS_URL} target="_blank" rel="noopener">{m.db_guide_n8n_step_4_docs()}</a>
			</p>
		{/if}
	</div>
</div>

<style>
	code {
		font-family: monospace;
	}
	.guide-content {
		display: flex;
		flex-direction: column;
		gap: 16px; /* Spacing between guide elements */
	}

	.guide-content p {
		color: rgba(250, 250, 250, 0.8);
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

	.code-block-card {
		position: relative; /* For positioning the copy button */
		border-radius: 12px;
		padding: 16px;
		border: 1px solid rgba(250, 250, 250, 0.11); /* Default border */
		width: 100%;
		background-color: transparent; /* No background */
		box-sizing: border-box; /* Include padding and border in width */
	}

	.code-block-card pre {
		margin: 0;
		font-family: monospace;
		color: rgba(250, 250, 250, 0.9);
		white-space: pre-wrap; /* Wrap long lines */
		word-break: break-all; /* Break long words/URLs */
		font-size: 14px;
	}

	.copy-btn-code {
		position: absolute;
		top: 12px;
		right: 12px;
		outline: none;
		border: 1px solid rgba(250, 250, 250, 0.11);
		background-color: rgba(250, 250, 250, 0.05);
		padding: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 8px; /* Slightly smaller radius for button */
		cursor: pointer;
		color: rgba(250, 250, 250, 0.7);
	}

	.copy-btn-code:hover {
		background-color: rgba(250, 250, 250, 0.1);
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
		background-color: rgba(250, 250, 250, 0.01);
		backdrop-filter: blur(16px);
		transform: translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)
			skew(0deg, 0deg);
		border-radius: 12px;
		padding: 24px; /* Main card padding */
	}
	.card-title {
		color: rgba(250, 250, 250, 0.5);
		margin: 0;
	}
</style>
