# 2Solve Datacodec

A lightweight data decoding library designed to interpret and convert raw transmission payloads from 2Solve devices. It provides utilities to transform encoded data (such as hexadecimal payloads) into structured and readable formats like JSON, simplifying integration and data processing.

---

## Installation

```bash
npm install @tosolve/datacodec
```

---

## Quick Start

```js
const { packetDecode } = require('@tosolve/datacodec');

const rawData = '000441da6666';
const result = packetDecode(rawData);

console.log(result);
// { temp: '27.3000' }
```

---

## API

### `packetDecode(rawdata, offset?)`

Decodes a raw payload into a structured JSON object.

| Parameter | Type   | Default | Description                                        |
|-----------|--------|---------|----------------------------------------------------|
| `rawdata` | String | —       | Hexadecimal string or Base64-encoded JSON payload  |
| `offset`  | Number | `0`     | Byte offset to start reading from                  |

**Returns:** An object where each key is a sensor name and its value is the decoded reading.

```js
const { packetDecode } = require('@tosolve/datacodec');

// Hex string
packetDecode('000441da6666');
// { temp: '27.3000' }

// With offset
packetDecode('0033c1a237ac', 0);
// { GPS_Lat: '-20.2772' }
```

---

### `mapping`

An object containing all supported sensor definitions. Each entry follows the structure:

```
{ sensorName: [id, byteLength, value, dataType] }
```

```js
const { mapping } = require('@tosolve/datacodec');

console.log(mapping.temp);
// [4, 4, null, 'float']
```

---

### `mappingKeys`

An array of all supported sensor names.

```js
const { mappingKeys } = require('@tosolve/datacodec');

console.log(mappingKeys);
// ['temp', 'hum', 'GPS_Lat', 'GPS_Lng', ...]
```

---

## Supported Input Formats

`packetDecode` accepts the following input formats:

- Raw hexadecimal string — `"000441da6666"`
- Base64-encoded JSON with one of the following payload fields:

```json
{ "payload": "..." }
{ "uplink_message": { "frm_payload": "..." } }
{ "data": { "uplink_message": { "frm_payload": "..." } } }
{ "params": { "payload": "..." } }
```

This makes the library compatible with common LoRaWAN network server formats out of the box.

---

## Supported Data Types

| Type      | Description                        |
|-----------|------------------------------------|
| `uint`    | Unsigned integer                   |
| `int16`   | 16-bit signed integer              |
| `int32`   | 32-bit signed integer              |
| `float`   | IEEE 754 single-precision float    |
| `uintHex` | Unsigned integer as hex string     |

---

## Supported Sensors

The library includes 180+ predefined sensor mappings across the following categories:

| Category          | Examples                                          |
|-------------------|---------------------------------------------------|
| Temperature       | `temp`, `hum`, thermocouple channels              |
| Battery           | `BatteryMon`, `BatteryMon_IC`                     |
| Analog Inputs     | `AI1`–`AI5`, `EAI1`–`EAI5` (float variants)      |
| GPS               | `GPS_Lat`, `GPS_Lng`, altitude, speed, satellites |
| Pressure          | `DPS1`–`DPS4`, water pressure                     |
| Water Quality     | pH, turbidity, conductivity (+ standard deviation)|
| RFID              | `RC522_UID`, `PN532_UID`, `PN532_NAME`            |
| Digital I/O       | `DI1`–`DI10`, `DO1`–`DO14`                       |
| Vibration         | Peak frequency, RMS and peak acceleration X/Y/Z   |
| Modbus Registers  | 16-bit and 32-bit, signed/unsigned/float          |
| Pulse / Relay     | Pulse inputs, relay and drain manager states      |

---

## Advanced Example

```js
const { packetDecode } = require('@tosolve/datacodec');

const rawData =
  '801E40E66666801F42366666802044454666802441BB3333' +
  '80253F40000080263F800000802741200000';

const result = packetDecode(rawData);

// Optionally convert string values to numbers
for (const key in result) {
  result[key] = Number(result[key]);
}

console.log(result);
```

---

## Error Handling

`packetDecode` throws descriptive errors for invalid inputs:

```js
packetDecode('xyz');          // Error: invalid hex format
packetDecode('aabbcc', -1);   // Error: offset must be a non-negative integer
packetDecode('aabbcc', 100);  // Error: offset out of bounds
```

---

## Running Tests

```bash
npm test
```

Tests are written with [Jest](https://jestjs.io/) and located in `__tests__/packetDecode.spec.js`.

---

## Migrating from `2stools-daq`

This package replaces the legacy `2stools-daq` package. The API is fully compatible — only the package name changed.

**1. Uninstall the old package and install the new one:**

```bash
npm uninstall 2stools-daq
npm install @tosolve/datacodec
```

**2. Update your imports:**

```js
// Before
const { packetDecode } = require('2stools-daq');

// After
const { packetDecode } = require('@tosolve/datacodec');
```

No other changes are required.

---

## License

ISC © [2Solve Engenharia e Tecnologia](http://www.2solve.com/)
