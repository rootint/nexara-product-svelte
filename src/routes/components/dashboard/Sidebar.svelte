<script>
	import icon from '$lib/assets/icon.png';
	import { BookOpen, LayoutPanelLeft, LogOut, MessageCircleQuestion, Rss } from 'lucide-svelte';
	import { authStore } from '$lib/stores/auth';

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
		<p>Nexara</p>
	</div>
	<div class="main-sections">
		<div class="section-button selected">
			<LayoutPanelLeft></LayoutPanelLeft>
			<p class="text-selected">Главная</p>
		</div>
	</div>
	<div class="bottom-sections">
		<a href="https://t.me/nexara_news" class="section-link-bottom">
			<Rss></Rss>
			<p>Блог</p>
		</a>
		<a href="https://docs.nexara.ru/docs/quick-start" class="section-link-bottom">
			<BookOpen></BookOpen>
			<p>Документация</p>
		</a>
		<a href="https://t.me/RND_RandoM" class="section-link-bottom">
			<MessageCircleQuestion></MessageCircleQuestion>
			<p>Поддержка</p>
		</a>
		<button on:click={handleLogout} class="logout-btn">
			<LogOut></LogOut>
			<p>Выйти</p>
		</button>
	</div>
</aside>

<style>
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
		background-color: rgba(255, 255, 255, 0.05);
		padding: 12px;
		border-radius: 12px;
	}
	.text-selected {
		font-weight: 450;
		margin-left: 12px;
	}
	.section-button {
		display: flex;
		align-items: center;
		width: 100%;
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
		background-color: rgba(255, 255, 255, 0.015);
		backdrop-filter: blur(24px);
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
