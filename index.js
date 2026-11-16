const { hexToDec } = require("hex2dec");
const { readFloatBE } = require("ieee-float");

function isJson(str) {
    try {
        var obg = JSON.parse(str);
        return (typeof obg === 'object' && typeof str === 'string');
    } catch (err) {
        return false;
    }
}

// Sensors list
exports.mapping = {
    ToSenseID: [0, 2, null, "uint"],
    counter: [1, 2, null, "uint"],
    epoch: [2, 4, null, "uint"],
    BatteryMon: [3, 4, null, "float"],
    temp: [4, 4, null, "float"],
    AI1: [5, 3, null, "uint"],
    AI2: [6, 3, null, "uint"],
    EAI3: [7, 3, null, "uint"],
    EAI4: [8, 3, null, "uint"],
    EAI5: [9, 3, null, "uint"],
    AI1_f: [10, 4, null, "float"],
    AI2_f: [11, 4, null, "float"],
    EAI3_f: [12, 4, null, "float"],
    EAI4_f: [13, 4, null, "float"],
    EAI5_f: [14, 4, null, "float"],
    HTU21DTemp: [15, 4, null, "float"],
    HTU21DHum: [16, 4, null, "float"],
    RC522_UID_size: [17, 1, null, "uint"],
    RC522_UID: [18, 10, null, "uintHex"],
    angleX_f: [19, 4, null, "float"],
    angleY_f: [20, 4, null, "float"],
    Dilnp0: [21, 2, null, "uint"],
    Pullnp0: [22, 8, null, "uint"],
    FreInp0: [23, 2, null, "uint"],
    Vec_en_at_di: [24, 3, null, "uint"],
    Vec_en_re_in: [25, 3, null, "uint"],
    Vec_en_re_ca: [26, 3, null, "uint"],
    ModMasterNode1: [27, 2, null, "uint"],
    ModMasterNode2: [28, 2, null, "uint"],
    ModMasterNode3: [29, 2, null, "uint"],
    ModMasterNode4: [30, 2, null, "uint"],
    ModMasterNode5: [31, 2, null, "uint"],
    ModMasterNode6: [32, 2, null, "uint"],
    ModMasterNode7: [33, 2, null, "uint"],
    ModMasterNode8: [34, 2, null, "uint"],
    ModMasterNode9: [35, 2, null, "uint"],
    ModMasterNode10: [36, 2, null, "uint"],
    PN532_UID_size: [37, 1, null, "uint"],
    PN532_UID: [38, 10, null, "uintHex"],
    Exttemp1: [39, 4, null, "float"],
    Exttemp2: [40, 4, null, "float"],
    Exttemp3: [41, 4, null, "float"],
    Exttemp4: [42, 4, null, "float"],
    DPS1_I2C_Temp: [43, 4, null, "float"],
    DPS1_I2C_Press: [44, 4, null, "float"],
    DPS2_I2C_Temp: [45, 4, null, "float"],
    DPS2_I2C_Press: [46, 4, null, "float"],
    DPS3_I2C_Temp: [47, 4, null, "float"],
    DPS3_I2C_Press: [48, 4, null, "float"],
    DPS4_I2C_Temp: [49, 4, null, "float"],
    DPS4_I2C_Press: [50, 4, null, "float"],
    GPS_Lat: [51, 4, null, "float"],
    GPS_Lng: [52, 4, null, "float"],
    GPS_sat: [53, 1, null, "uint"],
    GPS_alt: [54, 4, null, "float"],
    GPS_kmph: [55, 4, null, "float"],
    Dilnp1: [56, 2, null, "uint"],
    Pullnp1: [57, 8, null, "uint"],
    FreInp1: [58, 2, null, "uint"],
    IntInp0: [59, 4, null, "uint"],
    IntInp1: [60, 4, null, "uint"],
    MPM_temp: [61, 4, null, "float"],
    MPM_press: [62, 4, null, "float"],
    APDS_Red: [63, 2, null, "uint"],
    APDS_Blue: [64, 2, null, "uint"],
    APDS_Green: [65, 2, null, "uint"],
    APDS_Clear: [66, 2, null, "uint"],
    MLX_OBJTemp: [67, 4, null, "float"],
    MLX_AMBTemp: [68, 4, null, "float"],
    resetCause: [69, 1, null, "uint"],
    vibr_peak_freq: [70, 4, null, "float"],
    vibr_peak_accel: [71, 4, null, "float"],
    vibr_accel_rms: [72, 4, null, "float"],
    vibr_vel_rms: [73, 4, null, "float"],
    vibr_disp_rms: [74, 4, null, "float"],
    LIDARLiteDist: [75, 2, null, "uint"],
    kx_ax: [76, 4, null, "float"],
    kx_ay: [77, 4, null, "float"],
    kx_az: [78, 4, null, "float"],
    kx_vibr_peak_freq: [79, 4, null, "float"],
    kx_vibr_peak_accel: [80, 4, null, "float"],
    kx_vibr_accel_rms: [81, 4, null, "float"],
    kx_vibr_vel_rms: [82, 4, null, "float"],
    kx_vibr_disp_rms: [83, 4, null, "float"],
    nansenID: [84, 5, null, "uint"],
    Vec_en_at_rev: [85, 3, null, "uint"],
    dsm_concentration: [86, 4, null, "float"],
    ModMasterNode1_32: [87, 4, null, "uint"],
    ModMasterNode2_32: [88, 4, null, "uint"],
    ModMasterNode3_32: [89, 4, null, "uint"],
    ModMasterNode4_32: [90, 4, null, "uint"],
    ModMasterNode5_32: [91, 4, null, "uint"],
    ModMasterNode6_32: [92, 4, null, "uint"],
    ModMasterNode7_32: [93, 4, null, "uint"],
    ModMasterNode8_32: [94, 4, null, "uint"],
    ModMasterNode9_32: [95, 4, null, "uint"],
    ModMasterNode10_3D: [96, 4, null, "uint"],
    PulseInp: [97, 8, null, "uint"],
    PulseInp1: [98, 8, null, "uint"],
    ModMasterNode1Signed: [99, 2, null, "int16"],
    ModMasterNode2Signed: [100, 2, null, "int16"],
    ModMasterNode3Signed: [101, 2, null, "int16"],
    ModMasterNode4Signed: [102, 2, null, "int16"],
    ModMasterNode5Signed: [103, 2, null, "int16"],
    ModMasterNode6Signed: [104, 2, null, "int16"],
    ModMasterNode7Signed: [105, 2, null, "int16"],
    ModMasterNode8Signed: [106, 2, null, "int16"],
    ModMasterNode9Signed: [107, 2, null, "int16"],
    ModMasterNode10Signed: [108, 2, null, "int16"],
    ModMasterNode1Signed_32: [109, 4, null, "int32"],
    ModMasterNode2Signed_32: [110, 4, null, "int32"],
    ModMasterNode3Signed_32: [111, 4, null, "int32"],
    ModMasterNode4Signed_32: [112, 4, null, "int32"],
    ModMasterNode5Signed_32: [113, 4, null, "int32"],
    ModMasterNode6Signed_32: [114, 4, null, "int32"],
    ModMasterNode7Signed_32: [115, 4, null, "int32"],
    ModMasterNode8Signed_32: [116, 4, null, "int32"],
    ModMasterNode9Signed_32: [117, 4, null, "int32"],
    ModMasterNode10Signed_32: [118, 4, null, "int32"],
    ModMasterNode1Float_32: [119, 4, null, "float"],
    ModMasterNode2Float_32: [120, 4, null, "float"],
    ModMasterNode3Float_32: [121, 4, null, "float"],
    ModMasterNode4Float_32: [122, 4, null, "float"],
    ModMasterNode5Float_32: [123, 4, null, "float"],
    ModMasterNode6Float_32: [124, 4, null, "float"],
    ModMasterNode7Float_32: [125, 4, null, "float"],
    ModMasterNode8Float_32: [126, 4, null, "float"],
    ModMasterNode9Float_32: [127, 4, null, "float"],
    ModMasterNode10Float_32: [128, 4, null, "float"],
    IO_ext: [129, 2, null, "uint"],
    EAI1: [130, 3, null, "uint"],
    EAI2: [131, 3, null, "uint"],
    EAI1_f: [132, 4, null, "float"],
    EAI2_f: [133, 4, null, "float"],
    Thermocouple_0: [134, 4, null, "float"],
    Thermocouple_1: [135, 4, null, "float"],
    Thermocouple_2: [136, 4, null, "float"],
    Thermocouple_3: [137, 4, null, "float"],
    PowerMon: [151, 4, null, "float"],
    version: [152, 1, null, "uint"],
    vibr_peak_freq_Y: [153, 4, null, "float"],
    vibr_peak_accel_Y: [154, 4, null, "float"],
    vibr_accel_rms_Y: [155, 4, null, "float"],
    vibr_vel_rms_Y: [156, 4, null, "float"],
    vibr_disp_rms_Y: [157, 4, null, "float"],
    vibr_peak_freq_Z: [158, 4, null, "float"],
    vibr_peak_accel_Z: [159, 4, null, "float"],
    vibr_accel_rms_Z: [160, 4, null, "float"],
    vibr_vel_rms_Z: [161, 4, null, "float"],
    vibr_disp_rms_Z: [162, 4, null, "float"],
    IO_ext_board_DI1: [163, 1, null, "uint"],
    IO_ext_board_DI2: [164, 1, null, "uint"],
    IO_ext_board_DI3: [165, 1, null, "uint"],
    IO_ext_board_DI4: [166, 1, null, "uint"],
    PN532_NAME: [167, 20, null, "uintHex"],
    IO_ext_board_DO1: [168, 1, null, "uint"],
    IO_ext_board_DO2: [169, 1, null, "uint"],
    IO_ext_board_DO3: [170, 1, null, "uint"],
    timed: [171, 4, null, "float"],
    Sig_Quality: [172, 4, null, "float"],
    DI7_ext_board_DI4: [173, 1, null, "uint"],
    DI7_ext_board_DI5: [174, 1, null, "uint"],
    DI7_ext_board_DI6: [175, 1, null, "uint"],
    DI7_ext_board_DI7: [176, 1, null, "uint"],
    DI7_ext_board_DI8: [177, 1, null, "uint"],
    DI7_ext_board_DI9: [178, 1, null, "uint"],
    DI7_ext_board_DI10: [179, 1, null, "uint"],
    Relay_stat_DO1: [180, 1, null, "uint"],
    CH4_INIR_PPM: [181, 4, null, "uint32_t"],
    CH4_INIR_TEMP: [182, 4, null, "float"],
    EngInp0: [183, 4, null, "float"],
    EngInp1: [184, 4, null, "float"],
    EngInp2: [185, 4, null, "float"],
    EngInp3: [186, 4, null, "float"],
    FreInp2: [187, 2, null, "uint"],
    FreInp3: [188, 2, null, "uint"],
    IntInp2: [189, 4, null, "uint"],
    IntInp3: [190, 4, null, "uint"],
    BatteryLevel: [191, 1, null, "uint"],
    BatteryTxDropMv: [192, 2, null, "uint"],
    IO_ext_board_DI1_Changes: [193, 1, null, "uint"],
    IO_ext_board_DI2_Changes: [194, 1, null, "uint"],
    IO_ext_board_DI3_Changes: [195, 1, null, "uint"],
    IO_ext_board_DI4_Changes: [196, 1, null, "uint"],
    IO_ext_board_DI1_Overflow: [197, 2, null, "uint"],
    IO_ext_board_DI2_Overflow: [198, 2, null, "uint"],
    IO_ext_board_DI3_Overflow: [199, 2, null, "uint"],
    IO_ext_board_DI4_Overflow: [200, 2, null, "uint"],
    DI1_DM: [0x8000 + 1, 1, null, "uint"],
    DI2_DM: [0x8000 + 2, 1, null, "uint"],
    DI3_DM: [0x8000 + 3, 1, null, "uint"],
    DO1_DM: [0x8000 + 4, 1, null, "uint"],
    DO2_DM: [0x8000 + 5, 1, null, "uint"],
    DO3_DM: [0x8000 + 6, 1, null, "uint"],
    DO4_DM: [0x8000 + 7, 1, null, "uint"],
    DO5_DM: [0x8000 + 8, 1, null, "uint"],
    DO6_DM: [0x8000 + 9, 1, null, "uint"],
    DO7_DM: [0x8000 + 10, 1, null, "uint"],
    DO8_DM: [0x8000 + 11, 1, null, "uint"],
    DO9_DM: [0x8000 + 12, 1, null, "uint"],
    DO10_DM: [0x8000 + 13, 1, null, "uint"],
    DO11_DM: [0x8000 + 14, 1, null, "uint"],
    DO12_DM: [0x8000 + 15, 1, null, "uint"],
    DO13_DM: [0x8000 + 16, 1, null, "uint"],
    DO14_DM: [0x8000 + 17, 1, null, "uint"],
    AI1_DM: [0x8000 + 18, 4, null, "float"],
    AI2_DM: [0x8000 + 19, 4, null, "float"],
    AI3_DM: [0x8000 + 20, 4, null, "float"],
    AI4_DM: [0x8000 + 21, 4, null, "float"],
    AI5_DM: [0x8000 + 22, 4, null, "float"],
    AI6_DM: [0x8000 + 23, 4, null, "float"],
    Temp_DM: [0x8000 + 24, 4, null, "float"],
    Rate_DM: [0x8000 + 25, 4, null, "float"],
    Freq_DM: [0x8000 + 26, 4, null, "float"],
    TP_DM: [0x8000 + 27, 8, null, "uint"],
    Hist_DM: [0x8000 + 28, 8, null, "uint"],
    Total_DM: [0x8000 + 29, 8, null, "uint"],
    drainage_PH: [0x8000 + 30, 4, null, "float"],
    drainage_Turbidity: [0x8000 + 31, 4, null, "float"],
    drainage_Conductivity: [0x8000 + 32, 4, null, "float"],
    water_PH: [0x8000 + 33, 4, null, "float"],
    water_Turbidity: [0x8000 + 34, 4, null, "float"],
    water_Conductivity: [0x8000 + 35, 4, null, "float"],
    drainage_Temp: [0x8000 + 36, 4, null, "float"],
    drainage_PH_SD: [0x8000 + 37, 4, null, "float"],
    drainage_Turbidity_SD: [0x8000 + 38, 4, null, "float"],
    drainage_Conductivity_SD: [0x8000 + 39, 4, null, "float"],
    drainage_Temp_SD: [0x8000 + 40, 4, null, "float"],
    flashMemoryUsed: [0x8000 + 41, 4, null, "float"],
    water_Turbidity_SD: [0x8000 + 42, 4, null, "float"],
    water_Conductivity_SD: [0x8000 + 43, 4, null, "float"],
    water_Temp: [0x8000 + 44, 4, null, "float"],
    water_Temp_SD: [0x8000 + 45, 4, null, "float"],
    water_PH_SD: [0x8000 + 46, 4, null, "float"],
    water_level: [0x8000 + 47, 4, null, "float"],
    water_level_SD: [0x8000 + 48, 4, null, "float"],
    BatteryMon_IC: [0x8000 + 49, 4, null, "float"],
    water_Press: [0x8000 + 50, 4, null, "float"],
    water_Press_SD: [0x8000 + 51, 4, null, "float"],
    sw_st: [0x8000 + 52, 1, null, "uint"],
    DI4_DM: [0x8000 + 53, 1, null, "uint"],
    DI5_DM: [0x8000 + 54, 1, null, "uint"],
    DI6_DM: [0x8000 + 55, 1, null, "uint"],
    DI7_DM: [0x8000 + 56, 1, null, "uint"],
    DI8_DM: [0x8000 + 57, 1, null, "uint"],
    Modbus1Uint16_DM: [0x8000 + 58, 2, null, "uint"],
    Modbus2Uint16_DM: [0x8000 + 59, 2, null, "uint"],
    Modbus3Uint16_DM: [0x8000 + 60, 2, null, "uint"],
    Modbus4Uint16_DM: [0x8000 + 61, 2, null, "uint"],
    Modbus5Uint16_DM: [0x8000 + 62, 2, null, "uint"],
    Modbus6Uint16_DM: [0x8000 + 63, 2, null, "uint"],
    Modbus7Uint16_DM: [0x8000 + 64, 2, null, "uint"],
    Modbus8Uint16_DM: [0x8000 + 65, 2, null, "uint"],
    Modbus9Uint16_DM: [0x8000 + 66, 2, null, "uint"],
    Modbus10Uint16_DM: [0x8000 + 67, 2, null, "uint"],
    Modbus11Uint16_DM: [0x8000 + 68, 2, null, "uint"],
    Modbus12Uint16_DM: [0x8000 + 69, 2, null, "uint"],
    Modbus1float_DM: [0x8000 + 70, 4, null, "float"],
    Modbus2float_DM: [0x8000 + 71, 4, null, "float"],
    Modbus3float_DM: [0x8000 + 72, 4, null, "float"],
    Modbus4float_DM: [0x8000 + 73, 4, null, "float"],
    Modbus5float_DM: [0x8000 + 74, 4, null, "float"],
    Modbus6float_DM: [0x8000 + 75, 4, null, "float"],
    channel_level: [0x8000 + 76, 4, null, "float"],
    pump_press: [0x8000 + 77, 4, null, "float"],
    ph_cal_timestamp: [0x8000 + 78, 8, null, "uint"],
    turbidity_cal_timestamp: [0x8000 + 79, 8, null, "uint"],
    conductivity_cal_timestamp: [0x8000 + 80, 8, null, "uint"],
    rain_sensor: [0x8000 + 81, 2, null, "uint"],
    drainage_Suspended: [0x8000 + 82, 4, null, "float"],
    drainage_Suspended_SD: [0x8000 + 83, 4, null, "float"],
    water_Suspended: [0x8000 + 84, 4, null, "float"],
    water_Suspended_SD: [0x8000 + 85, 4, null, "float"],
    rain_accumulated_mm: [0x8000 + 86, 4, null, "float"]
};

