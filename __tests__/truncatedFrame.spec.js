const { packetDecode, mapping } = require("../index.js");

/**
 * Plain frame checked against the size of each field (MF-29), added in v0.24.0.
 *
 * The frame does not carry the size of a value: it comes from `mapping`. Up to v0.23.0
 * the reading did not check that those bytes existed, so a cut float became a plausible
 * number ('000340' -> BatteryMon 2.0000), a cut uint became a smaller one, 1-2 bytes left
 * at the end were dropped in silence, a repeated ID overwrote the first value, an odd
 * number of hex digits was accepted, and an ID outside the table made the reader move
 * half a byte and read shifted garbage.
 *
 * Now every one of those stops the reading (or skips the repeated value), keeps what was
 * decoded and reports it in errors2sense. Valid frames decode exactly as before.
 */

function f32(v) {
  const x = Buffer.alloc(4);
  x.writeFloatBE(v);
  return x.toString("hex");
}
function thrown(fn) {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return undefined;
}
const BAT = "0003" + f32(3.67);
const chirpstack = (hex, fPort) =>
  Buffer.from(JSON.stringify({ fPort, data: Buffer.from(hex, "hex").toString("base64") }));

describe("cut field", () => {
  it("cut float is not invented: '000340' gives no value", () => {
    const out = packetDecode("000340");
    expect(out.json2sense).toEqual({});
    expect(out.errors2sense).toEqual(["truncated field BatteryMon (ID 3) @byte 0: 3 byte(s) missing"]);
  });

  it("cut uint is not invented: IntInp1 with 3 of 4 bytes", () => {
    const out = packetDecode("003c800000");
    expect(out.json2sense).toEqual({});
    expect(out.errors2sense).toEqual(["truncated field IntInp1 (ID 60) @byte 0: 1 byte(s) missing"]);
  });

  it("fields before the cut one are kept", () => {
    const out = packetDecode(BAT + "0027" + f32(25).slice(0, 4));
    expect(out.json2sense).toEqual({ BatteryMon: "3.6700" });
    expect(out.errors2sense).toEqual(["truncated field Exttemp1 (ID 39) @byte 6: 2 byte(s) missing"]);
  });

  it("an ID with no value at all", () => {
    const out = packetDecode(BAT + "0027");
    expect(out.json2sense).toEqual({ BatteryMon: "3.6700" });
    expect(out.errors2sense).toEqual(["truncated field Exttemp1 (ID 39) @byte 6: 4 byte(s) missing"]);
  });

  it("one byte left at the end is reported, not dropped", () => {
    const out = packetDecode(BAT + "00");
    expect(out.json2sense).toEqual({ BatteryMon: "3.6700" });
    expect(out.errors2sense).toEqual(["truncated ID @byte 6"]);
  });

  it("same rules inside a ChirpStack message", () => {
    const out = packetDecode(chirpstack(BAT + "000340", 2));
    expect(out.fPort).toBe(2);
    expect(out.json2sense).toEqual({ BatteryMon: "3.6700" });
    expect(out.errors2sense).toEqual(["truncated field BatteryMon (ID 3) @byte 6: 3 byte(s) missing"]);
  });
});

describe("repeated ID", () => {
  it("keeps the first value and goes on reading", () => {
    const out = packetDecode(BAT + "0003" + f32(8) + "0027" + f32(25));
    expect(out.json2sense).toEqual({ BatteryMon: "3.6700", Exttemp1: "25.0000" });
    expect(out.errors2sense).toEqual(["duplicate ID 3 (BatteryMon) @byte 6: kept the first value"]);
  });
});

describe("ID outside the table", () => {
  it("an ID above the table size stops with a warning instead of shifting half a byte", () => {
    const out = packetDecode(BAT + "0200" + "00000000");
    expect(out.json2sense).toEqual({ BatteryMon: "3.6700" });
    expect(out.errors2sense).toEqual(["unknown ID 512 @byte 6"]);
  });

  it("a gap inside the table stops the same way", () => {
    const out = packetDecode("00fa0001");
    expect(out.json2sense).toEqual({});
    expect(out.errors2sense).toEqual(["unknown ID 250 @byte 0"]);
  });
});

describe("input format", () => {
  it("an odd number of hex digits is a format error", () => {
    expect(thrown(() => packetDecode("000441da666"))).toBe(
      "Data format must be a hexadecimal string with an even number of digits"
    );
  });

  it("no input gives the format error instead of a TypeError", () => {
    expect(thrown(() => packetDecode())).toBe("Data format must be a hexadecimal string");
    expect(thrown(() => packetDecode(null))).toBe("Data format must be a hexadecimal string");
  });
});

describe("uint32_t", () => {
  it("CH4_INIR_PPM (ID 181, uint32_t) is decoded instead of null", () => {
    expect(mapping.CH4_INIR_PPM.slice(0, 2)).toEqual([181, 4]);
    const out = packetDecode("00b5" + "00010000");
    expect(out.json2sense).toEqual({ CH4_INIR_PPM: "65536" });
    expect(out.errors2sense).toBeUndefined();
  });
});

describe("valid frames are unchanged", () => {
  it("no errors2sense and the usual values", () => {
    const out = packetDecode(BAT + "000a" + f32(12) + "00a301" + "003b00000007");
    expect(out).toEqual({
      json2sense: { BatteryMon: "3.6700", AI1_f: "12.0000", IO_ext_board_DI1: "1", IntInp0: "7" },
    });
  });
});
