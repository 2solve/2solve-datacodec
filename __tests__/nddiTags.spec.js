const { packetDecode, mapping } = require("../index.js");

/**
 * Tags da shield IOT-NDDI-2602 (NanoDAq) adicionadas na v0.20.0.
 *
 * POR QUE ELAS EXISTEM. A familia de entradas digitais so cobria DOIS canais
 * (FreInp0=23/FreInp1=58, IntInp0=59/IntInp1=60), mas a shield tem QUATRO. O
 * firmware vinha emitindo os canais 3 e 4 em IDs que pertencem a outras
 * grandezas:
 *   - frequencia nos IDs 24/25/26, que sao Vec_en_at_di / Vec_en_re_in /
 *     Vec_en_re_ca e tem TRES bytes. Escrever dois ali desalinha todo o resto
 *     do pacote -- e a causa do "ID desconhecido 63 (0x003F) @byte 6" relatado
 *     pela equipe de teste;
 *   - contagem nos IDs 61/62, que sao MPM_temp / MPM_press, float de 4 bytes.
 *     Mesma largura, entao nao desalinha: so publica numero sem sentido com
 *     nome de pressao e temperatura.
 * FreInp2/3 e IntInp2/3 fecham essa lacuna.
 *
 * EngInp0..3 carregam o valor JA convertido em unidade de engenharia (fator e
 * offset aplicados no dispositivo) -- o caso do medidor de vazao. Antes disso o
 * firmware precisaria sequestrar Exttemp1..4 (39-42) e o servidor rotularia
 * vazao como temperatura em C, sem correcao possivel do lado do dispositivo.
 * A unidade NAO viaja no quadro: ela mora na configuracao do dispositivo.
 *
 * A adicao e ADITIVA: nenhuma tag, ID, tamanho ou tipo existente foi alterado.
 */

// id em 2 bytes big-endian + float32 big-endian
function hexFloat(id, value) {
  const buf = Buffer.alloc(6);
  buf.writeUInt16BE(id, 0);
  buf.writeFloatBE(value, 2);
  return buf.toString("hex");
}

// id em 2 bytes big-endian + inteiro sem sinal de n bytes big-endian
function hexUint(id, value, n) {
  const buf = Buffer.alloc(2 + n);
  buf.writeUInt16BE(id, 0);
  buf.writeUIntBE(value, 2, n);
  return buf.toString("hex");
}

describe("mapping - IDs das tags da NDDI-2602", () => {
  const expected = {
    EngInp0: [183, 4, "float"],
    EngInp1: [184, 4, "float"],
    EngInp2: [185, 4, "float"],
    EngInp3: [186, 4, "float"],
    FreInp2: [187, 2, "uint"],
    FreInp3: [188, 2, "uint"],
    IntInp2: [189, 4, "uint"],
    IntInp3: [190, 4, "uint"],
  };

  for (const [name, [id, len, type]] of Object.entries(expected)) {
    it(`${name} => id ${id}, ${len} bytes, ${type}`, () => {
      expect(mapping[name]).toBeDefined();
      expect(mapping[name][0]).toBe(id);
      expect(mapping[name][1]).toBe(len);
      expect(mapping[name][3]).toBe(type);
    });
  }

  it("nenhum ID novo colide com ID ja existente", () => {
    const contagem = {};
    for (const [nome, def] of Object.entries(mapping)) {
      const id = def[0];
      (contagem[id] = contagem[id] || []).push(nome);
    }
    const colisoes = Object.entries(contagem).filter(([, nomes]) => nomes.length > 1);
    expect(colisoes).toEqual([]);
  });
});