exports.mappingKeys = Object.getOwnPropertyNames(this.mapping);

// ID -> tag name, built once. A frame ID is looked up here, never compared with the
// size of the table (MF-06/MF-29).
const idToKey = new Map(exports.mappingKeys.map((key) => [exports.mapping[key][0], key]));

// Value of one field of a plain frame, from its exact hex digits (size already checked).
function decodeValue(hex, type) {
    switch (type) {
        case "float":
            return readFloatBE([0, 2, 4, 6].map((k) => parseInt(hex.substring(k, k + 2), 16))).toFixed(4);
        case "uint":
        case "uint32_t":
            return hexToDec(hex);
        case "uintHex":
            return hex;
        case "int16":
            return (hexToDec(hex) << 16) >> 16;
        case "int32":
            return (hexToDec(hex) << 32) >> 32;
        default:
            return null;
    }
}

// ─── NanoDAq batch frame (MF-150) ─────────────────────────────────────────────
// Sent by the NanoDAq firmware on fPort 3 when the reading period is shorter than
// the send period (batch_buildFrame in src/lora/batch.h of firmware-NanoDAq).
// Big-endian:
//   [0x01 version][interval s, 3 B][age of newest record s, 2 B]
//   [U][U x (ID 2 B + native value)][K][K x ID 2 B]
//   then N records of K values, oldest -> newest.
// Inside a record, BATCH_COMPACT_IDS go as int16 x 0.1 (0x8000 = failure); the other
// IDs keep the native size/type of `mapping`. A NaN float is a failure.
// Read as a plain frame, the first two bytes (0x0100 / 0x0101) would be IDs 256/257,
// which do not exist, so only fPort 3 + "01 00"/"01 01" takes this path.
const BATCH_COMPACT_IDS = [15, 16, 39, 40, 41, 42, 61];

