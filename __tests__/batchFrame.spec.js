const fs = require("fs");
const os = require("os");
const path = require("path");
const Module = require("module");
const { execSync } = require("child_process");
const { packetDecode, mapping } = require("../index.js");

/**
 * NanoDAq batch frame (MF-150), added in v0.21.0.
 *
 * The firmware sends it on fPort 3 when the reading period is shorter than the
 * send period: [01][interval 3 B][age 2 B][U][U x (ID + native)][K][K x ID] and
 * N records, oldest -> newest. Reference decoder and tests: firmware-NanoDAq
 * tools/codec/chirpstack_codec.js (decodeLote) and test/decode_batch_test.js.
 *
 * Before v0.21.0 these frames crashed packetDecode with a TypeError (bytes
 * 0x0100/0x0101 read as IDs 256/257, which are not in the mapping). They still
 * do when they are NOT on fPort 3 (plain hex string, fPort 2...): only the
 * fPort 3 path changed.
 */

const DEV_EUI = "ac1f09fffe0c5d58";

// ChirpStack v4 uplink event, as the platform receives it from MQTT (a Buffer).
function chirpstack(hex, fPort, extra = {}) {
  const event = {
    ...(fPort === undefined ? {} : { fPort }),
    data: Buffer.from(hex, "hex").toString("base64"),
    deviceInfo: { devEui: DEV_EUI },
    ...extra,
  };
  return Buffer.from(JSON.stringify(event));
}

function hexN(v, n) {
  return ("0000000000000000" + (v >>> 0).toString(16)).slice(-2 * n);
}
function f32(v) {
  const x = Buffer.alloc(4);
  x.writeFloatBE(v);
  return x.toString("hex");
}
function i16(v) {
  return hexN(v & 0xffff, 2);
}
const NAN = "7fc00000";
const BAT = "0003" + f32(3.6);
function header(interval, age) {
  return "01" + hexN(interval, 3) + hexN(age, 2);
}

describe("batch frame - real NDAI frames from the bench (fPort 3)", () => {
  it("two readings of AI1_f / AI2_f + BatteryMon", () => {
    const out = packetDecode(
      chirpstack("01000014000201000340701b8f02000a000b4180690d000000004180749700000000", 3)
    );
    expect(out.fPort).toBe(3);
    expect(out.deviceInfo.devEui).toBe(DEV_EUI);
    expect(out.json2sense).toEqual({ BatteryMon: "3.7517", AI1_f: "16.0569", AI2_f: "0.0000" });
    expect(out.batch2sense).toEqual({
      interval_s: 20,
      age_s: 2,
      readings: [
        { offset_s: -22, AI1_f: "16.0513", AI2_f: "0.0000" },
        { offset_s: -2, AI1_f: "16.0569", AI2_f: "0.0000" },
      ],
      errors: [],
    });
  });

  it("current rising between the two readings", () => {
    const out = packetDecode(
      chirpstack("0100001400020100034070260a02000a000b40ab17f7000000004141b84400000000", 3)
    );
    expect(out.json2sense).toEqual({ BatteryMon: "3.7523", AI1_f: "12.1075", AI2_f: "0.0000" });
    expect(out.batch2sense.readings.map((r) => r.AI1_f)).toEqual(["5.3467", "12.1075"]);
  });

  it("AI1_f NaN in both readings: omitted from json2sense, null in the readings", () => {
    const out = packetDecode(
      chirpstack("0100001400020100034070250402000a000b7fc00000000000007fc0000000000000", 3)
    );
    expect(out.json2sense).toEqual({ BatteryMon: "3.7523", AI2_f: "0.0000" });
    expect(out.json2sense).not.toHaveProperty("AI1_f");
    expect(out.batch2sense.readings).toEqual([
      { offset_s: -22, AI1_f: null, AI2_f: "0.0000" },
      { offset_s: -2, AI1_f: null, AI2_f: "0.0000" },
    ]);
  });

  it("boot frame: age 0, one record (26 bytes)", () => {
    const out = packetDecode(chirpstack("010000140000010003406a910102000a000b7fc0000000000000", 3));
    expect(out.json2sense).toEqual({ BatteryMon: "3.6651", AI2_f: "0.0000" });
    expect(out.batch2sense).toEqual({
      interval_s: 20,
      age_s: 0,
      readings: [{ offset_s: 0, AI1_f: null, AI2_f: "0.0000" }],
      errors: [],
    });
  });

  it("accepts the frame as a JSON string too", () => {
    const hex = "01000014000201000340701b8f02000a000b4180690d000000004180749700000000";
    expect(packetDecode(chirpstack(hex, 3).toString())).toEqual(packetDecode(chirpstack(hex, 3)));
  });

  it("accepts fport / f_port when fPort is absent", () => {
    const hex = "010000140000010003406a910102000a000b7fc0000000000000";
    const b64 = Buffer.from(hex, "hex").toString("base64");
    for (const field of ["fport", "f_port"]) {
      const out = packetDecode(JSON.stringify({ [field]: 3, data: b64 }));
      expect(out.batch2sense.readings).toHaveLength(1);
    }
  });
});

