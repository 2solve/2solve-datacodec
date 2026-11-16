const { packetDecode } = require("../index.js");

// The library throws plain strings, not Error objects, so each test catches the value
// itself. The old version read e.message inside a try/catch, which passed when nothing
// was thrown and failed when a string was (fixed in v0.24.0).
function thrown(fn) {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return undefined;
}

describe("packetDecode function", () => {
  it("should throw error 'Data format must be a hexadecimal string' when no parameters be passed", () => {
    expect(thrown(() => packetDecode())).toBe("Data format must be a hexadecimal string");
  });

  it("should throw error 'Data format must be a hexadecimal string'", () => {
    expect(thrown(() => packetDecode("AARB2mZm"))).toBe("Data format must be a hexadecimal string");
  });

  it("should throw error 'Offset format must be a positive integer number'", () => {
    expect(thrown(() => packetDecode("000441da6666", "20"))).toBe("Offset format must be a positive integer number");
  });

  it("should throw error 'Wrong offset value' when invalid offset amount be passed", () => {
    expect(thrown(() => packetDecode("000441da6666", 20))).toBe("Wrong offset value");
  });

  it("should throw error 'Wrong offset value' when negative offset value be passed", () => {
    expect(thrown(() => packetDecode("000441da6666", -1))).toBe("Wrong offset value");
  });

  it("should return decoded object from data even without offset parameter", () => {
    expect(packetDecode("000441da6666")).toEqual({ json2sense: { temp: "27.3000" } });
  });

  it("should return decoded object from data", () => {
    expect(packetDecode("000441da6666", 0)).toEqual({ json2sense: { temp: "27.3000" } });
    expect(packetDecode("0033c1a237ac", 0)).toEqual({ json2sense: { GPS_Lat: "-20.2772" } });
  });
});
