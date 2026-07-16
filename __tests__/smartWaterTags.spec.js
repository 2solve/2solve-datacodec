const { packetDecode, mapping } = require("../index.js");

/**
 * Testes das tags Smart Water adicionadas na v0.19.0 (sólidos suspensos + chuva acumulada).
 * IDs são autoritativos do firmware (utils/mapping.json do software-ic-device_manager):
 *   drainage_Suspended=32850, drainage_Suspended_SD=32851, water_Suspended=32852,
 *   water_Suspended_SD=32853, rain_accumulated_mm=32854.
 * A adição é aditiva: nenhuma tag/ID/tamanho/tipo existente foi alterado.
 */

// Monta os bytes de UMA tag float (id em 2 bytes big-endian + valor float32 big-endian) como hex.
function hexOfTagFloat(id, value) {
  const buf = Buffer.alloc(6);
  buf.writeUInt16BE(id, 0);
  buf.writeFloatBE(value, 2);
  return buf.toString("hex");
}

describe("mapping - IDs das novas tags batem com o firmware (utils/mapping.json)", () => {
  const expected = {
    drainage_Suspended: [32850, 4, "float"],
    drainage_Suspended_SD: [32851, 4, "float"],
    water_Suspended: [32852, 4, "float"],
    water_Suspended_SD: [32853, 4, "float"],
    rain_accumulated_mm: [32854, 4, "float"],
  };

  for (const [name, [id, len, type]] of Object.entries(expected)) {
    it(`${name} => id ${id}, ${len} bytes, ${type}`, () => {
      expect(mapping[name]).toBeDefined();
      expect(mapping[name][0]).toBe(id);
      expect(mapping[name][1]).toBe(len);
      expect(mapping[name][3]).toBe(type);
    });
  }
});

describe("packetDecode - decodifica as novas tags float", () => {
  const cases = [
    ["drainage_Suspended", 32850, 30.1],
    ["drainage_Suspended_SD", 32851, 2.3],
    ["water_Suspended", 32852, 45.6],
    ["water_Suspended_SD", 32853, 1.1],
    ["rain_accumulated_mm", 32854, 12.7],
  ];

  for (const [name, id, value] of cases) {
    it(`decodifica ${name}`, () => {
      const out = packetDecode(hexOfTagFloat(id, value)).json2sense;
      expect(Number(out[name])).toBeCloseTo(value, 3);
    });
  }
});

describe("packetDecode - compatibilidade retroativa preservada", () => {
  it("tag legada temp continua decodificando", () => {
    const out = packetDecode("000441da6666").json2sense;
    expect(Number(out.temp)).toBeCloseTo(27.3, 3);
  });

  it("tag Smart Water existente drainage_PH (32798) continua decodificando", () => {
    const out = packetDecode(hexOfTagFloat(32798, 7.2)).json2sense;
    expect(Number(out.drainage_PH)).toBeCloseTo(7.2, 3);
  });

  it("concatenacao de tag existente + tag nova decodifica ambas", () => {
    const hex = hexOfTagFloat(32798, 7.2) + hexOfTagFloat(32854, 12.7);
    const out = packetDecode(hex).json2sense;
    expect(Number(out.drainage_PH)).toBeCloseTo(7.2, 3);
    expect(Number(out.rain_accumulated_mm)).toBeCloseTo(12.7, 3);
  });
});