describe("batch frame - cases ported from the firmware decode_batch_test.js", () => {
  const dec = (hex) => packetDecode(chirpstack(hex, 3));

  it("PT100 (mode 5): 10 readings at 60 s, age 5 s, 25.0 .. 25.9 C", () => {
    let regs = "";
    for (let k = 0; k < 10; k++) regs += i16(250 + k);
    const out = dec(header(60, 5) + "01" + BAT + "01" + "0027" + regs);
    const expected = [];
    for (let k = 0; k < 10; k++) {
      expected.push({ offset_s: -(5 + (9 - k) * 60), Exttemp1: ((250 + k) / 10).toFixed(4) });
    }
    expect(out.batch2sense).toEqual({ interval_s: 60, age_s: 5, readings: expected, errors: [] });
    expect(out.json2sense).toEqual({ BatteryMon: "3.6000", Exttemp1: "25.9000" });
  });

  it("frame of batch_test.cpp (25.6 / 25.7 / -1.0, age 125)", () => {
    const out = dec(header(60, 125) + "01" + BAT + "01" + "0027" + "0100" + "0101" + "fff6");
    expect(out.batch2sense.readings).toEqual([
      { offset_s: -245, Exttemp1: "25.6000" },
      { offset_s: -185, Exttemp1: "25.7000" },
      { offset_s: -125, Exttemp1: "-1.0000" },
    ]);
  });

  it("interval above 65535 s (header 01 01): 86400 s", () => {
    const out = dec(header(86400, 0) + "01" + BAT + "01" + "0027" + "0100" + "0101");
    expect(out.batch2sense.interval_s).toBe(86400);
    expect(out.batch2sense.readings.map((r) => r.offset_s)).toEqual([-86400, 0]);
  });

  it("thermocouple (mode 4): cold junction as unique, saturated age", () => {
    const out = dec(header(60, 65535) + "02" + BAT + "0028" + f32(24.567) + "01" + "0027" + i16(1402) + i16(-15));
    expect(out.json2sense).toEqual({ BatteryMon: "3.6000", Exttemp2: "24.5670", Exttemp1: "-1.5000" });
    expect(out.batch2sense.readings).toEqual([
      { offset_s: -65595, Exttemp1: "140.2000" },
      { offset_s: -65535, Exttemp1: "-1.5000" },
    ]);
    expect(out.batch2sense.errors).toEqual([]);
  });

  it("thermocouple with the cold junction NaN: unique omitted", () => {
    const out = dec(header(60, 0) + "02" + BAT + "0028" + NAN + "01" + "0027" + i16(1402));
    expect(out.json2sense).toEqual({ BatteryMon: "3.6000", Exttemp1: "140.2000" });
    expect(out.batch2sense.errors).toEqual([]);
  });

  it("NDDI (mode 7): state (163), counter (60) and engineering value (185)", () => {
    const out = dec(
      header(30, 2) + "01" + BAT + "03" + "00a3" + "003c" + "00b9" +
        "01" + "00000005" + f32(12.34567) +
        "00" + "fffffffe" + NAN
    );
    expect(out.batch2sense.readings).toEqual([
      { offset_s: -32, IO_ext_board_DI1: "1", IntInp1: "5", EngInp2: "12.3457" },
      { offset_s: -2, IO_ext_board_DI1: "0", IntInp1: "4294967294", EngInp2: null },
    ]);
    expect(out.json2sense).toEqual({ BatteryMon: "3.6000", IO_ext_board_DI1: "0", IntInp1: "4294967294" });
  });

  it("failure 0x8000 and saturation 0x7FFF / 0x8001; DS18B20 with 2 probes", () => {
    const out = dec(header(60, 0) + "01" + BAT + "02" + "0027" + "0028" + "8000" + "7fff" + "8001" + "00fa");
    expect(out.batch2sense.readings).toEqual([
      { offset_s: -60, Exttemp1: null, Exttemp2: "3276.7000" },
      { offset_s: 0, Exttemp1: "-3276.7000", Exttemp2: "25.0000" },
    ]);
  });

  it("newest record with 0x8000: key omitted from json2sense", () => {
    const out = dec(header(60, 0) + "01" + BAT + "01" + "0027" + "00fa" + "8000");
    expect(out.json2sense).toEqual({ BatteryMon: "3.6000" });
  });

  it("SHT21D (mode 2): both compact IDs (15, 16)", () => {
    const out = dec(header(60, 0) + "01" + BAT + "02" + "000f" + "0010" + i16(231) + i16(555));
    expect(out.batch2sense.readings).toEqual([{ offset_s: 0, HTU21DTemp: "23.1000", HTU21DHum: "55.5000" }]);
  });

  it("MPM3801A (mode 1): 62 native float, 61 compact", () => {
    const out = dec(header(60, 0) + "01" + BAT + "02" + "003e" + "003d" + f32(1.2345) + i16(-52));
    expect(out.batch2sense.readings).toEqual([{ offset_s: 0, MPM_press: "1.2345", MPM_temp: "-5.2000" }]);
  });
});

