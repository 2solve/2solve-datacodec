# 2Solve Decoder Library

Decodes the uplink payloads of 2Solve devices (NanoDAq, FlexDAQ, Smart Water and other 2Sense devices) into named values.
It **only decodes**: there is no encoder, and the device firmware builds the frames.

The payload is a TLV stream with no header, length or CRC: `[ID, 2 bytes big-endian][value, N bytes]`, repeated until
the end. The frame does **not** carry N. The size and type of each value come from the tag table in this library
(`mapping`), which is why the device firmware and this table must agree ID by ID.

| | |
|---|---|
| Repository | [`2solve/software_2solve_decoder_lib`](https://github.com/2solve/software_2solve_decoder_lib) (renamed from `2solve-datacodec` on 2026-11-16; the old URL redirects) |
| npm package | **`@tosolve/datacodec`**: the package name did not change yet |
| Node-RED wrapper | [`2solve/software_node-red_decoder_lib`](https://github.com/2solve/software_node-red_decoder_lib) (npm `@tosolve/node-red-datacodec`, node type `2stools-datacodec`) |
| Used by | the LoRaWAN gateway platform (`mqttGateway.js`) and its Node-RED, the industrial gateway (FlexDAQ) |

---

## Installation

```bash
npm install @tosolve/datacodec
```

---

## Quick Start

```js
const { packetDecode } = require('@tosolve/datacodec');

packetDecode('000441da6666');
// { json2sense: { temp: '27.3000' } }
```

---

## API

### `packetDecode(rawdata, offset?)`

| Parameter | Type             | Default | Description |
|-----------|------------------|---------|-------------|
| `rawdata` | String or Buffer | —       | A hexadecimal string, or a JSON message from the network server (see [Input formats](#input-formats)) |
| `offset`  | Number           | `0`     | Where to start reading, in **hex characters** (2 per byte). Only for plain frames |

**Returns** an object with:

- `json2sense`: one key per decoded tag, `{ tagName: value }`. Values are **strings**: floats with 4 decimals
  (`'27.3000'`), integers as decimal text (`'75'`), `uintHex` as hex text.
- for a JSON input, every field of the input message, unchanged (`fPort`, `deviceInfo`, `time`…), next to `json2sense`.
- `errors2sense` (since v0.23.0): only when the frame has an unknown ID. See [Errors](#errors).
- `batch2sense`: only for the NanoDAq batch frame. See [Batch frame](#nanodaq-batch-frame-fport-3).

```js
// Hex string
packetDecode('0033c1a237ac');
// { json2sense: { GPS_Lat: '-20.2772' } }

// ChirpStack v4 message: the input fields stay, json2sense is added
packetDecode(JSON.stringify({ fPort: 2, data: 'AARB2mZm' }));
// { fPort: 2, data: 'AARB2mZm', json2sense: { temp: '27.3000' } }
```

A JSON input that **already has** `json2sense` is returned as it is, without decoding again.

### `mapping`

The tag table: `{ tagName: [id, byteLength, value, dataType] }`.

```js
const { mapping } = require('@tosolve/datacodec');
mapping.temp; // [4, 4, null, 'float']   (id 4, 4 bytes, float)
```

The third slot (`value`) is overwritten with the last value decoded by `packetDecode`. It is shared by every call, so
do not read decoded values from it: use the returned `json2sense`.

### `mappingKeys`

The tag names, in table order (274 tags in v0.23.0).

```js
const { mappingKeys } = require('@tosolve/datacodec');
mappingKeys.slice(0, 4); // ['ToSenseID', 'counter', 'epoch', 'BatteryMon']
```

---

## Input formats

- A hexadecimal string: `'000441da6666'`.
- A JSON message (string or Buffer) whose payload is **Base64**, in one of these fields:

```json
{ "data": "..." }                                    // ChirpStack v4
{ "payload": "..." }
{ "uplink_message": { "frm_payload": "..." } }       // The Things Stack
{ "data": { "uplink_message": { "frm_payload": "..." } } }
{ "params": { "payload": "..." } }
```

---

## Data types

| Type       | Decoded as |
|------------|------------|
| `uint`     | unsigned integer, big-endian, any size (`uint32_t` is the same) |
| `int16`    | 16-bit signed integer |
| `int32`    | 32-bit signed integer |
| `float`    | IEEE 754 single precision, 4 decimals |
| `uintHex`  | raw bytes as hex text (UIDs, names) |

---

## Tags

| Group             | Tags (examples) |
|-------------------|-----------------|
| Temperature / humidity | `temp`, `HTU21DTemp`, `HTU21DHum`, `Exttemp1`–`Exttemp4` (DS18B20, thermocouple, PT100), `MPM_temp`, `MLX_OBJTemp` |
| Battery           | `BatteryMon`, `BatteryMon_IC`, `BatteryLevel` (estimated charge left, %; 255 = unknown), `BatteryTxDropMv` (voltage drop on the last TX, mV; 65535 = no measure) |
| Analog inputs     | `AI1`, `AI2`, `EAI1`–`EAI5` and their `_f` (float) variants; `AI1_f`/`AI2_f` are the NanoDAq NDAI current and voltage |
| GPS               | `GPS_Lat`, `GPS_Lng`, altitude, speed, satellites |
| Pressure          | `DPS1_I2C_Press`–`DPS4_I2C_Press` (+ `_Temp`), `MPM_press`, `water_Press` |
| Water quality     | pH, turbidity, conductivity, suspended solids (+ standard deviation) |
| Smart Water       | `channel_level`, `pump_press`, `rain_accumulated_mm`, calibration timestamps |
| RFID              | `RC522_UID`, `PN532_UID`, `PN532_NAME` |
| Digital I/O       | `IO_ext_board_DI1`–`DI4`, `IO_ext_board_DO1`–`DO3`, `DI7_ext_board_DI4`–`DI10`, `Relay_stat_DO1`, drain manager `DI1_DM`–`DI8_DM`, `DO1_DM`–`DO14_DM` |
| Pulse / frequency | `FreInp0`–`FreInp3` (Hz), `IntInp0`–`IntInp3` (count), relay and drain manager states |
| NanoDAq NDDI      | `IO_ext_board_DI1_Changes`–`DI4_Changes` (state changes since the last uplink), `IO_ext_board_DI1_Overflow`–`DI4_Overflow` (pulse total high part: total = overflow × 2^32 + count; only sent after a wrap) |
| Engineering units | `EngInp0`–`EngInp3`: value already scaled by the device (e.g. flow); the unit is not in the frame |
| Vibration         | peak frequency, peak acceleration and RMS, X/Y/Z |
| Modbus            | 16- and 32-bit registers, signed, unsigned and float |

The full list is `mappingKeys`. A new tag is **added**, never changed: an ID, size or type that changes would break
every device already in the field.

---

## Errors

These inputs **throw a string** (not an `Error` object):

```js
packetDecode('xyz');                      // "Data format must be a hexadecimal string"
packetDecode('aabbcc', 1.5);              // "Offset format must be a positive integer number"
packetDecode('aabbcc', -1);               // "Wrong offset value"
packetDecode('aabbcc', 100);              // "Wrong offset value"
packetDecode(JSON.stringify({ foo: 1 })); // "Can not find rawdata into received JSON"
```

An **unknown ID** inside a valid frame does not throw (since v0.23.0). Its size is unknown, so nothing after it can be
read: decoding stops there, the values decoded so far are returned and `errors2sense` is added, only in this case:

```js
packetDecode('00034066666600fa0001');
// { json2sense: { BatteryMon: '3.6000' }, errors2sense: ['unknown ID 250 @byte 6'] }
```

Up to v0.22.0 the same frame threw a `TypeError` and the whole uplink was lost.

Known limitation, kept for compatibility: an ID at or above the number of tags (274) and below `0x8000` is not looked
up; the decoder moves one hex character forward and tries again.

---

## NanoDAq batch frame (fPort 3)

Since v0.21.0, `packetDecode` also decodes the NanoDAq batch frame (MF-150): several readings sent in one uplink when
the reading period is shorter than the send period. It is only taken for a **JSON input with `fPort === 3`**
(`fport` / `f_port` are also accepted) whose payload starts with `01 00` or `01 01`. Any other frame, and every plain
hex string, follows the usual path unchanged.

Frame (big-endian): `[0x01][interval s, 3 B][age of the newest record s, 2 B][U][U x (ID 2 B + value)][K][K x ID 2 B]`,
then N records of K values, oldest to newest. Inside the records, IDs 15, 16, 39-42 and 61 go as int16 x 0.1
(`0x8000` = failure); the others keep their size and type from `mapping`. A NaN float is a failure.

The result keeps the input object and adds:

- `json2sense`: the single values (e.g. `BatteryMon`) plus the **newest** record, under the usual keys and formats.
  A failed value is **left out**, so a consumer that stores one value per key keeps the last good one.
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

## Running tests

```bash
npm test
```

Tests use [Jest](https://jestjs.io/) and live in `__tests__/`: `packetDecode.spec.js`, `smartWaterTags.spec.js`,
`nddiTags.spec.js`, `batchFrame.spec.js`, `batteryLevelTags.spec.js` and `nddiChangesOverflowTags.spec.js`.
`batchFrame.spec.js` compares every non-batch frame with v0.20.0 (taken from git history).

Known: 7 tests in `packetDecode.spec.js` fail since before v0.20.0: 5 expect the error texts to be thrown as `Error` objects and 2 expect a result without the `json2sense` wrapper.

---

## Migrating from `2stools-daq`

This package replaced the legacy `2stools-daq`. Same API, only the package name changed:

```bash
npm uninstall 2stools-daq
npm install @tosolve/datacodec
```

```js
const { packetDecode } = require('@tosolve/datacodec'); // was require('2stools-daq')
```

---

## License

ISC © [2Solve Engenharia e Tecnologia](http://www.2solve.com/)
