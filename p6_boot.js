<script>
/* ---------------- AVVIO ---------------- */
S.step=0;topbar();renderNav();renderHome();
document.body.insertAdjacentHTML('beforeend','<button class="musicfab" data-music aria-label="Spegni la musica">🎵</button>');
document.querySelector('.musicfab').onclick=e=>{e.stopPropagation();if(AUD.on&&AUD.started)musicOff();else musicOn();};
setMusic('app');updMusicBtn();
</script>
</body>
</html>