describe("batch frame - truncated or malformed frames never throw", () => {
  const dec = (hex) => packetDecode(chirpstack(hex, 3));

  it("incomplete last record: the whole records + error", () => {
    const out = dec(header(60, 0) + "01" + BAT + "01" + "0027" + "0100" + "0101" + "01");
    expect(out.batch2sense.readings).toEqual([
      { offset_s: -120, Exttemp1: "25.6000" },
      { offset_s: -60, Exttemp1: "25.7000" },
    ]);
    expect(out.batch2sense.errors[0]).toMatch(/incomplete record/);
    expect(out.json2sense).toEqual({ BatteryMon: "3.6000", Exttemp1: "25.7000" });
  });

  it("truncated in the ID list: no reading, uniques kept", () => {
    const out = dec(header(60, 0) + "01" + BAT + "02" + "0027");
    expect(out.batch2sense.readings).toEqual([]);
    expect(out.batch2sense.errors[0]).toMatch(/ID list/);
    expect(out.json2sense).toEqual({ BatteryMon: "3.6000" });
  });

  it("truncated in the header (only 01 00)", () => {
    const out = dec("0100");
    expect(out.json2sense).toEqual({});
    expect(out.batch2sense.readings).toEqual([]);
    expect(out.batch2sense.errors[0]).toMatch(/header/);
  });

  it("truncated inside a unique value", () => {
    const out = dec(header(60, 0) + "01" + "0003" + "4066");
    expect(out.json2sense).toEqual({});
    expect(out.batch2sense.errors[0]).toMatch(/BatteryMon/);
  });

  it("unknown ID in the ID list", () => {
    const out = dec(header(60, 0) + "01" + BAT + "01" + "03e7" + "0100");
    expect(out.batch2sense.readings).toEqual([]);
    expect(out.batch2sense.errors[0]).toMatch(/unknown ID 999/);
    expect(out.json2sense).toEqual({ BatteryMon: "3.6000" });
  });

  it("unknown ID in the uniques", () => {
    const out = dec(header(60, 0) + "01" + "03e7" + "000000" + "01" + "0027" + "0100");
    expect(out.batch2sense.readings).toEqual([]);
    expect(out.batch2sense.errors[0]).toMatch(/unknown ID 999/);
  });

  it("K = 0: no reading, no crash", () => {
    const out = dec(header(60, 0) + "01" + BAT + "00");
    expect(out.json2sense).toEqual({ BatteryMon: "3.6000" });
    expect(out.batch2sense.readings).toEqual([]);
    expect(out.batch2sense.errors).toEqual([]);
  });
});

