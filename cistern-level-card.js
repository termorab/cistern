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
      .value-label {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          bottom: 10px;
          font-weight: 700;
          background: rgba(255,255,255,0.95);
          color: #0f172a; /* dark text */
          padding: 6px 10px;
          border-radius: 8px;
          box-shadow: 0 4px 10px rgba(2,6,23,0.18);
          border: 1px solid rgba(15,23,42,0.06);
          font-family: system-ui, Roboto, "Helvetica Neue", Arial;
          font-size: 13px;
          min-width: 56px;
          text-align: center;
        }
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
        <div class="cistern-wrap" role="img" aria-label="Cistern level ${Math.round(levelPercent * 100)}%">
          <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
            <defs>
                <linearGradient id="emptyGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#f8fbfd"/>
                <stop offset="100%" stop-color="#e6eef3"/>
                </linearGradient>

                <pattern id="emptyHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
                  <rect width="8" height="8" fill="transparent" />
                  <path d="M-1,1 l2,-2 M0,8 l8,-8 M7,9 l2,-2" stroke="rgba(0,0,0,0.06)" stroke-width="1"/>
                </pattern>
            </defs>

            <rect x="12" y="12" width="${w - 24}" height="${h - 28}" rx="14" ry="14" fill="${bg}" stroke="#9aa9b6" stroke-width="3" />
            <rect x="${w / 2 - 18}" y="2" width="36" height="16" rx="6" ry="6" fill="${bg}" stroke="#9aa9b6" stroke-width="2" />

            <g clip-path="url(#cisternClip)">
              <!-- full empty background, so glass / shell is visible -->
              <rect x="0" y="0" width="${w}" height="${h}" fill="url(#emptyGrad)" />

              <!-- Draw the empty area above the water level to visually emphasize empty space -->
              <rect x="0" y="0" width="${w}" height="${waterHeightPx}" fill="url(#emptyGrad)" />

              <!-- Optional subtle hatch overlay on empty area to further separate it -->
              <rect x="0" y="0" width="${w}" height="${waterHeightPx}" fill="url(#emptyHatch)" opacity="0.28" />

              <!-- Water rectangle (only below the water line) -->
              <rect x="0" y="${waterHeightPx}" width="${w}" height="${h - waterHeightPx}" fill="url(#waterGrad)" />

              <!-- Waves on top of the water rectangle, with a thin top highlight stroke -->
              <g style="mix-blend-mode: normal;">
                <path class="wave" d="${wave1}" fill="url(#waterGrad)" opacity="0.95" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
                <path class="wave slow" d="${wave2}" fill="url(#waterGrad)" opacity="0.9" stroke="rgba(0,0,0,0.06)" stroke-width="0.6" />
              </g>

              <!-- Add a subtle top-shade for the water line (faint dark band to accentuate separation) -->
              <rect x="0" y="${Math.max(0, waterHeightPx - 2)}" width="${w}" height="4" fill="rgba(0,0,0,0.04)" />
            </g>

            <ellipse cx="${w / 2}" cy="${waterHeightPx - 16}" rx="${Math.max(16, w * 0.07)}" ry="4" fill="rgba(255,255,255,0.25)" />
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