function batchFPort(obj) {
    if (obj.fPort !== undefined) return obj.fPort;
    if (obj.fport !== undefined) return obj.fport;
    return obj.f_port;
}

function isBatchFrame(obj, b) {
    return batchFPort(obj) === 3 && b.length >= 2 && b[0] === 0x01 && (b[1] === 0x00 || b[1] === 0x01);
}

function batchReadUint(b, i, n) {
    let v = 0;
    for (let k = 0; k < n; k++) v = v * 256 + b[i + k];
    return v;
}

function batchSize(key) {
    return exports.mapping[key][1];
}

function batchKey(id) {
    return exports.mappingKeys.find((key) => id === exports.mapping[key][0]);
}

// Native value, formatted like the legacy loop of packetDecode (float -> toFixed(4)
// string, uint -> hexToDec string...). null = failure (NaN float) or unsupported type.
function batchNative(b, i, key) {
    const size = exports.mapping[key][1];
    const hex = b.slice(i, i + size).toString("hex");

    switch (exports.mapping[key][3]) {
        case "float":
            const value = readFloatBE([b[i], b[i + 1], b[i + 2], b[i + 3]]);
            return isNaN(value) ? null : value.toFixed(4);
        case "uint":
        case "uint32_t":
            return hexToDec(hex);
        case "uintHex":
            return hex;
        case "int16":
            return (hexToDec(hex) << 16) >> 16;
        case "int32":
            return (hexToDec(hex) << 32) >> 32;
        default:
            return null;
    }
}