describe("packetDecode - decodifica as tags novas", () => {
  it("EngInp0 no fundo de escala do exemplo de vazao (10000 Hz -> 15 m3/s)", () => {
    const out = packetDecode(hexFloat(183, 15.0)).json2sense;
    expect(Number(out.EngInp0)).toBeCloseTo(15.0, 3);
  });

  it("EngInp1 no ponto baixo do mesmo medidor (25 Hz -> 0.0375 m3/s)", () => {
    const out = packetDecode(hexFloat(184, 0.0375)).json2sense;
    expect(Number(out.EngInp1)).toBeCloseTo(0.0375, 4);
  });

  it("EngInp2 e EngInp3 decodificam float", () => {
    const out = packetDecode(hexFloat(185, 7.5) + hexFloat(186, -1.25)).json2sense;
    expect(Number(out.EngInp2)).toBeCloseTo(7.5, 3);
    expect(Number(out.EngInp3)).toBeCloseTo(-1.25, 3);
  });

  it("FreInp2 e FreInp3 decodificam uint de 2 bytes", () => {
    const out = packetDecode(hexUint(187, 10000, 2) + hexUint(188, 25, 2)).json2sense;
    expect(Number(out.FreInp2)).toBe(10000);
    expect(Number(out.FreInp3)).toBe(25);
  });

  it("IntInp2 e IntInp3 decodificam uint de 4 bytes", () => {
    const out = packetDecode(hexUint(189, 4000000000, 4) + hexUint(190, 1500, 4)).json2sense;
    expect(Number(out.IntInp2)).toBe(4000000000);
    expect(Number(out.IntInp3)).toBe(1500);
  });
});

describe("packetDecode - quadro realista do NanoDAq em modo frequencimetro", () => {
  it("bateria + quatro canais em unidade de engenharia", () => {
    const hex =
      hexFloat(3, 3.62) +      // BatteryMon
      hexFloat(183, 15.0) +
      hexFloat(184, 0.0375) +
      hexFloat(185, 7.5) +
      hexFloat(186, 0.0);
    const out = packetDecode(hex).json2sense;
    expect(Number(out.BatteryMon)).toBeCloseTo(3.62, 2);
    expect(Number(out.EngInp0)).toBeCloseTo(15.0, 3);
    expect(Number(out.EngInp1)).toBeCloseTo(0.0375, 4);
    expect(Number(out.EngInp2)).toBeCloseTo(7.5, 3);
    expect(Number(out.EngInp3)).toBeCloseTo(0.0, 3);
  });

  it("estado digital (163-166) continua convivendo no mesmo quadro", () => {
    const hex = hexUint(163, 0, 1) + hexUint(164, 1, 1) + hexFloat(183, 2.5);
    const out = packetDecode(hex).json2sense;
    expect(Number(out.IO_ext_board_DI1)).toBe(0);
    expect(Number(out.IO_ext_board_DI2)).toBe(1);
    expect(Number(out.EngInp0)).toBeCloseTo(2.5, 3);
  });
});

describe("regressao - os IDs que NAO foram tocados continuam como estavam", () => {
  // Estes quatro sao a armadilha que motivou as tags novas: se algum dia
  // alguem "consertar" a tabela mudando-os para FreInp/IntInp, todo firmware
  // em campo que os use de verdade quebra silenciosamente.
  const intocados = {
    FreInp0: [23, 2, "uint"],
    Vec_en_at_di: [24, 3, "uint"],
    Vec_en_re_in: [25, 3, "uint"],
    Vec_en_re_ca: [26, 3, "uint"],
    FreInp1: [58, 2, "uint"],
    IntInp0: [59, 4, "uint"],
    IntInp1: [60, 4, "uint"],
    MPM_temp: [61, 4, "float"],
    MPM_press: [62, 4, "float"],
    Exttemp1: [39, 4, "float"],
    Exttemp4: [42, 4, "float"],
  };

  for (const [name, [id, len, type]] of Object.entries(intocados)) {
    it(`${name} continua em id ${id}, ${len} bytes, ${type}`, () => {
      expect(mapping[name][0]).toBe(id);
      expect(mapping[name][1]).toBe(len);
      expect(mapping[name][3]).toBe(type);
    });
  }

  it("tag legada temp continua decodificando", () => {
    const out = packetDecode("000441da6666").json2sense;
    expect(Number(out.temp)).toBeCloseTo(27.3, 3);
  });
});
