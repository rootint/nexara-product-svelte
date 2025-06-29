<script>
	import icon from '$lib/assets/icon.png';
	import { BookOpen, LogOut, MessageCircleQuestion, Rss, AudioLines, Home, CreditCard } from 'lucide-svelte';
	import { authStore } from '$lib/stores/auth';
	import * as m from '$lib/paraglide/messages.js';
	import { languageTag } from '$lib/paraglide/runtime';
	import { page } from '$app/stores';

	// Regex to check for root path with optional language prefix
	const rootPathRegex = /^(\/en|\/ru)?\/?$/;
	// Regex to check for playground path with optional language prefix
	const playgroundPathRegex = /^(\/en|\/ru)?\/playground\/?/;
	// Regex to check for billing path with optional language prefix
	const billingPathRegex = /^(\/en|\/ru)?\/billing\/?/;

	async function handleLogout() {
		try {
			await authStore.logout();
		} catch (error) {
			console.error('Failed to logout', error);
		}
	}
</script>

<aside class="sidebar">
	<div class="logo-row">
		<img src={icon} width="21" alt="logo" />
		<p>Innopolis</p>
	</div>
	<div class="main-sections">
		<a href="/" class="section-button" class:selected={rootPathRegex.test($page.url.pathname)}>
			<Home />
			<p
				class:text-selected={rootPathRegex.test($page.url.pathname)}
				class:text-normal={!rootPathRegex.test($page.url.pathname)}
			>
				{m.db_sidebar_main()}
			</p>
		</a>
		<a
			href="/playground"
			class="section-button"
			class:selected={playgroundPathRegex.test($page.url.pathname)}
		>
			<AudioLines />
			<p
				class:text-selected={playgroundPathRegex.test($page.url.pathname)}
				class:text-normal={!playgroundPathRegex.test($page.url.pathname)}
			>
				{m.db_sidebar_playground()}
			</p>
		</a>
		<a href="/billing" class="section-button" class:selected={billingPathRegex.test($page.url.pathname)}>
			<CreditCard />
			<p
				class:text-selected={billingPathRegex.test($page.url.pathname)}
				class:text-normal={!billingPathRegex.test($page.url.pathname)}
			>
				{m.db_sidebar_billing()}
			</p>
		</a>
	</div>
	<div class="bottom-sections">
		<a
			href={languageTag() === 'ru' ? 'https://t.me/nexara_news' : 'https://discord.gg/wuj8dwQKrv'}
			class="section-link-bottom"
		>
			<Rss></Rss>
			<p>{m.db_sidebar_blog()}</p>
		</a>
		<a
			href={languageTag() === 'ru'
				? 'https://docs.nexara.ru/ru/quickstart'
				: 'https://docs.nexara.ru/en/quickstart'}
			class="section-link-bottom"
		>
			<BookOpen></BookOpen>
			<p>{m.db_sidebar_docs()}</p>
		</a>
		<a href="https://t.me/RND_RandoM" class="section-link-bottom">
			<MessageCircleQuestion></MessageCircleQuestion>
			<p>{m.db_sidebar_support()}</p>
		</a>
		<button on:click={handleLogout} class="logout-btn">
			<LogOut></LogOut>
			<p>{m.db_sidebar_logout()}</p>
		</button>
	</div>
</aside>

<style>
    img {
        background-color: #111;
        padding: 4px;
        border-radius: 4px;
    }
	.logout-btn {
		display: flex;
		text-decoration: none;
		gap: 12px;
		padding: 16px 32px;
		background-color: unset;
		border: none;
		font-size: 16px;
		align-items: center;
	}
	.logout-btn:hover {
		text-decoration: underline;
		cursor: pointer;
	}
	.section-link-bottom {
		display: flex;
		text-decoration: none;
		gap: 12px;
		padding: 16px 32px;
	}
	.section-link-bottom:hover {
		text-decoration: underline;
	}
	.bottom-sections {
		border-top: 1px solid rgba(255, 255, 255, 0.11);
		display: flex;
		flex-direction: column;
		grid-row: 3;
		padding-top: 16px;
		padding-bottom: 16px;
	}
	.selected {
		/* background-color: rgba(255, 255, 255, 0.05); */
        background-color: var(--secondary-button);
		border-radius: var(--border-radius);
	}
	.text-selected {
		font-weight: 600;
	}
	.text-normal {
		font-weight: 500;
	}
	.section-button {
		display: flex;
		align-items: center;
		width: 100%;
		text-decoration: none;
		color: inherit;
		padding: 12px;
		border-radius: var(--border-radius);
		margin-bottom: 16px;
		gap: 12px;
	}
	.section-button p {
		margin-left: 0;
	}
	.section-button:hover {
		background-color: var(--secondary-button-hover);
	}
	.main-sections {
		display: flex;
		flex-direction: column;
		padding: 0 20px;
		grid-row: 2;
		overflow-y: auto;
	}
	.logo-row {
		display: flex;
		align-items: center;
		gap: 16px;
		margin-bottom: 16px;
		padding: 24px 32px;
		grid-row: 1;
	}
	.sidebar {
		padding: 0px;
		/* background-color: rgba(255, 255, 255, 0.015); */
        background-color: var(--card-bg-color);
		backdrop-filter: blur(16px);
		transform: translate3d(0px, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)
			skew(0deg, 0deg);
		height: 100vh;
		width: 254px;
		display: grid;
		position: sticky;
		top: 0; /* Stick to the top of the viewport */
		overflow-y: auto;
		max-height: 100vh;
		/* flex-direction: column; */
		grid-template-rows: auto 1fr auto;
		border-right: 1px solid rgba(255, 255, 255, 0.11);
		flex-shrink: 0;
	}
</style>
