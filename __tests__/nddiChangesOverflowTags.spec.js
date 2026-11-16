const { packetDecode, mapping } = require("../index.js");

/**
 * NanoDAq NDDI tags 193-200 and unknown-ID tolerance (MF-215), added in v0.23.0.
 *
 * Firmware 0.6.19-dev+ (mapping-lib 0.11.0) sends IO_ext_board_DIn_Changes (193-196,
 * 1 B uint): state changes since the last uplink. Firmware 0.6.21-dev+ (mapping-lib
 * 0.12.0) sends IO_ext_board_DIn_Overflow (197-200, 2 B uint) only after the pulse
 * counter wraps: total = overflow * 2^32 + IntInpN.
 *
 * Before v0.23.0 a frame with any of them crashed packetDecode with a TypeError and
 * the whole uplink was lost. Now an ID that is still unknown stops the decoding,
 * keeps what came before it and reports it in errors2sense, which only appears then.
 */

function hexN(v, n) {
  return ("0000000000000000" + (v >>> 0).toString(16)).slice(-2 * n);
}
function f32(v) {
  const x = Buffer.alloc(4);
  x.writeFloatBE(v);
  return x.toString("hex");
}
function chirpstack(hex, fPort) {
  return Buffer.from(JSON.stringify({ fPort, data: Buffer.from(hex, "hex").toString("base64") }));
}
const BAT = "0003" + f32(3.6);
const tag = (id, v, n) => hexN(id, 2) + hexN(v, n);

describe("mapping - NDDI changes and overflow tags", () => {
  const expected = {
    IO_ext_board_DI1_Changes: [193, 1], IO_ext_board_DI2_Changes: [194, 1],
    IO_ext_board_DI3_Changes: [195, 1], IO_ext_board_DI4_Changes: [196, 1],
    IO_ext_board_DI1_Overflow: [197, 2], IO_ext_board_DI2_Overflow: [198, 2],
    IO_ext_board_DI3_Overflow: [199, 2], IO_ext_board_DI4_Overflow: [200, 2],
  };
  for (const [name, idLen] of Object.entries(expected)) {
    it(`${name} => id ${idLen[0]}, ${idLen[1]} byte(s), uint`, () => {
      expect(mapping[name].slice(0, 2)).toEqual(idLen);
      expect(mapping[name][3]).toBe("uint");
    });
  }
  it("each id 193-200 has exactly one owner", () => {
    for (let id = 193; id <= 200; id++) {
      expect(Object.keys(mapping).filter((k) => mapping[k][0] === id)).toHaveLength(1);
    }
  });
});

describe("simple frame with the NDDI fields", () => {
  it("count + changes + overflow on all four channels", () => {
    const hex = BAT + tag(59, 7, 4) + tag(60, 8, 4) + tag(189, 9, 4) + tag(190, 10, 4) +
      tag(193, 1, 1) + tag(194, 2, 1) + tag(195, 3, 1) + tag(196, 255, 1) +
      tag(197, 1, 2) + tag(198, 2, 2) + tag(199, 3, 2) + tag(200, 65535, 2);
    const out = packetDecode(hex);
    expect(out.errors2sense).toBeUndefined();
    expect(out.json2sense).toEqual({
      BatteryMon: "3.6000", IntInp0: "7", IntInp1: "8", IntInp2: "9", IntInp3: "10",
      IO_ext_board_DI1_Changes: "1", IO_ext_board_DI2_Changes: "2",
      IO_ext_board_DI3_Changes: "3", IO_ext_board_DI4_Changes: "255",
      IO_ext_board_DI1_Overflow: "1", IO_ext_board_DI2_Overflow: "2",
      IO_ext_board_DI3_Overflow: "3", IO_ext_board_DI4_Overflow: "65535",
    });
  });

  it("ChirpStack JSON on fPort 2, field after the new ones still decoded", () => {
    const out = packetDecode(chirpstack(tag(197, 1, 2) + tag(59, 4, 4) + "0027" + f32(25), 2));
    expect(out.fPort).toBe(2);
    expect(out.json2sense).toEqual({ IO_ext_board_DI1_Overflow: "1", IntInp0: "4", Exttemp1: "25.0000" });
  });
});

describe("unknown ID (MF-215)", () => {
  it("does not throw: keeps the fields before it and reports the ID", () => {
    const out = packetDecode(BAT + tag(250, 1, 2) + "0027" + f32(25));
    expect(out.json2sense).toEqual({ BatteryMon: "3.6000" });
    expect(out.errors2sense).toEqual(["unknown ID 250 @byte 6"]);
  });

  it("unknown ID first: empty result, no exception", () => {
    const out = packetDecode(tag(201, 0, 2));
    expect(out.json2sense).toEqual({});
    expect(out.errors2sense).toEqual(["unknown ID 201 @byte 0"]);
  });

  it("ChirpStack JSON keeps its own fields next to the partial result", () => {
    const out = packetDecode(chirpstack(BAT + tag(250, 1, 2), 2));
    expect(out.fPort).toBe(2);
    expect(out.json2sense).toEqual({ BatteryMon: "3.6000" });
    expect(out.errors2sense).toEqual(["unknown ID 250 @byte 6"]);
  });

  it("frames without unknown IDs carry no errors2sense", () => {
    expect(packetDecode(BAT)).not.toHaveProperty("errors2sense");
  });
});

describe("batch frame (fPort 3) with the NDDI fields as single values", () => {
  it("changes and overflow among the single values", () => {
    const frame = "01" + hexN(60, 3) + hexN(5, 2) + "03" + tag(193, 2, 1) + tag(197, 1, 2) + BAT +
      "01" + "0027" + hexN(250, 2);
    const out = packetDecode(chirpstack(frame, 3));
    expect(out.batch2sense.errors).toEqual([]);
    expect(out.json2sense).toEqual({
      IO_ext_board_DI1_Changes: "2", IO_ext_board_DI1_Overflow: "1", BatteryMon: "3.6000", Exttemp1: "25.0000",
    });
  });
});
