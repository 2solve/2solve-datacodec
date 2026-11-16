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
| Battery           | `BatteryMon`, `BatteryMon_IC`, `BatteryLevel` (estimated charge left, %; 255 = unknown), `BatteryTxDropMv` (voltage drop on the last TX, mV; 65535 = no measure) |
| Analog Inputs     | `AI1`–`AI5`, `EAI1`–`EAI5` (float variants)      |
| GPS               | `GPS_Lat`, `GPS_Lng`, altitude, speed, satellites |
| Pressure          | `DPS1`–`DPS4`, water pressure                     |
| Water Quality     | pH, turbidity, conductivity, suspended solids (+ standard deviation)|
| Smart Water       | `channel_level`, `pump_press`, `rain_accumulated_mm`, calibration timestamps |
| RFID              | `RC522_UID`, `PN532_UID`, `PN532_NAME`            |
| Digital I/O       | `DI1`–`DI10`, `DO1`–`DO14`                       |
| Vibration         | Peak frequency, RMS and peak acceleration X/Y/Z   |
| Modbus Registers  | 16-bit and 32-bit, signed/unsigned/float          |
| Pulse / Relay     | Pulse inputs, per-channel frequency and count (`FreInp0`–`FreInp3`, `IntInp0`–`IntInp3`), relay and drain manager states |
| Engineering Units | `EngInp0`–`EngInp3` — device-scaled value per digital input (e.g. flow) |

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

## NanoDAq Batch Frame (fPort 3)

Since v0.21.0, `packetDecode` also decodes the NanoDAq batch frame (MF-150): several readings sent in one uplink when the reading period is shorter than the send period. It is only taken for a **JSON input with `fPort === 3`** (`fport` / `f_port` are also accepted) whose payload starts with `01 00` or `01 01`. Any other frame, and every plain hex string, follows the usual path unchanged.

Frame (big-endian): `[0x01][interval s, 3 B][age of the newest record s, 2 B][U][U x (ID 2 B + value)][K][K x ID 2 B]`, then N records of K values, oldest to newest. Inside the records, IDs 15, 16, 39-42 and 61 go as int16 x 0.1 (`0x8000` = failure); the others keep their size and type from `mapping`. A NaN float is a failure.

The result keeps the input object and adds:

- `json2sense`: the single values (e.g. `BatteryMon`) plus the **newest** record, under the usual keys and formats. A failed value is **left out**, so a consumer that stores one value per key keeps the last good one.
- `batch2sense`: every record, for consumers that store each reading with its own time:

```js
{
  interval_s: 20,
  age_s: 2,
  readings: [
    { offset_s: -22, AI1_f: '16.0513', AI2_f: '0.0000' },  // offset from the uplink time
    { offset_s: -2,  AI1_f: '16.0569', AI2_f: '0.0000' }   // failed value = null
  ],
  errors: []  // truncated/unknown content: decoding stops there, nothing is thrown
}
```

---

## Running Tests

```bash
npm test
```

Tests are written with [Jest](https://jestjs.io/) and located in `__tests__/` (`packetDecode.spec.js`, `smartWaterTags.spec.js`, `nddiTags.spec.js`, `batchFrame.spec.js`).

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
