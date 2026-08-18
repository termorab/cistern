/*
  cistern-level-card.js
  Added support for reading extra HA values (fuel value, capacity, extra entities)
  and showing them on the card. Keeps previous fixes for gradients and contrast.
  Added features:
   - in-tank percent overlay with automatic contrast inversion
   - label_position option ("inside" or "below") with default "below"
   - show_in_tank_percent option
*/

import { LitElement, html, css } from 'https://unpkg.com/lit@2.7.4/index.js?module';

const CARD_NAME = "Cistern Level Card";
const CARD_VERSION = "1.0.0";
const CARD_TAGLINE = `${CARD_NAME} v${CARD_VERSION}`;

//console.info(CARD_TAGLINE);

console.info(
  `%c${CARD_TAGLINE}`,
  [
    "background: rgba(255,152,0,0.95)",
    "color: #fff",
    "padding: 4px 10px",
    "border-radius: 10px",
    "font-weight: 800",
    "letter-spacing: 0.2px",
    "border: 1px solid rgba(0,0,0,0.25)",
    "box-shadow: 0 1px 0 rgba(0,0,0,0.15)"
  ].join(";")
);

// Card tag + editor tag (reuse everywhere)
const CARD_TAG = "andy-sensor-card";
const EDITOR_TAG = "andy-sensor-card-editor";

class CisternLevelCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      _config: { type: Object },
      _value: { type: Number },
      _unit: { type: String },
      _percent: { type: Number },
      _fuelValue: { type: Number },
      _fuelUnit: { type: String },
      _fuelPercent: { type: Number },
      _extraValues: { type: Array }
    };
  }

  constructor() {
    super();
    this._config = {};
    this._value = null;
    this._unit = "";
    this._percent = 0;
    this._fuelValue = null;
    this._fuelUnit = "";
    this._fuelPercent = null;
    this._extraValues = [];
    this._hass = null;
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error("You must define an entity");
    }
    // defaults
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
      title: "",
      // new options
      fuel_entity: "",
      capacity: null,
      capacity_entity: "",
      show_fuel: true,
      fuel_unit: "",
      fuel_decimals: 0,
      extra_entities: [],
      // new UI options
      show_in_tank_percent: true,
      label_position: 'below' // 'inside' or 'below'
    }, config);
  }

  // --- helpers to read HA state/attrs ---
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

  _getAttribute(entityId, attr, fallback = null) {
    const raw = this._getRawState(entityId);
    if (!raw) return fallback;
    return raw.attributes?.[attr] ?? fallback;
  }

  _getUnit(entityId) {
    const raw = this._getRawState(entityId);
    return this._config.unit || raw?.attributes?.unit_of_measurement || "";
  }

  _fmtVal(v, decimals = 0) {
    if (v == null) return '—';
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v);
    return decimals != null ? Number(n).toFixed(decimals) : String(n);
  }

  set hass(hass) {
    this._hass = hass;

    // main value
    const rawVal = this._getNumber(this._config.entity, null);
    this._value = rawVal;
    this._unit = this._getUnit(this._config.entity);

    // compute main percent (existing behavior)
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

    // fuel value & capacity
    this._fuelValue = null;
    this._fuelUnit = this._config.fuel_unit || "";
    this._fuelPercent = null;

    if (this._config.fuel_entity) {
      const fv = this._getNumber(this._config.fuel_entity, null);
      this._fuelValue = fv;
      if (!this._fuelUnit) {
        this._fuelUnit = this._getAttribute(this._config.fuel_entity, 'unit_of_measurement', this._fuelUnit);
      }
    }

    // capacity: from config, capacity_entity state, or an attribute on capacity_entity
    let capacityVal = null;
    if (this._config.capacity != null) {
      const c = Number(this._config.capacity);
      capacityVal = Number.isFinite(c) ? c : null;
    } else if (this._config.capacity_entity) {
      const cstate = this._getNumber(this._config.capacity_entity, null);
      if (cstate != null) capacityVal = cstate;
      else {
        const attrCap = this._getAttribute(this._config.capacity_entity, 'capacity', null) ?? this._getAttribute(this._config.capacity_entity, 'volume', null);
        if (attrCap != null) {
          const nc = Number(attrCap);
          if (Number.isFinite(nc)) capacityVal = nc;
        }
      }
    }

    // compute fuel percent if possible
    if (this._fuelValue != null && Number.isFinite(Number(capacityVal)) && capacityVal > 0) {
      this._fuelPercent = Math.max(0, Math.min(1, this._fuelValue / capacityVal));
    } else {
      this._fuelPercent = null;
    }

    // extras
    this._extraValues = (this._config.extra_entities || []).map((it) => {
      const ent = String(it.entity || '').trim();
      let v = null;
      if (!ent) return { label: it.label || ent, value: null, unit: it.unit || '' };
      if (it.attribute) v = this._getAttribute(ent, it.attribute, null);
      else v = this._getNumber(ent, null);
      const unit = it.unit || this._getAttribute(ent, 'unit_of_measurement') || '';
      return { label: it.label || ent, value: v, unit, decimals: (typeof it.decimals === 'number') ? it.decimals : 0 };
    });

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
        background: rgba(255,255,255,0.98);
        color: #0f172a;
        padding: 6px 10px;
        border-radius: 8px;
        box-shadow: 0 4px 10px rgba(2,6,23,0.18);
        border: 1px solid rgba(15,23,42,0.06);
        font-family: system-ui, Roboto, "Helvetica Neue", Arial;
        font-size: 13px;
        min-width: 56px;
        text-align: center;
      }

      /* when label_position is below place the label outside the cistern */
      .value-label.below {
        bottom: -16px;
      }

      .in-tank-percent {
        font-family: system-ui, Roboto, Arial;
        font-weight: 700;
        font-size: 18px;
        text-anchor: middle;
      }

      .fuel-box {
        position: absolute;
        left: 12px;
        bottom: 12px;
        background: rgba(255,255,255,0.95);
        color: #0f172a;
        padding: 6px 8px;
        border-radius: 8px;
        box-shadow: 0 3px 8px rgba(2,6,23,0.12);
        font-size: 12px;
        border: 1px solid rgba(15,23,42,0.06);
        min-width: 72px;
      }

      .extras-box {
        position: absolute;
        right: 12px;
        bottom: 12px;
        text-align: right;
        font-size: 12px;
        color: #475569;
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

    // compute in-tank percent text and color
    const showInTank = !!this._config.show_in_tank_percent && levelPercent > 0.01;
    const inTankText = `${Math.round(levelPercent * 100)}%`;
    // choose color for in-tank text for contrast (white on deep water, dark on empty)
    const inTankTextColor = levelPercent > 0.45 ? '#ffffff' : '#0f172a';

    // choose if label is below
    const labelBelow = String(this._config.label_position || 'below').trim().toLowerCase() === 'below';

    return html`
      <div class="card" style="--cistern-width:${w}px; --cistern-height:${h}px;">
        <div class="cistern-wrap" role="img" aria-label="Cistern level ${Math.round(levelPercent * 100)}%">
          <svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="waterGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="${color}" stop-opacity="1" />
                <stop offset="60%" stop-color="${color}" stop-opacity="0.95" />
                <stop offset="100%" stop-color="#013246" stop-opacity="1" />
              </linearGradient>

              <linearGradient id="emptyGrad" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#fbfdfe"/>
                <stop offset="100%" stop-color="#e9f0f4"/>
              </linearGradient>

              <pattern id="emptyHatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
                <rect width="12" height="12" fill="transparent" />
                <path d="M-1,1 l4,-4 M0,12 l12,-12 M11,13 l4,-4" stroke="rgba(0,0,0,0.035)" stroke-width="1"/>
              </pattern>

              <clipPath id="cisternClip"><rect x="18" y="16" rx="10" ry="10" width="${w - 36}" height="${h - 40}" /></clipPath>

              <filter id="innerShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feOffset dx="0" dy="2" result="off"/>
                <feComposite in="off" in2="SourceAlpha" operator="out" result="inner"/>
                <feColorMatrix in="inner" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.25 0" />
                <feBlend in="SourceGraphic" in2="inner" mode="normal"/>
              </filter>
            </defs>

            <!-- cistern shell -->
            <rect x="12" y="12" width="${w - 24}" height="${h - 28}" rx="14" ry="14" fill="${bg}" stroke="#9aa9b6" stroke-width="3" />
            <rect x="${w / 2 - 18}" y="2" width="36" height="16" rx="6" ry="6" fill="${bg}" stroke="#9aa9b6" stroke-width="2" />

            <!-- interior -->
            <g clip-path="url(#cisternClip)">
              <rect x="0" y="0" width="${w}" height="${h}" fill="url(#emptyGrad)" />
              <rect x="0" y="0" width="${w}" height="${waterHeightPx}" fill="url(#emptyGrad)" />
              <rect x="0" y="0" width="${w}" height="${waterHeightPx}" fill="url(#emptyHatch)" opacity="0.18" />
              <rect x="0" y="${waterHeightPx}" width="${w}" height="${h - waterHeightPx}" fill="url(#waterGrad)" />

              <g style="mix-blend-mode: normal;">
                <path class="wave" d="${wave1}" fill="url(#waterGrad)" opacity="1" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
                <path class="wave slow" d="${wave2}" fill="url(#waterGrad)" opacity="0.95" stroke="rgba(0,0,0,0.08)" stroke-width="0.6" />
              </g>

              <rect x="0" y="${Math.max(0, waterHeightPx - 2)}" width="${w}" height="4" fill="rgba(0,0,0,0.06)" />
              <rect x="0" y="${waterHeightPx}" width="${w}" height="${h - waterHeightPx}" fill="transparent" filter="url(#innerShadow)" />

              <!-- in-tank percent text (SVG text for crisp rendering) -->
              ${showInTank ? html`<text class="in-tank-percent" x="${w/2}" y="${Math.max(waterHeightPx + 18, waterHeightPx + (h - waterHeightPx)/2 + 6)}" fill="${inTankTextColor}">${inTankText}</text>` : ''}

            </g>

            <!-- small shine on water top -->
            <ellipse cx="${w / 2}" cy="${Math.max(12, waterHeightPx - 16)}" rx="${Math.max(16, w * 0.07)}" ry="4" fill="rgba(255,255,255,0.25)" />

            <!-- title -->
            <g transform="translate(12, ${h - 28})" fill="#49606f" opacity="0.6"><text x="${w - 48}" y="10" font-size="12" text-anchor="end" font-family="system-ui, Roboto, Arial">${this._config.title ?? ''}</text></g>
          </svg>

          ${this._config.show_value ? html`<div class="value-label ${labelBelow ? 'below' : ''}">${this._value == null ? "unavailable" : `${this._value}${this._unit ? " " + this._unit : ""}`}</div>` : ``}

          ${this._config.show_fuel ? html`
            <div class="fuel-box">
              ${this._fuelValue == null ? html`<div>Fuel: —</div>` : html`<div>Fuel: ${this._fmtVal(this._fuelValue, this._config.fuel_decimals)} ${this._fuelUnit || ''}</div>`}
              ${this._fuelPercent != null ? html`<div style="font-size:11px; color:#64748b;">${Math.round(this._fuelPercent*100)}%</div>` : ''}
            </div>
          ` : ''}

          ${this._extraValues && this._extraValues.length ? html`
            <div class="extras-box">
              ${this._extraValues.map(e => html`<div>${e.label}: ${e.value == null ? '—' : this._fmtVal(e.value, e.decimals)} ${e.unit || ''}</div>`) }
            </div>
          ` : ''}

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