// Never throws: a truncated or unknown frame returns what was decoded so far, with
// the reason in batch2sense.errors.
// json2sense = the "unique" values + the newest record, under the usual keys, so the
// platform keeps storing one value per key. A failed value is left OUT of json2sense
// (the platform keeps the last good value instead of storing "NaN"); in
// batch2sense.readings it is null. batch2sense keeps every record with its offset
// from the uplink time (offset_s <= 0), for a consumer that stores each reading.
function decodeBatchFrame(obj, b) {
    const json2sense = {};
    const batch2sense = { interval_s: null, age_s: null, readings: [], errors: [] };
    const done = () => {
        const newest = batch2sense.readings[batch2sense.readings.length - 1];
        for (const key in newest) {
            if (key !== "offset_s" && newest[key] !== null) json2sense[key] = newest[key];
        }
        return { ...obj, json2sense, batch2sense };
    };
    const errors = batch2sense.errors;

    if (b.length < 7) {
        errors.push("batch truncated in header (" + b.length + " byte(s))");
        return done();
    }
    const interval = batchReadUint(b, 1, 3);
    const age = batchReadUint(b, 4, 2);
    batch2sense.interval_s = interval;
    batch2sense.age_s = age;

    const nUnique = b[6];
    let i = 7;
    for (let k = 0; k < nUnique; k++) {
        if (i + 2 > b.length) {
            errors.push("batch truncated in unique values @byte " + i);
            return done();
        }
        const id = (b[i] << 8) | b[i + 1];
        const key = batchKey(id);
        if (!key) {
            errors.push("unknown ID " + id + " in unique values @byte " + i);
            return done();
        }
        const size = batchSize(key);
        if (i + 2 + size > b.length) {
            errors.push("batch truncated in " + key + " @byte " + i);
            return done();
        }
        const value = batchNative(b, i + 2, key);
        if (value !== null) json2sense[key] = value;
        i += 2 + size;
    }

    if (i + 1 > b.length) {
        errors.push("batch truncated in ID count @byte " + i);
        return done();
    }
    const nIds = b[i];
    i += 1;
    const fields = [];
    let recordSize = 0;
    for (let k = 0; k < nIds; k++) {
        if (i + 2 > b.length) {
            errors.push("batch truncated in ID list @byte " + i);
            return done();
        }
        const id = (b[i] << 8) | b[i + 1];
        const key = batchKey(id);
        if (!key) {
            errors.push("unknown ID " + id + " in ID list @byte " + i);
            return done();
        }
        const compact = BATCH_COMPACT_IDS.includes(id);
        fields.push({ key, compact });
        recordSize += compact ? 2 : batchSize(key);
        i += 2;
    }

    // N rounded up: with a truncated end, the whole records keep the offset they
    // would have in the full frame (the lost one is the newest).
    const n = recordSize === 0 ? 0 : Math.ceil((b.length - i) / recordSize);
    for (let r = 0; r < n && i + recordSize <= b.length; r++) {
        const reading = { offset_s: 0 - (age + (n - 1 - r) * interval) };
        for (const field of fields) {
            if (field.compact) {
                const v = (b[i] << 8) | b[i + 1];
                reading[field.key] = v === 0x8000 ? null : (((v << 16) >> 16) / 10).toFixed(4);
                i += 2;
            } else {
                reading[field.key] = batchNative(b, i, field.key);
                i += batchSize(field.key);
            }
        }
        batch2sense.readings.push(reading);
    }
    if (i < b.length) {
        errors.push("batch with incomplete record: " + (b.length - i) + " trailing byte(s)");
    }
    return done();
}

