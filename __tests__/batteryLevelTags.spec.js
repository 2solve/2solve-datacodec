const { packetDecode, mapping } = require("../index.js");

/**
 * NanoDAq battery level tags (MF-190), added in v0.22.0.
 *
 * Firmware 0.6.18-dev (mapping-lib 0.10.0) can send, right after BatteryMon:
 *   - BatteryLevel    (191, 1 B uint): estimated charge left, % (0..100); 255 = unknown
 *   - BatteryTxDropMv (192, 2 B uint): battery voltage drop on the last TX, mV; 65535 = no measure
 * only when ATC+BATTLEVELTX=1 (off by default). Before v0.22.0 a frame with them
 * crashed packetDecode with a TypeError and the whole uplink was lost (MF-215).
 *
 * The addition is ADDITIVE: no existing tag, ID, size or type changed, and the
 * sentinels are returned as they come, as text like every uint (the platform
 * decides how to show them).
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
const LEVEL = (v) => "00bf" + hexN(v, 1);
const DROP = (v) => "00c0" + hexN(v, 2);

describe("mapping - battery level tags", () => {
  it("BatteryLevel => id 191, 1 byte, uint", () => {
    expect(mapping.BatteryLevel.slice(0, 2)).toEqual([191, 1]);
    expect(mapping.BatteryLevel[3]).toBe("uint");
  });
  it("BatteryTxDropMv => id 192, 2 bytes, uint", () => {
    expect(mapping.BatteryTxDropMv.slice(0, 2)).toEqual([192, 2]);
    expect(mapping.BatteryTxDropMv[3]).toBe("uint");
  });
  it("no other tag uses ids 191 or 192", () => {
    const owners = Object.keys(mapping).filter((k) => mapping[k][0] === 191 || mapping[k][0] === 192);
    expect(owners.sort()).toEqual(["BatteryLevel", "BatteryTxDropMv"]);
  });
});

describe("simple frame with the battery level fields", () => {
  it("battery + level + drop + temperature: every field decoded", () => {
    const out = packetDecode(BAT + LEVEL(75) + DROP(42) + "0027" + f32(25.6)).json2sense;
    expect(out).toEqual({ BatteryMon: "3.6000", BatteryLevel: "75", BatteryTxDropMv: "42", Exttemp1: "25.6000" });
  });

  it("sentinels come as they are: 255 and 65535", () => {
    const out = packetDecode(BAT + LEVEL(255) + DROP(65535) + "000a" + f32(12)).json2sense;
    expect(out.BatteryLevel).toBe("255");
    expect(out.BatteryTxDropMv).toBe("65535");
    expect(out.AI1_f).toBe("12.0000");
  });

  it("only the level (no drop measured yet)", () => {
    const out = packetDecode(BAT + LEVEL(0) + "000b" + f32(4.5)).json2sense;
    expect(out).toEqual({ BatteryMon: "3.6000", BatteryLevel: "0", AI2_f: "4.5000" });
  });

  it("ChirpStack JSON on fPort 2", () => {
    const out = packetDecode(chirpstack(BAT + LEVEL(50) + DROP(150), 2));
    expect(out.fPort).toBe(2);
    expect(out.json2sense).toEqual({ BatteryMon: "3.6000", BatteryLevel: "50", BatteryTxDropMv: "150" });
  });
});

describe("batch frame (fPort 3) with the battery level fields as single values", () => {
  // [01][interval 3 B][age 2 B][U][U x (ID + value)][K][K x ID] + records (Exttemp1 as int16 x 0.1)
  it("level and drop among the single values", () => {
    const frame = "01" + hexN(60, 3) + hexN(5, 2) + "03" + BAT + LEVEL(100) + DROP(0) + "01" + "0027" + hexN(250, 2);
    const out = packetDecode(chirpstack(frame, 3));
    expect(out.batch2sense.errors).toEqual([]);
    expect(out.json2sense).toEqual({ BatteryMon: "3.6000", BatteryLevel: "100", BatteryTxDropMv: "0", Exttemp1: "25.0000" });
    expect(out.batch2sense.readings).toEqual([{ offset_s: -5, Exttemp1: "25.0000" }]);
  });

  it("sentinels in the batch frame (firmware fills 0xFF when there is no value)", () => {
    const frame = "01" + hexN(60, 3) + hexN(5, 2) + "03" + BAT + LEVEL(255) + DROP(65535) + "01" + "0027" + hexN(250, 2);
    const out = packetDecode(chirpstack(frame, 3));
    expect(out.batch2sense.errors).toEqual([]);
    expect(out.json2sense.BatteryLevel).toBe("255");
    expect(out.json2sense.BatteryTxDropMv).toBe("65535");
  });
});
