# Cistern Level Card (custom Lovelace card)

Install:
1. Put cistern-level-card.js in /config/www/
2. Add resource in Lovelace:
   - URL: /local/cistern-level-card.js
   - Type: module

Example card:
```yaml
type: 'custom:cistern-level-card'
entity: sensor.water_tank_level
min: 0
max: 100
height: 240
width: 360
color: '#0ea5a4'
show_value: true
wave_amplitude: 8