describe("batch frame - native sizes match the firmware codec table", () => {
  // id: [key, bytes, type] -- CAMPOS of tools/codec/chirpstack_codec.js (firmware 352e653)
  const firmware = {
    1: ["counter", 2, "uint"],
    3: ["BatteryMon", 4, "float"],
    10: ["AI1_f", 4, "float"],
    11: ["AI2_f", 4, "float"],
    15: ["HTU21DTemp", 4, "float"],
    16: ["HTU21DHum", 4, "float"],
    23: ["FreInp0", 2, "uint"],
    58: ["FreInp1", 2, "uint"],
    187: ["FreInp2", 2, "uint"],
    188: ["FreInp3", 2, "uint"],
    39: ["Exttemp1", 4, "float"],
    40: ["Exttemp2", 4, "float"],
    41: ["Exttemp3", 4, "float"],
    42: ["Exttemp4", 4, "float"],
    59: ["IntInp0", 4, "uint"],
    60: ["IntInp1", 4, "uint"],
    189: ["IntInp2", 4, "uint"],
    190: ["IntInp3", 4, "uint"],
    61: ["MPM_temp", 4, "float"],
    62: ["MPM_press", 4, "float"],
    183: ["EngInp0", 4, "float"],
    184: ["EngInp1", 4, "float"],
    185: ["EngInp2", 4, "float"],
    186: ["EngInp3", 4, "float"],
    163: ["IO_ext_board_DI1", 1, "uint"],
    164: ["IO_ext_board_DI2", 1, "uint"],
    165: ["IO_ext_board_DI3", 1, "uint"],
    166: ["IO_ext_board_DI4", 1, "uint"],
    168: ["IO_ext_board_DO1", 1, "uint"],
  };

  for (const [id, [key, bytes, type]] of Object.entries(firmware)) {
    it(`id ${id} => ${key}, ${bytes} bytes, ${type}`, () => {
      expect(mapping[key][0]).toBe(Number(id));
      expect(mapping[key][1]).toBe(bytes);
      expect(mapping[key][3]).toBe(type);
    });
  }
});

// ─── Regression against v0.20.0 (e1c59d8) ────────────────────────────────────
// The old index.js is written to the system temp dir and loaded as a separate
// module (its own mapping), resolving hex2dec/ieee-float from this repo.
function loadLegacy() {
  let src;
  try {
    src = execSync("git show e1c59d8:index.js", {
      cwd: path.join(__dirname, ".."),
      stdio: ["ignore", "pipe", "ignore"],
    }).toString();
  } catch (e) {
    return null;
  }
  const file = path.join(os.tmpdir(), "datacodec-v0.20.0-index.js");
  fs.writeFileSync(file, src);
  const m = new Module(file, module);
  m.filename = file;
  m.paths = module.paths;
  m._compile(src, file);
  return m.exports;
}
const legacy = loadLegacy();

// Outcome of a call: the value, or the kind of error thrown.
function outcome(fn) {
  try {
    return { value: fn() };
  } catch (e) {
    // e.name, not instanceof: the legacy module runs outside the jest sandbox realm.
    return { threw: typeof e === "object" && e !== null ? e.name : String(e) };
  }
}

