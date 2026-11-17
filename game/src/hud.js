// HUD: DOM overlay (HP, wave, score, ember, blessings, boss bar, banners,
// title / blessing / pause / game-over / victory screens). It never owns game
// rules — the game calls these methods with plain values.
export class HUD {
  constructor() {
    this.el = {
      hud: document.getElementById('hud'),
      hpFill: document.getElementById('hp-fill'),
      hpText: document.getElementById('hp-text'),
      shield: document.getElementById('shield-text'),
      wave: document.getElementById('wave-text'),
      score: document.getElementById('score-text'),
      ember: document.getElementById('ember-text'),
      kills: document.getElementById('kills-text'),
      blessings: document.getElementById('blessing-icons'),
      bossWrap: document.getElementById('boss-wrap'),
      bossFill: document.getElementById('boss-fill'),
      bossName: document.getElementById('boss-name'),
      banner: document.getElementById('banner'),
      overlay: document.getElementById('overlay'),
      title: document.getElementById('screen-title'),
      blessing: document.getElementById('screen-blessing'),
      pause: document.getElementById('screen-pause'),
      gameover: document.getElementById('screen-gameover'),
      victory: document.getElementById('screen-victory'),
      best: document.getElementById('best-score'),
      blessingCards: document.getElementById('blessing-cards'),
      finalStats: document.getElementById('final-stats'),
      victoryStats: document.getElementById('victory-stats'),
      muteBtn: document.getElementById('mute-btn'),
    };
    this._bannerTimer = 0;
  }

  showHud(show) { this.el.hud.style.display = show ? 'block' : 'none'; }

  update({ hp, maxHp, shield, wave, score, ember, kills, blessings }) {
    const pct = Math.max(0, hp / maxHp) * 100;
    this.el.hpFill.style.width = pct + '%';
    this.el.hpFill.classList.toggle('low', pct < 30);
    this.el.hpText.textContent = `${Math.ceil(hp)} / ${maxHp}`;
    this.el.shield.textContent = shield > 0 ? `⬢ ${Math.ceil(shield)}` : '';
    this.el.wave.textContent = `WAVE ${wave} / 10`;
    this.el.score.textContent = score.toLocaleString('en-US');
    this.el.ember.textContent = ember.toLocaleString('en-US');
    this.el.kills.textContent = kills;
    this.el.blessings.textContent = blessings.map((b) => b.icon).join(' ');
    this.el.blessings.title = blessings.map((b) => b.name).join(', ');
  }

  boss(show, name = '', frac = 1) {
    this.el.bossWrap.style.display = show ? 'block' : 'none';
    if (show) {
      this.el.bossName.textContent = name;
      this.el.bossFill.style.width = Math.max(0, frac * 100) + '%';
    }
  }

  banner(text, sub = '', ms = 1800) {
    const b = this.el.banner;
    b.innerHTML = `<div class="banner-title">${text}</div>${sub ? `<div class="banner-sub">${sub}</div>` : ''}`;
    b.classList.add('show');
    clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => b.classList.remove('show'), ms);
  }

  showScreen(name) {
    for (const key of ['title', 'blessing', 'pause', 'gameover', 'victory']) {
      this.el[key].style.display = key === name ? 'flex' : 'none';
    }
    this.el.overlay.style.display = name ? 'flex' : 'none';
  }

  setBest(score) { this.el.best.textContent = score.toLocaleString('en-US'); }

  blessingChoices(choices, onPick) {
    const wrap = this.el.blessingCards;
    wrap.innerHTML = '';
    choices.forEach((b, i) => {
      const card = document.createElement('button');
      card.className = 'blessing-card';
      card.innerHTML = `<div class="b-icon">${b.icon}</div><div class="b-name">${b.name}</div><div class="b-desc">${b.desc}</div><div class="b-key">[${i + 1}]</div>`;
      card.addEventListener('click', () => onPick(b));
      wrap.appendChild(card);
    });
  }

  stats(stats) {
    return [
      ['Score', stats.score.toLocaleString('en-US')],
      ['Wave reached', String(stats.wave)],
      ['Kills', String(stats.kills)],
      ['Ember collected', String(stats.ember)],
      ['Time', formatTime(stats.time)],
      ['Blessings', String(stats.blessings)],
    ].map(([k, v]) => `<div class="stat-row"><span>${k}</span><b>${v}</b></div>`).join('');
  }

  gameOver(stats) { this.el.finalStats.innerHTML = this.stats(stats); }
  victory(stats) { this.el.victoryStats.innerHTML = this.stats(stats); }
}

export function formatTime(s) {
  const m = Math.floor(s / 60), ss = Math.floor(s % 60);
  return `${m}:${String(ss).padStart(2, '0')}`;
}
