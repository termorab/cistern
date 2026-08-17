/* cistern_level_card.js - corrected Lit import and hass handling */
import { LitElement, html, css } from 'https://unpkg.com/lit@2.7.4/index.js?module';

class CisternLevelCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      _config: { type: Object },
      _value: { type: Number },
      _unit: { type: String },
      _percent: { type: Number }
    };
  }

  constructor() {
    super();
    this._config = {};
    this._value = null;
    this._unit = "";
    this._percent = 0;
    this._hass = null;
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error("You must define an entity");
    }
    this._config = Object.assign({
      min: 0,
      max: 100,
      height: 220,
      width: 320,
      color: "#0284c7",
      bg: "#e6eef3",
      show_value: true,
      wave_amplitude: 8,
      wave_length: 180,
      animate: true,
      title: ""
    }, config);
  }

  _getRawState(entityId) {
    return this._hass?.states?.[entityId] ?? null;
  }

  _getStateValue(entityId) {
    const s = this._getRawState(entityId);
    return s ? s.state : null;
  }

  _getNumber(entityId, fallback = null) {
    const v = this._getStateValue(entityId);
    if (v == null) return fallback;
    const n = Number(String(v).trim());
    return Number.isFinite(n) ? n : fallback;
  }

  _getUnit(entityId) {
    const raw = this._getRawState(entityId);
    return this._config.unit || raw?.attributes?.unit_of_measurement || "";
  }

  set hass(hass) {
    this._hass = hass;
    const rawVal = this._getNumber(this._config.entity, null);
    this._value = rawVal;
    this._unit = this._getUnit(this._config.entity);
    const min = Number(this._config.min);
    const max = Number(this._config.max);
    if (rawVal == null) {
      this._percent = 0;
    } else if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) {
      this._percent = 0;
    } else {
      let p = (rawVal - min) / (max - min);
      if (Number.isNaN(p)) p = 0;
      p = Math.max(0, Math.min(1, p));
      this._percent = p;
    }
    this.requestUpdate();
  }

  getCardSize() {
    return Math.ceil((this._config.height || 220) / 50);
  }

  static get styles() {
    return css`
      :host { display:block; box-sizing: border-box; }
      .card { width:100%; height:100%; box-sizing:border-box; display:flex; align-items:center; justify-content:center; padding:8px; }
      .cistern-wrap { width: var(--cistern-width,320px); height: var(--cistern-height,220px); position:relative; }
      .value-label { position:absolute; left:50%; transform:translateX(-50%); bottom:8px; font-weight:600; background: rgba(255,255,255,0.85); padding:4px 8px; border-radius:6px; box-shadow:0 2px 6px rgba(0,0,0,0.12); font-family:system-ui, Roboto, Arial; }
      .wave { animation: waveMove 6s linear infinite; }
      .wave.slow { animation-duration: 10s; }
      @keyframes waveMove { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      .bubble { animation: floatUp 6s ease-in-out infinite; }
      @keyframes floatUp { 0% { transform:translateY(0) translateX(0); opacity:0.9; } 50% { transform:translateY(-10px) translateX(6px); opacity:1; } 100% { transform:translateY(0) translateX(0); opacity:0.9; } }
    `;
  }

  _makeWavePath(width, height, amplitude, wavelength, offsetX, waterY) {
    const segments = Math.max(4, Math.ceil(width / wavelength * 8));
    const segW = (width * 2) / segments;
    let path = `M ${-width} ${waterY}`;
    for (let i = 0; i <= segments; i++) {
      const x = -width + i * segW + (offsetX || 0);
      const theta = (i / segments) * Math.PI * 2;
      const y = waterY + Math.sin(theta) * amplitude;
      path += ` L ${x} ${y}`;
    }
    path += ` L ${width + 100} ${height} L ${-width - 100} ${height} Z`;
    return path;
  }

  render() {
    const w = Number(this._config.width) || 320;
    const h = Number(this._config.height) || 220;
    const color = this._config.color || "#0284c7";
    const bg = this._config.bg || "#e6eef3";
    const amplitude = Number(this._config.wave_amplitude) || 8;
    const wavelength = Number(this._config.wave_length) || 180;
    const levelPercent = Math.max(0, Math.min(1, this._percent ?? 0));
    const waterHeightPx = Math.round(h * (1 - levelPercent));
    const wave1 = this._makeWavePath(w, h, amplitude, wavelength, 0, waterHeightPx + 6);
    const wave2 = this._makeWavePath(w, h, amplitude * 0.6, wavelength * 0.8, 40, waterHeightPx + 4);

    return html`
      <div class="card" style="--cistern-width:${w}px; --cistern-height:${h}px;">
        <div class="cistern-wrap" role="img" aria-label="Cistern level ${Math.round(levelPercent*100)}%">
          <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="waterGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="${color}" stop-opacity="0.95" />
                <stop offset="70%" stop-color="${color}" stop-opacity="0.85" />
                <stop offset="100%" stop-color="#0f172a" stop-opacity="0.35" />
              </linearGradient>
              <clipPath id="cisternClip"><rect x="18" y="16" rx="10" ry="10" width="${w - 36}" height="${h - 40}" /></clipPath>
            </defs>

            <rect x="12" y="12" width="${w - 24}" height="${h - 28}" rx="14" ry="14" fill="${bg}" stroke="#9aa9b6" stroke-width="3" />
            <rect x="${w/2 - 18}" y="2" width="36" height="16" rx="6" ry="6" fill="${bg}" stroke="#9aa9b6" stroke-width="2" />

            <g clip-path="url(#cisternClip)">
              <rect x="0" y="0" width="${w}" height="${h}" fill="url(#waterGrad)" opacity="0.92" />
              <g style="mix-blend-mode: soft-light;">
                <path class="wave" d="${wave1}" fill="${color}" opacity="0.28" />
                <path class="wave slow" d="${wave2}" fill="${color}" opacity="0.36" />
              </g>

              ${levelPercent > 0.02 ? html`<g class="bubble" transform="translate(${w * 0.65}, ${waterHeightPx - 8})"><circle cx="0" cy="0" r="6" fill="rgba(255,255,255,0.85)" opacity="0.9"/><circle cx="-1" cy="-1" r="2.8" fill="rgba(255,255,255,0.98)"/></g>` : ``}
            </g>

            <ellipse cx="${w/2}" cy="${waterHeightPx - 16}" rx="${Math.max(16, w * 0.07)}" ry="4" fill="rgba(255,255,255,0.25)" />
            <g transform="translate(12, ${h - 28})" fill="#49606f" opacity="0.6"><text x="${w - 48}" y="10" font-size="12" text-anchor="end" font-family="system-ui, Roboto, Arial">${this._config.title ?? ''}</text></g>
          </svg>

          ${this._config.show_value ? html`<div class="value-label">${this._value == null ? "unavailable" : `${this._value}${this._unit ? " " + this._unit : ""}`}</div>` : ``}
        </div>
      </div>
    `;
  }
}

customElements.define('cistern-level-card', CisternLevelCard);

if (window.customCards) {
  window.customCards.push({
    type: "cistern-level-card",
    name: "Cistern Level Card",
    preview: true,
    description: "Animated cistern/tank level card"
  });
}