// Identical to v0.20.0, except where v0.20.0 crashed with a TypeError on an unknown ID:
// since v0.23.0 (MF-215) that frame no longer throws and reports the ID in errors2sense.
function expectLegacyOrFixed(now, old) {
  if (old.threw === "TypeError") {
    expect(now.threw).toBeUndefined();
    expect(now.value.errors2sense).toHaveLength(1);
    expect(now.value.errors2sense[0]).toMatch(/^unknown ID \d+ @byte \d+$/);
  } else {
    expect(now).toEqual(old);
  }
}

(legacy ? describe : describe.skip)("regression - non-batch frames identical to v0.20.0", () => {
  const plain = [
    "0003406a9101000a00000000000b00000000", // legacy NDAI frame
    "000441da6666",
    "0033c1a237ac",
    "801E40E66666801F42366666802044454666802441BB333380253F40000080263F800000802741200000",
    "0003" + f32(3.62) + "00b7" + f32(15.0) + "00b8" + f32(0.0375) + "00b9" + f32(7.5) + "00ba" + f32(0),
    "00a30000a40100b7" + f32(2.5),
    "00bb271000bc0019",
    "00bdee6b280000be000005dc",
    "0001000a" + BAT + "0027" + f32(25.6),
    "0003" + f32(3.6) + "0028" + NAN,
    "02000000",
    "00a30100a400",
    "0027" + "4120",
  ];
  // Batch bytes outside fPort 3 keep the old path: ID 256/257 is unknown there (TypeError
  // up to v0.22.0, errors2sense since v0.23.0).
  const batchBytes = [
    "01000014000201000340701b8f02000a000b4180690d000000004180749700000000",
    "010000140000010003406a910102000a000b7fc0000000000000",
  ];

  for (const hex of plain.concat(batchBytes)) {
    it(`plain hex string ${hex}`, () => {
      expectLegacyOrFixed(outcome(() => packetDecode(hex)), outcome(() => legacy.packetDecode(hex)));
    });

    for (const fPort of [1, 2, 10, undefined]) {
      it(`ChirpStack JSON fPort ${fPort} ${hex}`, () => {
        const msg = chirpstack(hex, fPort, { time: "2026-11-11T12:00:00Z", rxInfo: [{ rssi: -80 }] });
        expectLegacyOrFixed(outcome(() => packetDecode(msg)), outcome(() => legacy.packetDecode(msg)));
      });
    }
  }

  for (const hex of plain) {
    it(`ChirpStack JSON fPort 3, not a batch header: ${hex}`, () => {
      const msg = chirpstack(hex, 3);
      expectLegacyOrFixed(outcome(() => packetDecode(msg)), outcome(() => legacy.packetDecode(msg)));
    });
  }

  it("batch bytes on fPort 2 take the old path: unknown ID 256 reported, no exception (MF-215)", () => {
    const msg = chirpstack(batchBytes[0], 2);
    const out = packetDecode(msg);
    expect(out.json2sense).toEqual({});
    expect(out.errors2sense).toEqual(["unknown ID 256 @byte 0"]);
  });

  it("fPort 3 with a non-zero offset takes the old path", () => {
    const msg = chirpstack(batchBytes[0], 3);
    expectLegacyOrFixed(outcome(() => packetDecode(msg, 4)), outcome(() => legacy.packetDecode(msg, 4)));
  });

  it("other JSON wrappers (payload, uplink_message, params) identical", () => {
    const b64 = Buffer.from("0003406a9101000a00000000000b00000000", "hex").toString("base64");
    for (const obj of [
      { payload: b64 },
      { uplink_message: { frm_payload: b64, f_port: 3 } },
      { data: { uplink_message: { frm_payload: b64 } } },
      { params: { payload: b64 } },
      { json2sense: { temp: "1" } },
    ]) {
      const s = JSON.stringify(obj);
      expectLegacyOrFixed(outcome(() => packetDecode(s)), outcome(() => legacy.packetDecode(s)));
    }
  });
});