exports.packetDecode = (rawdata, offset = 0) => {
    var payload = "";

    if (rawdata === undefined || rawdata === null) {
        throw "Data format must be a hexadecimal string";
    }

    if (isJson(rawdata.toString().trim())) {
        var obj = JSON.parse(rawdata);
        if (obj.hasOwnProperty('json2sense')) {
            return obj;
        }
        var aux;
        if (obj.hasOwnProperty('payload')) {
            aux = obj.payload + "";
        }
        else if (obj.hasOwnProperty('uplink_message')) {
            if (obj.uplink_message.hasOwnProperty('frm_payload')) {
                aux = obj.uplink_message.frm_payload + "";
            }
        }
        else if (obj.hasOwnProperty('data')) {
            if (obj.data.hasOwnProperty('uplink_message')) {
                if (obj.data.uplink_message.hasOwnProperty('frm_payload')) {
                    aux = obj.data.uplink_message.frm_payload + "";
                }
            } else {
                aux = obj.data + "";
            }
        } else if (obj.hasOwnProperty('params')) {
            if (obj.params.hasOwnProperty('payload')) {
                aux = obj.params.payload + "";
            }
        } else {
            throw 'Can not find rawdata into received JSON';
        }

        let buff = Buffer.from(aux, 'base64');

        for (var j = 0; j < buff.length; j++) {
            if (buff[j] <= 0x0F)
                payload += '0';

            payload += buff[j].toString(16);
        }
    }
    else {
        payload = rawdata;
    }

    const data = (payload.toString()).trim()

    const isHex = /^[0-9a-fA-F]+$/;

    if (typeof data !== "string" || !isHex.test(data)) {
        throw "Data format must be a hexadecimal string";
    }

    // Half a byte is not a frame: an odd number of hex digits used to be decoded anyway (MF-29).
    if (data.length % 2 !== 0) {
        throw "Data format must be a hexadecimal string with an even number of digits";
    }

    if (typeof offset !== "number" || !(offset % 1 === 0)) {
        throw "Offset format must be a positive integer number";
    }

    if (offset < 0 || offset > data.length) {
        throw "Wrong offset value";
    }

    if (obj !== undefined && offset === 0) {
        const frame = Buffer.from(data, "hex");
        if (isBatchFrame(obj, frame)) {
            return decodeBatchFrame(obj, frame);
        }
    }

    let json2sense = {};
    let i = offset;
    const errors2sense = [];

    // The frame does not carry the size of each value: it comes from the table. So every
    // problem below stops the reading, keeps what was decoded and is reported in
    // errors2sense, instead of inventing a value or losing the uplink (MF-215, MF-29).
    while (i < data.length) {
        const at = Math.floor(i / 2);

        if (data.length - i < 4) {
            errors2sense.push("truncated ID @byte " + at);
            break;
        }
        const id = parseInt(data.substring(i, i + 4), 16);
        const key = idToKey.get(id);
        if (key === undefined) {
            errors2sense.push("unknown ID " + id + " @byte " + at);
            break;
        }

        const variavel = this.mapping[key];
        const size = variavel[1] * 2;
        const left = data.length - (i + 4);
        if (left < size) {
            errors2sense.push("truncated field " + key + " (ID " + id + ") @byte " + at + ": " +
                Math.ceil((size - left) / 2) + " byte(s) missing");
            break;
        }
        const raw = data.substring(i + 4, i + 4 + size);
        i += 4 + size;

        if (json2sense.hasOwnProperty(key)) {
            errors2sense.push("duplicate ID " + id + " (" + key + ") @byte " + at + ": kept the first value");
            continue;
        }
        variavel[2] = decodeValue(raw, variavel[3]);
        json2sense[key] = variavel[2];
    }

    var decodedObj = { ...obj, json2sense }
    if (errors2sense.length) decodedObj.errors2sense = errors2sense;

    return decodedObj;
};
