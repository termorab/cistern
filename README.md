# Cistern Level Card (Lovelace custom card)

Animated, configurable Lovelace card for Home Assistant that visualizes a cistern/tank with an animated water surface, and supports reading multiple Home Assistant sensors: main level, fuel/volume, capacity, and additional sensors (temperature, probes, etc.).

This README documents installation, configuration options and examples for the updated card.

---

## Installation

1. Copy `cistern_level_card.js` to your Home Assistant `www` folder (e.g. `/config/www/cistern_level_card.js`).
2. In Home Assistant UI go to Configuration → Dashboards → Resources and add a new resource:
   - URL: `/local/cistern_level_card.js`
   - Type: `module`
3. Add the card to a Lovelace view (Manual card or YAML). After updating JS, hard-refresh your browser (Ctrl+F5) to ensure the module reloads.

Note: The card imports Lit from unpkg. If your frontend cannot load external resources, download Lit and point the import at a local copy.

---

## Features

- Animated waves and optional floating bubble.
- Clear visual separation between empty and filled areas (gradient + hatch + inner shadow).
- In-tank percent overlay (auto-contrast: white text when water is dark, dark text when empty) — configurable.
- Option to place the main numeric label inside the tank or below it (`label_position`).
- Read an optional `fuel_entity` and `capacity` (or `capacity_entity`) to compute and display fuel/volume and percentage.
- `extra_entities` to show additional sensor values (temperature, probes, etc.).

---

## Configuration options

All options are set in the Lovelace card configuration. The card requires at minimum `entity` (a numeric sensor). Other options are optional.

Common options
- `entity` (required): main sensor entity id used by the card (numeric).
- `min` (number): minimum sensor value (default: 0).
- `max` (number): maximum sensor value (default: 100).
- `width` (number): rendered width in px (default: 320).
- `height` (number): rendered height in px (default: 220).
- `color` (string): main water color (CSS color) (default: `#0284c7`).
- `bg` (string): cistern background color (default: `#e6eef3`).
- `show_value` (boolean): show main numeric label (default: true).
- `title` (string): small title text shown on the bottom-right inside the SVG.
- `wave_amplitude` (number): wave amplitude in px (default: 8).
- `wave_length` (number): wavelength in px (default: 180).
- `animate` (boolean): enable wave animations (default: true).

Fuel & capacity options
- `fuel_entity` (string): entity id of a separate fuel/volume sensor (e.g. `sensor.tank_volume_l`). If provided, the card will display a small fuel box with the value.
- `capacity` (number): numeric capacity (same unit as `fuel_entity`) used to compute percent.
- `capacity_entity` (string): alternative to `capacity`; if provided the card will try to read the capacity from the state or attributes of this entity.
- `fuel_unit` (string): optional unit override for `fuel_entity` (e.g. `L`). If omitted, the card tries to read the `unit_of_measurement` attribute of `fuel_entity`.
- `fuel_decimals` (number): decimals to format `fuel_entity` (default: 0).
- `show_fuel` (boolean): show the fuel box (default: true).

Display options
- `show_in_tank_percent` (boolean): show the percent value inside the tank (auto-contrast) (default: true).
- `label_position` (string): `"inside"` or `"below"` to position the main numeric label inside the tank or below it (default: `"below"`).
- `extra_entities` (array): an array of objects to display additional values. Each item may include:
  - `label` (string): label to show
  - `entity` (string): entity id
  - `attribute` (string, optional): attribute name to read instead of state
  - `decimals` (number, optional): decimals for formatting
  - `unit` (string, optional): unit text override

---

## Examples

Basic card (show main sensor and in-tank percent):

```yaml
type: 'custom:cistern-level-card'
entity: sensor.water_tank_level
width: 320
height: 220
color: '#0ea5a4'
show_value: true
show_in_tank_percent: true
label_position: 'inside'
```

Fuel + capacity example (show liters and computed percent):

```yaml
type: 'custom:cistern-level-card'
entity: sensor.water_tank_level
fuel_entity: sensor.tank_volume_l
capacity: 1000
show_fuel: true
fuel_unit: 'L'
fuel_decimals: 0
show_in_tank_percent: true
label_position: 'below'
```

extra_entities example (temperature + probe):

```yaml
type: 'custom:cistern-level-card'
entity: sensor.water_tank_level
extra_entities:
  - label: 'Temp'
    entity: sensor.tank_temperature
    decimals: 1
  - label: 'Probe'
    entity: sensor.tank_probe
```

Using `capacity_entity` instead of `capacity`:

```yaml
type: 'custom:cistern-level-card'
entity: sensor.water_tank_level
fuel_entity: sensor.tank_volume_l
capacity_entity: sensor.tank_capacity_sensor
```

If your tank geometry is complex (volume ↔ percent not linear) we recommend computing percent in Home Assistant using a template sensor and passing percent to the card instead of relying on simple linear mapping.

---

## Troubleshooting & tips

- If the card shows `unavailable`, verify the configured entities exist and return numeric states.
- After editing the JS file, do a hard refresh (Ctrl+F5) to ensure the browser reloads the module resource.
- If your HASS frontend blocks `unpkg.com`, download the Lit module and update the import path in `cistern_level_card.js`.
- If you prefer different visuals (label style, darker pill, moved fuel box) you can tweak CSS inside the card file.

---

## License

MIT
