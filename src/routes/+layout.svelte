<script>
	import './styles.css';
	import Parallax from './components/Parallax.svelte';
</script>

<Parallax></Parallax>

<div class="app">
    <!-- <ScrollableHeader></ScrollableHeader>
	<Header></Header> -->
	<main>
		<slot />
	</main>
	<!-- <Footer /> -->
</div>