import React, { useEffect, useMemo, useState } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import "./App.css";

const firebaseConfig = {
  apiKey: "AIzaSyDySop7o59g5gKwMnK4sbvbVj1ms59-AgE",
  authDomain: "iconpass-tool.firebaseapp.com",
  projectId: "iconpass-tool",
  storageBucket: "iconpass-tool.firebasestorage.app",
  messagingSenderId: "794281018396",
  appId: "1:794281018396:web:6c2cf2e3af290e51018bd9",
  measurementId: "G-6VN27LTRJB",
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

/* =========================================================
   共通ユーティリティ
========================================================= */
function hexToBytes(hex) {
  if (!hex) return [];
  return hex.match(/.{1,2}/g) || [];
}

function hexToBin(hex) {
  if (!hex) return "";
  return hex
    .split("")
    .map((h) => parseInt(h, 16).toString(2).padStart(4, "0"))
    .join("");
}

function reverseEndianHex(hex) {
  return hexToBytes(hex).reverse().join("");
}

function parseBcd(hex) {
  return hex.replace(/F/gi, "");
}

function parseBin(hex, littleEndian = false) {
  if (!hex) return "";
  const target = littleEndian ? reverseEndianHex(hex) : hex;
  const value = parseInt(target, 16);
  return Number.isNaN(value) ? "" : String(value);
}

function parseDateBits(hex) {
  const value = parseInt(hex, 16);
  if (Number.isNaN(value)) return "";

  const year = (value >> 9) & 0x7f;
  const month = (value >> 5) & 0x0f;
  const day = value & 0x1f;

  return `${String(year).padStart(2, "0")}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
}

function parseTimeRegionBits(hex) {
  const value = parseInt(hex, 16);
  if (Number.isNaN(value)) return "";

  const hour = (value >> 11) & 0x1f;
  const minute = (value >> 5) & 0x3f;
  const region = value & 0x1f;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} / 地域番号:${region}`;
}

function parseTimeBcd(hex) {
  if (hex.length < 4) return hex;
  return `${hex.slice(0, 2)}:${hex.slice(2, 4)}`;
}

function parseTimeBcdHhMmSs(hex) {
  if (hex.length < 6) return hex;
  return `${hex.slice(0, 2)}:${hex.slice(2, 4)}:${hex.slice(4, 6)}`;
}

function parseDateBcdYyyyMmDd(hex) {
  if (hex.length < 8) return hex;
  return `${hex.slice(0, 4)}/${hex.slice(4, 6)}/${hex.slice(6, 8)}`;
}

function parseDateTimeBcdYyMmDdHhMmSs(hex) {
  if (hex.length < 12) return hex;
  return `20${hex.slice(0, 2)}/${hex.slice(2, 4)}/${hex.slice(4, 6)} ${hex.slice(6, 8)}:${hex.slice(8, 10)}:${hex.slice(10, 12)}`;
}

function parseLineStationCode(hex) {
  if (!hex || hex.length < 4) return hex;

  const value = parseInt(hex.slice(0, 4), 16);
  if (Number.isNaN(value)) return hex;

  const lineCode = (value >> 8) & 0xff;
  const stationOrder = value & 0xff;

  return `${String(lineCode).padStart(3, "0")}-${String(stationOrder).padStart(3, "0")}`;
}

function parseLineStationPlaceCode(hex) {
  if (!hex || hex.length < 8) return hex;

  const lineStation = parseLineStationCode(hex.slice(0, 4));
  const cornerNo = parseBcd(hex.slice(4, 6));
  const machineNo = parseBcd(hex.slice(6, 8));

  return `${lineStation} / コーナ:${cornerNo} / 号機:${machineNo}`;
}

function parseJisHex(hex) {
  if (!hex) return "";

  const bytes = hexToBytes(hex).map((b) => parseInt(b, 16));
  const decoder = new TextDecoder("shift_jis");

  return decoder.decode(new Uint8Array(bytes)).replace(/\s+$/g, "");
}

function parseOperatorCode(hex) {
  if (!hex || hex.length < 4) return hex;

  const value = parseInt(hex, 16);
  if (Number.isNaN(value)) return hex;

  const region = (value >> 8) & 0x0f; // bit11～8
  const user = value & 0xff; // bit7～0

  return `${String(region).padStart(2, "0")}-${String(user).padStart(3, "0")}`;
}

/* =========================================================
   IDi解析
========================================================= */
function parseIdi(hex) {
  const bytes = hexToBytes(hex);
  if (bytes.length < 8) return hex;

  const operatorCode = parseBusOperatorCode(bytes.slice(0, 2).join(""));
  const b2 = parseInt(bytes[2], 16);
  const b3 = parseInt(bytes[3], 16);
  const dateHex = bytes.slice(4, 6).join("");
  const serialHex = bytes.slice(6, 8).join("");

  const cardVersion = (b2 >> 4) & 0x0f;
  const cardType = b2 & 0x0f;
  const formatterNo = (b3 >> 4) & 0x0f;
  const checkDigit = b3 & 0x0f;

  const cardTypeMap = {
    0: "定期",
    3: "ICSF",
  };

  return [
    `事業者コード:${operatorCode}`,
    `カードバージョン:${cardVersion}`,
    `ICカード種別:${cardType}（${cardTypeMap[cardType] || "ユーザ独自/予備"}）`,
    `発行機No:${formatterNo}`,
    `チェックデジット:${checkDigit}`,
    `処理年月日:${parseDateBits(dateHex)}`,
    `発行シリアルNo:${parseInt(serialHex, 16)}`,
  ].join("\n");
}

/* =========================================================
   バス系解析
========================================================= */
function parseBusWriteInfo(hex) {
  const value = parseInt(hex, 16);
  if (Number.isNaN(value)) return "";

  const writeInfo = value & 0b11;
  const map = {
    0: "00：上書可能",
    1: "01：共通予備",
    2: "10：上書不可",
    3: "11：上書不可（連結）",
  };

  return map[writeInfo];
}

function parseBusOperatorCode(hex) {
  const bytes = hexToBytes(hex);
  if (bytes.length < 2) return hex;

  const region = parseInt(bytes[0], 16);
  const userCode = parseInt(bytes[1], 16);

  return `${String(region).padStart(2, "0")}-${String(userCode).padStart(3, "0")}`;
}

function parseBusTransfer(hex) {
  const value = parseInt(hex, 16);
  if (Number.isNaN(value)) return "";

  const operationType = (value >> 4) & 0xf;
  const direct = (value >> 2) & 1;
  const specified = (value >> 1) & 1;
  const free = value & 1;

  const operationMap = {
    0: "均一",
    1: "信用",
    2: "多区",
  };

  return [`運行形態:${operationType}（${operationMap[operationType] || "予約"}）`, `直通乗継:${direct ? "あり" : "なし"}`, `指定乗継:${specified ? "あり" : "なし"}`, `フリー乗継:${free ? "あり" : "なし"}`].join("\n");
}

function parseBusRoute(hex) {
  const value = parseInt(hex, 16);
  if (Number.isNaN(value)) return "";

  const direction = (value >> 20) & 0xf;
  const routeNo = value & 0xfffff;

  const directionText = direction === 0 ? "往路" : direction === 1 ? "復路" : "その他";

  return `往復コード:${direction}（${directionText}） / 系統番号:${routeNo}`;
}

/* =========================================================
   一件明細向け解析
========================================================= */
function parseDepositPaymentType(hex) {
  const value = parseInt(hex, 16);
  if (Number.isNaN(value)) return "";
  if (value === 0) return "00：現金";
  if (value === 0x63) return "63：クレジット";
  return `${hex}：その他`;
}

function parseSfTicketType(hex) {
  const value = parseInt(hex, 16);
  if (Number.isNaN(value)) return "";
  if (value === 0) return "00：大人";
  if (value === 1) return "01：小児";
  return `${hex}：その他`;
}

function parseCommunicationIncompleteFlag(hex) {
  const value = parseInt(hex, 16);
  if (Number.isNaN(value)) return "";
  if (value === 0) return "00：未了なし";
  return `${hex}：未了あり/その他`;
}

/* =========================================================
   値解析
========================================================= */
function parseValue(hex, format, name = "") {
  if (!hex) return "";

  if (name === "入金区分（デポジット）") return parseDepositPaymentType(hex);
  if (name === "SF券種コード") return parseSfTicketType(hex);
  if (name === "通信未了フラグ") return parseCommunicationIncompleteFlag(hex);

  switch (format) {
    case "BIN":
      return parseBin(hex);
    case "BIN_LE":
      return parseBin(hex, true);
    case "BIN_BE":
      return parseBin(hex);
    case "BCD":
      return parseBcd(hex);
    case "BIT":
    case "SPECIAL":
      return hexToBin(hex);
    case "DATE_BITS":
      return parseDateBits(hex);
    case "TIME_REGION_BITS":
      return parseTimeRegionBits(hex);
    case "TIME_BCD":
      return parseTimeBcd(hex);
    case "TIME_BCD_HHMMSS":
      return parseTimeBcdHhMmSs(hex);
    case "DATE_BCD_YYYYMMDD":
      return parseDateBcdYyyyMmDd(hex);
    case "LINE_STATION_CODE":
      return parseLineStationCode(hex);
    case "OPERATOR_CODE":
      return parseOperatorCode(hex);
    case "LINE_STATION_PLACE_CODE":
      return parseLineStationPlaceCode(hex);
    case "DATETIME_BCD_YYMMDDHHMMSS":
      return parseDateTimeBcdYyMmDdHhMmSs(hex);
    case "IDI":
      return parseIdi(hex);
    case "BUS_WRITE_INFO":
      return parseBusWriteInfo(hex);
    case "BUS_OPERATOR_CODE":
      return parseBusOperatorCode(hex);
    case "BUS_TRANSFER":
      return parseBusTransfer(hex);
    case "BUS_ROUTE":
      return parseBusRoute(hex);
    case "JIS_HEX":
      return parseJisHex(hex);
    case "HEX":
    default:
      return hex;
  }
}

/* =========================================================
   ブロック定義生成
========================================================= */
const activeInfoBlock0 = [{ name: "氏名", bytes: 16, format: "JIS_HEX" }];

const activeInfoBlock1 = [
  { name: "電話番号", bytes: 6, format: "BCD" },
  { name: "内線番号", bytes: 2, format: "BCD" },
  { name: "年齢", bytes: 1, format: "BCD" },
  { name: "生年月日", bytes: 2, format: "DATE_BITS" },
  { name: "入金区分", bytes: 1, format: "SPECIAL" },
  { name: "デポジット額", bytes: 2, format: "BIN_LE" },
  { name: "暗証番号", bytes: 2, format: "BCD" },
];

const activeInfoBlock2 = [
  { name: "旧カードIDi", bytes: 8, format: "IDI" },
  { name: "紛失再発行回数", bytes: 1, format: "BIN" },
  { name: "共通予備", bytes: 7, format: "HEX" },
];

const activeInfoBlock3 = [
  { name: "カード（非）活性事業者コード", bytes: 2, format: "OPERATOR_CODE" },
  { name: "機種コード", bytes: 1, format: "BIN" },
  { name: "カード（非）活性所コード", bytes: 4, format: "LINE_STATION_PLACE_CODE" },
  { name: "カード（非）活性日", bytes: 2, format: "DATE_BITS" },
  { name: "カード（非）活性コード", bytes: 1, format: "SPECIAL" },
  { name: "機能種別", bytes: 1, format: "SPECIAL" },
  { name: "カードレビジョン", bytes: 1, format: "BIN" },
  { name: "リサイクルID", bytes: 1, format: "BIN" },
  { name: "機能種別2", bytes: 1, format: "SPECIAL" },
  { name: "カード有効終了年月日", bytes: 2, format: "DATE_BITS" },
];

const accessInfoBlock4 = [
  { name: "相手方カードID", bytes: 8, format: "IDI" },
  { name: "カード制御コード", bytes: 1, format: "SPECIAL" },
  { name: "エラーカウンタ", bytes: 2, format: "SPECIAL" },
  { name: "パース合計金額", bytes: 3, format: "BIN_LE" },
  { name: "一件明細ID", bytes: 2, format: "BIN" },
];

const sfBalanceBlock = [
  { name: "残額", bytes: 4, format: "BIN_LE" },
  { name: "キャッシュバックデータ", bytes: 4, format: "BIN_LE" },
  { name: "年月日", bytes: 2, format: "DATE_BITS" },
  { name: "時刻・地域番号", bytes: 2, format: "TIME_REGION_BITS" },
  { name: "ユーザコード", bytes: 1, format: "BIN" },
  { name: "入金区分", bytes: 1, format: "SPECIAL" },
  { name: "実行ID", bytes: 2, format: "BIN" },
];

const sfChargeBlock = [
  { name: "機種コード", bytes: 1, format: "BIN" },
  { name: "チャージ箇所コード", bytes: 4, format: "HEX" },
  { name: "積増額", bytes: 3, format: "BIN_LE" },
  { name: "共通予備", bytes: 8, format: "HEX" },
];

const sfLogBlock = [
  { name: "機種コード", bytes: 1, format: "BIN" },
  { name: "処理種別", bytes: 1, format: "SPECIAL" },
  { name: "処理金額種別", bytes: 1, format: "SPECIAL" },
  { name: "利用駅種別", bytes: 1, format: "BIN" },
  { name: "年月日", bytes: 2, format: "DATE_BITS" },
  { name: "利用駅1", bytes: 2, format: "LINE_STATION_CODE" },
  { name: "利用駅2", bytes: 2, format: "LINE_STATION_CODE" },
  { name: "残額", bytes: 3, format: "BIN_LE" },
  { name: "SFログID", bytes: 2, format: "BIN" },
  { name: "地域識別・運用日付識別コード", bytes: 1, format: "SPECIAL" },
];

const commuterPrint31 = [
  { name: "事業者コード", bytes: 2, format: "BUS_OPERATOR_CODE" },
  { name: "有効期間", bytes: 1, format: "BIN" },
  { name: "割引コード", bytes: 1, format: "BIN" },
  { name: "発券不可情報", bytes: 1, format: "SPECIAL" },
  { name: "学年", bytes: 1, format: "SPECIAL" },
  { name: "発行区分", bytes: 1, format: "BIN" },
  { name: "原券発行日", bytes: 2, format: "DATE_BITS" },
  { name: "使用開始日", bytes: 2, format: "DATE_BITS" },
  { name: "日調日数", bytes: 1, format: "BCD" },
  { name: "運休延長日数", bytes: 1, format: "BCD" },
  { name: "一括社番", bytes: 2, format: "BCD" },
  { name: "券番号上位", bytes: 1, format: "BCD" },
];

const commuterPrint32 = [
  { name: "券番号下位", bytes: 2, format: "BCD" },
  { name: "発売所コード", bytes: 4, format: "LINE_STATION_PLACE_CODE" },
  { name: "カード印章コード", bytes: 1, format: "SPECIAL" },
  { name: "運賃", bytes: 3, format: "BIN_LE" },
  { name: "クレジット発行番号", bytes: 2, format: "BCD" },
  { name: "処理順コード", bytes: 1, format: "SPECIAL" },
  { name: "複数枚定期券印章", bytes: 1, format: "SPECIAL" },
  { name: "共通予備", bytes: 2, format: "HEX" },
];

const commuterPrint33 = [
  { name: "発駅側接続・乗換コード", bytes: 2, format: "LINE_STATION_CODE" },
  { name: "着駅側接続・乗換コード", bytes: 2, format: "LINE_STATION_CODE" },
  { name: "経由印刷情報", bytes: 12, format: "JIS_HEX" },
];

const commuterPrint34 = [{ name: "経由印刷情報", bytes: 16, format: "JIS_HEX" }];

const commuterPrint35 = [
  { name: "経由印刷情報", bytes: 8, format: "JIS_HEX" },
  { name: "新幹線の乗車駅1", bytes: 2, format: "LINE_STATION_CODE" },
  { name: "新幹線の降車駅1", bytes: 2, format: "LINE_STATION_CODE" },
  { name: "新幹線の乗車駅2", bytes: 2, format: "LINE_STATION_CODE" },
  { name: "新幹線の降車駅2", bytes: 2, format: "LINE_STATION_CODE" },
];

const commuterPrint36 = [
  { name: "特別車両定期発駅コード1", bytes: 2, format: "LINE_STATION_CODE" },
  { name: "特別車両定期着駅コード1", bytes: 2, format: "LINE_STATION_CODE" },
  { name: "特別車両定期発駅コード2", bytes: 2, format: "LINE_STATION_CODE" },
  { name: "特別車両定期着駅コード2", bytes: 2, format: "LINE_STATION_CODE" },
  { name: "キャッシュレス情報", bytes: 1, format: "SPECIAL" },
  { name: "特殊印刷情報", bytes: 1, format: "SPECIAL" },
  { name: "空き", bytes: 2, format: "HEX" },
  { name: "定期券再発行年月日", bytes: 2, format: "DATE_BITS" },
  { name: "機種コード", bytes: 1, format: "BIN" },
  { name: "空き", bytes: 1, format: "HEX" },
];

const commuterPrint37 = [{ name: "後方情報【マルス】", bytes: 16, format: "HEX" }];

const commuterPrint38 = [
  { name: "後方情報", bytes: 4, format: "HEX" },
  { name: "商品管理コード", bytes: 12, format: "HEX" },
];

const commuterPrint39 = [
  { name: "社員コード", bytes: 3, format: "BIN" },
  { name: "空き", bytes: 4, format: "HEX" },
  { name: "割引コード2", bytes: 1, format: "BIN" },
  { name: "運賃2", bytes: 3, format: "BIN_LE" },
  { name: "定期券ID", bytes: 1, format: "BIN" },
  { name: "空き", bytes: 4, format: "HEX" },
];

const empty16 = [{ name: "空き", bytes: 16, format: "HEX" }];

const railwayJudge41 = [
  { name: "開始年月日", bytes: 2, format: "DATE_BITS" },
  { name: "終了年月日", bytes: 2, format: "DATE_BITS" },
  { name: "券種コード", bytes: 4, format: "SPECIAL" },
  { name: "発駅コード", bytes: 2, format: "LINE_STATION_CODE" },
  { name: "着駅コード", bytes: 2, format: "LINE_STATION_CODE" },
  { name: "経由駅コード1", bytes: 2, format: "LINE_STATION_CODE" },
  { name: "経由駅コード2", bytes: 2, format: "LINE_STATION_CODE" },
];

const railwayJudge42 = [
  { name: "経由駅コード3", bytes: 2, format: "LINE_STATION_CODE" },
  { name: "経由駅コード4", bytes: 2, format: "LINE_STATION_CODE" },
  { name: "経由駅コード5", bytes: 2, format: "LINE_STATION_CODE" },
  { name: "経由駅コード6", bytes: 2, format: "LINE_STATION_CODE" },
  { name: "経由駅コード7", bytes: 2, format: "LINE_STATION_CODE" },
  { name: "経由駅コード8", bytes: 2, format: "LINE_STATION_CODE" },
  { name: "経由駅コード9", bytes: 2, format: "LINE_STATION_CODE" },
  { name: "経由駅コード10", bytes: 2, format: "LINE_STATION_CODE" },
];

const railwayJudge43 = [
  { name: "特割2種コード", bytes: 2, format: "SPECIAL" },
  { name: "定期券経由地域識別コード", bytes: 3, format: "SPECIAL" },
  { name: "原券発行日", bytes: 2, format: "DATE_BITS" },
  { name: "定期券発着地域識別コード", bytes: 1, format: "SPECIAL" },
  { name: "優等列車発駅1", bytes: 2, format: "LINE_STATION_CODE" },
  { name: "優等列車着駅1", bytes: 2, format: "LINE_STATION_CODE" },
  { name: "優等列車発駅2", bytes: 2, format: "LINE_STATION_CODE" },
  { name: "優等列車着駅2", bytes: 2, format: "LINE_STATION_CODE" },
];

const busCommon44 = [
  { name: "書込情報", bytes: 1, format: "BUS_WRITE_INFO" },
  { name: "バス路面電車事業者コード", bytes: 2, format: "BUS_OPERATOR_CODE" },
  { name: "機器番号", bytes: 1, format: "BIN" },
  { name: "処理年月日", bytes: 2, format: "DATE_BITS" },
  { name: "支払時刻", bytes: 2, format: "TIME_BCD" },
  { name: "営業所コード", bytes: 1, format: "BCD" },
  { name: "乗継権利", bytes: 1, format: "BUS_TRANSFER" },
  { name: "系統番号", bytes: 3, format: "BUS_ROUTE" },
  { name: "精算停留所番号", bytes: 1, format: "BIN" },
  { name: "予備", bytes: 2, format: "HEX" },
];

const busCommon45 = [
  { name: "書込情報", bytes: 1, format: "BUS_WRITE_INFO" },
  { name: "バス路面電車事業者コード", bytes: 2, format: "BUS_OPERATOR_CODE" },
  { name: "開始年月日", bytes: 2, format: "DATE_BITS" },
  { name: "終了年月日", bytes: 2, format: "DATE_BITS" },
  { name: "券種コード", bytes: 2, format: "SPECIAL" },
  { name: "有効エリアコード", bytes: 2, format: "BIN" },
  { name: "有効金額コード", bytes: 2, format: "BIN" },
  { name: "共通予備", bytes: 3, format: "HEX" },
];

const busPrivate46 = [
  { name: "バス路面電車事業者コード", bytes: 2, format: "BUS_OPERATOR_CODE" },
  { name: "開始年月日", bytes: 2, format: "DATE_BITS" },
  { name: "終了年月日", bytes: 2, format: "DATE_BITS" },
  { name: "券種コード", bytes: 1, format: "SPECIAL" },
  { name: "エリア等コード", bytes: 2, format: "HEX" },
  { name: "判定用1系統識別番号", bytes: 1, format: "BIN" },
  { name: "判定用1停留所識別番号(from)", bytes: 1, format: "BIN" },
  { name: "判定用1停留所識別番号(to)", bytes: 1, format: "BIN" },
  { name: "判定用2系統識別番号", bytes: 1, format: "BIN" },
  { name: "判定用2停留所識別番号(from)", bytes: 1, format: "BIN" },
  { name: "判定用2停留所識別番号(to)", bytes: 1, format: "BIN" },
  { name: "共通予備", bytes: 1, format: "HEX" },
];

const busPrivate47 = [
  { name: "発行日", bytes: 2, format: "DATE_BITS" },
  { name: "発売金額", bytes: 2, format: "BIN_LE" },
  { name: "発行通用期間", bytes: 1, format: "BIN" },
  { name: "割引コード", bytes: 1, format: "BIN" },
  { name: "発券共通制御コード", bytes: 1, format: "SPECIAL" },
  { name: "カード印章コード", bytes: 1, format: "SPECIAL" },
  { name: "機種コード", bytes: 1, format: "BIN" },
  { name: "バス定期券ID", bytes: 1, format: "BIN" },
  { name: "発行所番号・発行機号機コード", bytes: 4, format: "HEX" },
  { name: "共通予備", bytes: 2, format: "HEX" },
];

const gateLog48 = [
  { name: "利用パターン", bytes: 2, format: "SPECIAL" },
  { name: "駅コード／事業者コード", bytes: 2, format: "HEX" },
  { name: "コーナー・号機番号", bytes: 2, format: "BCD" },
  { name: "年月日", bytes: 2, format: "DATE_BITS" },
  { name: "時刻", bytes: 2, format: "TIME_BCD" },
  { name: "ピーク運賃", bytes: 2, format: "BIN_LE" },
  { name: "仮精算金", bytes: 2, format: "BIN_LE" },
  { name: "仮精算駅／停留所コード", bytes: 2, format: "HEX" },
];

const gateContact51 = [
  { name: "乗車始点駅", bytes: 2, format: "HEX" },
  { name: "連絡駅1", bytes: 2, format: "HEX" },
  { name: "連絡駅2", bytes: 2, format: "HEX" },
  { name: "連絡駅3", bytes: 2, format: "HEX" },
  { name: "自線内ピーク運賃", bytes: 2, format: "BIN_LE" },
  { name: "割引1社1", bytes: 1, format: "BIN" },
  { name: "割引1社2", bytes: 1, format: "BIN" },
  { name: "割引2社2", bytes: 1, format: "BIN" },
  { name: "割引2社3", bytes: 1, format: "BIN" },
  { name: "割引3社3", bytes: 1, format: "BIN" },
  { name: "割引3社4", bytes: 1, format: "BIN" },
];

const expressGate52 = [
  { name: "優等列車利用年月日", bytes: 2, format: "DATE_BITS" },
  { name: "優等列車入場時刻", bytes: 2, format: "TIME_BCD" },
  { name: "優等列車入場駅", bytes: 2, format: "HEX" },
  { name: "優等列車入場処理コーナー・号機番号", bytes: 1, format: "SPECIAL" },
  { name: "優等列車出場時刻", bytes: 2, format: "TIME_BCD" },
  { name: "優等列車出場駅", bytes: 2, format: "HEX" },
  { name: "優等列車出場処理コーナー・号機番号", bytes: 1, format: "SPECIAL" },
  { name: "他社内ピーク運賃1", bytes: 2, format: "SPECIAL" },
  { name: "他社内ピーク運賃2", bytes: 2, format: "BIN_LE" },
];

const busActivationName = [{ name: "氏名", bytes: 16, format: "JIS_HEX" }];

const busActivation101 = [
  { name: "電話番号", bytes: 6, format: "BCD" },
  { name: "カード検索番号", bytes: 2, format: "BCD" },
  { name: "年齢", bytes: 1, format: "BCD" },
  { name: "生年月日", bytes: 2, format: "DATE_BITS" },
  { name: "予備", bytes: 5, format: "HEX" },
];

const busJudge102 = [
  { name: "バス路面電車事業者コード", bytes: 2, format: "BUS_OPERATOR_CODE" },
  { name: "開始年月日", bytes: 2, format: "DATE_BITS" },
  { name: "終了年月日", bytes: 2, format: "DATE_BITS" },
  { name: "券種コード", bytes: 1, format: "SPECIAL" },
  { name: "エリア等コード", bytes: 1, format: "HEX" },
  { name: "判定用1系統識別番号", bytes: 2, format: "BIN" },
  { name: "判定用1停留所識別番号(from)", bytes: 1, format: "BIN" },
  { name: "判定用1停留所識別番号(to)", bytes: 1, format: "BIN" },
  { name: "判定用2系統識別番号", bytes: 2, format: "BIN" },
  { name: "判定用2停留所識別番号(from)", bytes: 1, format: "BIN" },
  { name: "判定用2停留所識別番号(to)", bytes: 1, format: "BIN" },
];

const busIssue103 = [
  { name: "発行日", bytes: 2, format: "DATE_BITS" },
  { name: "発売金額", bytes: 2, format: "BIN_LE" },
  { name: "発売通用期間", bytes: 1, format: "BIN" },
  { name: "割引コード1", bytes: 1, format: "BIN" },
  { name: "割引コード2", bytes: 1, format: "BIN" },
  { name: "発売共通制御コード", bytes: 1, format: "SPECIAL" },
  { name: "カード印章コード", bytes: 1, format: "SPECIAL" },
  { name: "機種コード", bytes: 1, format: "SPECIAL" },
  { name: "バス定期券ID", bytes: 1, format: "BIN" },
  { name: "発行所番号・発行機号機コード", bytes: 4, format: "HEX" },
  { name: "予備", bytes: 1, format: "HEX" },
];

const busIssue104 = [
  { name: "原券発行日", bytes: 2, format: "DATE_BITS" },
  { name: "使用開始日", bytes: 2, format: "DATE_BITS" },
  { name: "運休延長日数", bytes: 1, format: "BCD" },
  { name: "券番号", bytes: 3, format: "BCD" },
  { name: "リファレンスペーパー再印字回数", bytes: 1, format: "BCD" },
  { name: "クレジット発行番号", bytes: 2, format: "BCD" },
  { name: "予備", bytes: 5, format: "HEX" },
];

const railwayJudge202 = [
  { name: "バス路面電車事業者コード", bytes: 2, format: "BUS_OPERATOR_CODE" },
  { name: "開始年月日", bytes: 2, format: "DATE_BITS" },
  { name: "終了年月日", bytes: 2, format: "DATE_BITS" },
  { name: "券種コード", bytes: 1, format: "SPECIAL" },
  { name: "発駅コード", bytes: 2, format: "LINE_STATION_CODE" },
  { name: "着駅コード", bytes: 2, format: "LINE_STATION_CODE" },
  { name: "経由駅コード1", bytes: 2, format: "LINE_STATION_CODE" },
  { name: "経由駅コード2", bytes: 2, format: "LINE_STATION_CODE" },
  { name: "地域識別コード", bytes: 1, format: "SPECIAL" },
];

function cloneDefs(defs) {
  return defs.map((x) => ({ ...x }));
}

function buildAllBlockDefinitions() {
  const defs = {
    0: activeInfoBlock0,
    1: activeInfoBlock1,
    2: activeInfoBlock2,
    3: activeInfoBlock3,
    4: accessInfoBlock4,
    5: sfBalanceBlock,
    8: sfChargeBlock,
    11: sfLogBlock,
    31: commuterPrint31,
    32: commuterPrint32,
    33: commuterPrint33,
    34: commuterPrint34,
    35: commuterPrint35,
    36: commuterPrint36,
    37: commuterPrint37,
    38: commuterPrint38,
    39: commuterPrint39,
    40: empty16,
    41: railwayJudge41,
    42: railwayJudge42,
    43: railwayJudge43,
    44: busCommon44,
    45: busCommon45,
    46: busPrivate46,
    47: busPrivate47,
    48: gateLog48,
    51: gateContact51,
    52: expressGate52,
    100: busActivationName,
    101: busActivation101,
    102: busJudge102,
    103: busIssue103,
    104: busIssue104,
    200: busActivationName,
    201: busActivation101,
    202: railwayJudge202,
    203: busIssue103,
    204: busIssue104,
  };

  // SF2/SF3残額情報：5と同構成、2ブロック分
  defs[6] = cloneDefs(sfBalanceBlock);
  defs[7] = cloneDefs(sfBalanceBlock);

  // SF2/SF3発行積増情報：8と同構成、2ブロック分
  defs[9] = cloneDefs(sfChargeBlock);
  defs[10] = cloneDefs(sfChargeBlock);

  // SFログ情報2〜20：11と同構成
  for (let block = 12; block <= 30; block++) {
    defs[block] = cloneDefs(sfLogBlock);
  }

  // 改札ログ情報2〜3：48と同構成
  defs[49] = cloneDefs(gateLog48);
  defs[50] = cloneDefs(gateLog48);

  // バス路面電車定期判定情報2/3：102〜104 と同構成
  defs[105] = cloneDefs(busJudge102);
  defs[106] = cloneDefs(busIssue103);
  defs[107] = cloneDefs(busIssue104);
  defs[108] = cloneDefs(busJudge102);
  defs[109] = cloneDefs(busIssue103);
  defs[110] = cloneDefs(busIssue104);

  // 地域鉄道用 定期判定情報2/3：202〜204 と同構成
  defs[205] = cloneDefs(railwayJudge202);
  defs[206] = cloneDefs(busIssue103);
  defs[207] = cloneDefs(busIssue104);
  defs[208] = cloneDefs(railwayJudge202);
  defs[209] = cloneDefs(busIssue103);
  defs[210] = cloneDefs(busIssue104);

  return defs;
}

const BLOCK_DEFINITIONS = buildAllBlockDefinitions();

/* =========================================================
   commuter_ticket_release_information 定義
========================================================= */
const COMMUTER_DEFINITIONS = {
  ticketPrintHead: [...commuterPrint31, ...commuterPrint32, ...commuterPrint33, ...commuterPrint34, ...commuterPrint35, ...commuterPrint36, ...commuterPrint37, ...commuterPrint38, ...commuterPrint39],
  busPrivateBlock0: busCommon44,
};

const COMMUTER_TICKET_RELEASE_INFORMATION_DEFINITIONS = [
  { no: 1, name: "IDi", bytes: 8, format: "IDI" },
  { no: 2, name: "リサイクルID", bytes: 1, format: "BIN" },

  { no: 3, name: "発駅コード1", bytes: 2, format: "LINE_STATION_CODE" },
  { no: 4, name: "着駅コード1", bytes: 2, format: "LINE_STATION_CODE" },
  { no: 5, name: "発駅コード2", bytes: 2, format: "LINE_STATION_CODE" },
  { no: 6, name: "着駅コード2", bytes: 2, format: "LINE_STATION_CODE" },
  { no: 7, name: "券種コード", bytes: 4, format: "HEX" },

  { no: "8-1", name: "CLC機能", bytes: 1, format: "SPECIAL" },
  { no: "8-2", name: "特殊印刷情報", bytes: 1, format: "SPECIAL" },

  { no: 9, name: "有効期間", bytes: 1, format: "BIN" },
  { no: 10, name: "定期券開始年月日", bytes: 4, format: "DATE_BCD_YYYYMMDD" },
  { no: 11, name: "定期券終了年月日", bytes: 4, format: "DATE_BCD_YYYYMMDD" },
  { no: 12, name: "定期券ID", bytes: 1, format: "BIN" },
  { no: 13, name: "SF券種コード", bytes: 1, format: "HEX" },
  { no: 14, name: "カード有効年月日", bytes: 4, format: "DATE_BCD_YYYYMMDD" },

  { no: 15, name: "カナ氏名", bytes: 16, format: "JIS_HEX" },
  { no: 16, name: "電話番号", bytes: 6, format: "BCD" },
  { no: 17, name: "カード確認番号", bytes: 2, format: "BCD" },
  { no: 18, name: "生年月日", bytes: 4, format: "DATE_BCD_YYYYMMDD" },
  { no: 19, name: "性別", bytes: 1, format: "BIN" },
  { no: 20, name: "定期地域コード", bytes: 1, format: "HEX" },
  { no: 21, name: "予備", bytes: 4, format: "JIS_HEX" },

  // No.22〜25 は内訳表示するため、ここでは分割しない
];
/* =========================================================
   single_item_details_data 定義
========================================================= */
const SINGLE_ITEM_DETAILS_DEFINITIONS = [
  { no: 1, name: "IDi", bytes: 8, format: "IDI" },
  { no: 2, name: "リサイクルID", bytes: 1, format: "BIN" },
  { no: 3, name: "一件明細レビジョン", bytes: 1, format: "BIN" },
  { no: 4, name: "設定ビットマスク", bytes: 8, format: "HEX" },
  { no: 5, name: "一件明細ID", bytes: 2, format: "BIN" },
  { no: 6, name: "処理コード", bytes: 2, format: "BCD" },
  { no: 7, name: "駅務機器事業者コード", bytes: 2, format: "BUS_OPERATOR_CODE" },
  { no: 8, name: "機種コード", bytes: 1, format: "HEX" },
  { no: 9, name: "駅務機器ID", bytes: 4, format: "LINE_STATION_PLACE_CODE" },
  { no: 10, name: "IC取扱通番", bytes: 2, format: "BIN" },
  { no: 11, name: "年月日", bytes: 4, format: "DATE_BCD_YYYYMMDD" },
  { no: 12, name: "時間", bytes: 3, format: "TIME_BCD_HHMMSS" },
  { no: 13, name: "機能種別", bytes: 1, format: "SPECIAL" },
  { no: 14, name: "カード制御コード", bytes: 1, format: "SPECIAL" },
  { no: 15, name: "利用駅1", bytes: 2, format: "HEX" },
  { no: 16, name: "利用駅2", bytes: 2, format: "HEX" },
  { no: 17, name: "処理種別", bytes: 1, format: "HEX" },
  { no: 18, name: "利用駅種別", bytes: 1, format: "BIN" },
  { no: 19, name: "他社改札通過", bytes: 1, format: "SPECIAL" },
  { no: 20, name: "相手方カードID", bytes: 8, format: "IDI" },
  { no: 21, name: "相手方カードリサイクルID", bytes: 1, format: "BIN" },
  { no: 22, name: "合計利用金額", bytes: 3, format: "BIN_BE" },
  { no: 23, name: "SFログID", bytes: 2, format: "BIN" },
  { no: 24, name: "事業者コード（SF1）", bytes: 2, format: "BUS_OPERATOR_CODE" },
  { no: 25, name: "利用金額（SF1）", bytes: 3, format: "BIN_BE" },
  { no: 26, name: "残額（SF1）", bytes: 3, format: "BIN_BE" },
  { no: 27, name: "入金区分（SF1）", bytes: 1, format: "HEX" },
  { no: 28, name: "プラン識別コード", bytes: 18, format: "HEX" },
  { no: 29, name: "デポジット額", bytes: 2, format: "BIN_BE" },
  { no: 30, name: "入金区分（デポジット）", bytes: 1, format: "HEX" },
  { no: 31, name: "通信未了フラグ", bytes: 1, format: "BIN" },
  { no: 32, name: "SF券種コード", bytes: 1, format: "BIN" },
  { no: 33, name: "売上管理日", bytes: 6, format: "DATETIME_BCD_YYMMDDHHMMSS" },
  { no: 34, name: "予備3", bytes: 2, format: "HEX" },
  { no: 35, name: "予備4", bytes: 2, format: "HEX" },
  { no: 36, name: "予備5", bytes: 2, format: "HEX" },
  { no: 37, name: "予備6", bytes: 2, format: "HEX" },
  { no: 38, name: "割引1社1", bytes: 1, format: "BIN" },
  { no: 39, name: "割引1社2", bytes: 1, format: "BIN" },
  { no: 40, name: "割引2社2", bytes: 1, format: "BIN" },
  { no: 41, name: "割引2社3", bytes: 1, format: "BIN" },
  { no: 42, name: "割引3社3", bytes: 1, format: "BIN" },
  { no: 43, name: "割引3社4", bytes: 1, format: "BIN" },
  { no: 44, name: "連絡駅1", bytes: 2, format: "HEX" },
  { no: 45, name: "連絡駅2", bytes: 2, format: "HEX" },
  { no: 46, name: "連絡駅3", bytes: 2, format: "HEX" },
  { no: 47, name: "改札利用パターン", bytes: 2, format: "SPECIAL" },
  { no: 48, name: "乗車始点駅", bytes: 2, format: "HEX" },
  { no: 49, name: "自線内ピーク運賃", bytes: 2, format: "BIN_LE" },
  { no: 50, name: "利用駅1・2地域識別コード", bytes: 1, format: "SPECIAL" },
  { no: 51, name: "トリップ継続情報", bytes: 1, format: "SPECIAL" },
  { no: 52, name: "サム値", bytes: 1, format: "BIN" },
];

/* =========================================================
   ログ抽出
========================================================= */
function normalizeLogText(text) {
  return text.replace(/\r\n/g, "\n").replace(/""/g, '"');
}

function extractJsonObjects(text) {
  if (!text.trim()) return [];

  const normalized = normalizeLogText(text);
  const results = [];

  const recordRegex = /(?:^|\n)\d{4}\/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}\s*\t\s*"([\s\S]*?)"\s*(?=\n\d{4}\/\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{2}\s*\t\s*"|$)/g;

  let match;

  while ((match = recordRegex.exec(normalized)) !== null) {
    const jsonText = match[1].trim();

    try {
      results.push(JSON.parse(jsonText));
    } catch (e) {
      console.error("JSON parse error:", e);
      console.log(jsonText);
    }
  }

  if (results.length === 0) {
    const first = normalized.indexOf("{");
    const last = normalized.lastIndexOf("}");

    if (first >= 0 && last > first) {
      try {
        results.push(JSON.parse(normalized.slice(first, last + 1)));
      } catch (e) {
        console.error("JSON parse error:", e);
      }
    }
  }

  return results;
}

/* =========================================================
   分割
========================================================= */
function splitByDefinition(defs, hexString, baseOffset = 0) {
  const bytes = hexToBytes(hexString);
  let offset = 0;

  return defs.map((def) => {
    const partBytes = bytes.slice(offset, offset + def.bytes);
    const hex = partBytes.join("");

    const row = {
      ...def,
      byteStart: baseOffset + offset,
      byteEnd: baseOffset + offset + def.bytes - 1,
      byteRange: `${baseOffset + offset} - ${baseOffset + offset + def.bytes - 1}`,
      hex,
      bitString: hexToBin(hex),
      value: parseValue(hex, def.format, def.name),
    };

    offset += def.bytes;
    return row;
  });
}

function splitEncodingBlock(blockNumber, binaryString) {
  const defs = BLOCK_DEFINITIONS[blockNumber] || [];
  return splitByDefinition(defs, binaryString, 0);
}

function splitCommuterTicketRelease(hex) {
  const baseRows = splitByDefinition(COMMUTER_TICKET_RELEASE_INFORMATION_DEFINITIONS, hex, 0);

  const offset22 = COMMUTER_TICKET_RELEASE_INFORMATION_DEFINITIONS.reduce((sum, x) => sum + x.bytes, 0);

  const activeInfoHex = hex.slice(offset22 * 2, (offset22 + 64) * 2);
  const accessInfoHex = hex.slice((offset22 + 64) * 2, (offset22 + 64 + 16) * 2);
  const ticketPrintHex = hex.slice((offset22 + 64 + 16) * 2, (offset22 + 64 + 16 + 160) * 2);
  const judgeHex = hex.slice((offset22 + 64 + 16 + 160) * 2, (offset22 + 64 + 16 + 160 + 48) * 2);

  const ticketPrintHeadHex = ticketPrintHex.slice(0, 144 * 2);
  const busPrivateBlock0Hex = ticketPrintHex.slice(144 * 2, 160 * 2);

  return {
    baseRows,

    activeInfoHex,
    activeInfoRows: splitByDefinition([...activeInfoBlock0, ...activeInfoBlock1, ...activeInfoBlock2, ...activeInfoBlock3], activeInfoHex, offset22),

    accessInfoHex,
    accessInfoRows: splitByDefinition(accessInfoBlock4, accessInfoHex, offset22 + 64),

    ticketPrintHeadHex,
    busPrivateBlock0Hex,
    ticketPrintHeadRows: splitByDefinition(COMMUTER_DEFINITIONS.ticketPrintHead, ticketPrintHeadHex, offset22 + 64 + 16),
    busPrivateBlock0Rows: splitByDefinition(COMMUTER_DEFINITIONS.busPrivateBlock0, busPrivateBlock0Hex, offset22 + 64 + 16 + 144),

    judgeHex,
    judgeRows: splitByDefinition([...railwayJudge41, ...railwayJudge42, ...railwayJudge43], judgeHex, offset22 + 64 + 16 + 160),
  };
}
function splitSingleItemDetails(hex) {
  return splitByDefinition(SINGLE_ITEM_DETAILS_DEFINITIONS, hex, 0);
}

function getParseStatus(parsedLogs, encodingInformation) {
  if (parsedLogs.length === 0) {
    return "ログ未解析：JSON部分を取得できていません。";
  }

  if (encodingInformation.length === 0) {
    return "JSONは読めましたが、extra_data.encoding_information が見つかりません。";
  }

  return `解析成功：ログ ${parsedLogs.length} 件 / encoding_information ${encodingInformation.length} 件`;
}

/* =========================================================
   UI
========================================================= */
function DataTable({ rows, showNo = false }) {
  return (
    <table
      border="1"
      cellPadding="8"
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 14,
      }}
    >
      <thead>
        <tr style={{ background: "#eee" }}>
          {showNo && <th>No</th>}
          <th>項目名</th>
          <th>バイト範囲</th>
          <th>バイト数</th>
          <th>形式</th>
          <th>HEX</th>
          <th>解析値</th>
          <th>bit表示</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {showNo && <td>{r.no}</td>}
            <td>{r.name}</td>
            <td>{r.byteRange}</td>
            <td>{r.bytes}</td>
            <td>{r.format}</td>
            <td style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{r.hex}</td>
            <td style={{ whiteSpace: "pre-line" }}>{r.value}</td>
            <td style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{["BIT", "SPECIAL", "DATE_BITS", "BUS_WRITE_INFO", "BUS_TRANSFER", "BUS_ROUTE"].includes(r.format) ? r.bitString : ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function HexPreview({ title, hex }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <strong>{title}</strong>
      <div style={{ fontSize: 13, color: "#555" }}>
        {hexToBytes(hex).length} Byte / {hex.length} HEX文字
      </div>
      <pre
        style={{
          background: "#f5f5f5",
          padding: 10,
          overflowX: "auto",
          fontFamily: "monospace",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        }}
      >
        {hexToBytes(hex).join(" ")}
      </pre>
    </div>
  );
}

function Section({ title, hex, rows, showNo = false }) {
  return (
    <div
      style={{
        marginTop: 24,
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: 16,
      }}
    >
      <h2>{title}</h2>
      {!hex ? (
        <p style={{ color: "red" }}>{title} が見つかりません。</p>
      ) : (
        <>
          <HexPreview title="HEX Preview" hex={hex} />
          <DataTable rows={rows} showNo={showNo} />
        </>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [logText, setLogText] = useState("");
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedLogIndex, setSelectedLogIndex] = useState(0);
  const [selectedBlock, setSelectedBlock] = useState("");
  const [activeTab, setActiveTab] = useState("encoding");

  const parsedLogs = useMemo(() => extractJsonObjects(logText), [logText]);
  const selectedLog = parsedLogs[selectedLogIndex] || parsedLogs[0];

  const encodingInformation = useMemo(() => {
    return selectedLog?.extra_data?.encoding_information || [];
  }, [selectedLog]);

  const commuterTicketReleaseInformation = selectedLog?.extra_data?.commuter_ticket_release_information || "";

  const singleItemDetailsData = selectedLog?.extra_data?.single_item_details_data || "";

  const singleItemDetailsDataWritingIncomplete = selectedLog?.extra_data?.single_item_details_data_writing_incomplete || "";

  const commuter = useMemo(() => {
    return splitCommuterTicketRelease(commuterTicketReleaseInformation);
  }, [commuterTicketReleaseInformation]);

  const singleItemRows = useMemo(() => {
    return splitSingleItemDetails(singleItemDetailsData);
  }, [singleItemDetailsData]);

  const singleItemWritingIncompleteRows = useMemo(() => {
    return splitSingleItemDetails(singleItemDetailsDataWritingIncomplete);
  }, [singleItemDetailsDataWritingIncomplete]);

  const visibleBlocks = useMemo(() => {
    if (!selectedBlock) return encodingInformation;

    return encodingInformation.filter((x) => String(x.block_number) === String(selectedBlock));
  }, [encodingInformation, selectedBlock]);

  const parseStatus = getParseStatus(parsedLogs, encodingInformation);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      setLoginError("");
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error(error);
      setLoginError("メールアドレスまたはパスワードが違います。");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const loadLogFile = async (file) => {
    const text = await file.text();

    setFileName(file.name);
    setLogText(text);
    setSelectedLogIndex(0);
    setSelectedBlock("");
  };

  if (authLoading) {
    return <div style={{ padding: 20 }}>認証状態を確認中...</div>;
  }

  if (!user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
          background: "#f5f5f5",
        }}
      >
        <div
          style={{
            width: 360,
            padding: 24,
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: 8,
          }}
        >
          <h2 style={{ marginTop: 0 }}>iconpass-tool ログイン</h2>

          <div style={{ marginBottom: 12 }}>
            <label>メールアドレス</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", padding: 8, boxSizing: "border-box" }} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLogin();
              }}
              style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
            />
          </div>

          {loginError && <div style={{ color: "red", marginBottom: 12 }}>{loginError}</div>}

          <button onClick={handleLogin} style={{ width: "100%", padding: 10, cursor: "pointer" }}>
            ログイン
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <h1>iconpass-tool</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13 }}>{user.email}</span>
          <button onClick={handleLogout}>ログアウト</button>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setIsDragging(false);

          const file = e.dataTransfer.files?.[0];
          if (!file) return;

          await loadLogFile(file);
        }}
        style={{
          border: `2px dashed ${isDragging ? "#1976d2" : "#aaa"}`,
          borderRadius: 8,
          padding: 24,
          marginBottom: 16,
          textAlign: "center",
          background: isDragging ? "#e3f2fd" : "#fafafa",
          cursor: "pointer",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: 8 }}>ログファイルをここにドラッグ＆ドロップ</div>
        <div style={{ fontSize: 13, color: "#666" }}>対応形式: .log / .txt / .csv / .json</div>
        <div style={{ marginTop: 8, fontSize: 13 }}>{fileName ? `選択中: ${fileName}` : "未選択"}</div>
      </div>

      <textarea
        style={{
          width: "100%",
          height: 220,
          fontFamily: "monospace",
          fontSize: 13,
          padding: 10,
          boxSizing: "border-box",
        }}
        placeholder="ログを貼り付け、または上のファイル選択から読み込み"
        value={logText}
        onChange={(e) => {
          setLogText(e.target.value);
          setSelectedLogIndex(0);
          setSelectedBlock("");
        }}
      />

      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <strong>{parseStatus}</strong>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <select
          value={selectedLogIndex}
          onChange={(e) => {
            setSelectedLogIndex(Number(e.target.value));
            setSelectedBlock("");
          }}
          disabled={parsedLogs.length === 0}
        >
          {parsedLogs.length === 0 ? (
            <option>ログなし</option>
          ) : (
            parsedLogs.map((log, index) => (
              <option key={index} value={index}>
                {index + 1}件目 / {log.timestamp || "timestampなし"} / {log.extra_data?.common_data?.business_type_code || ""}
              </option>
            ))
          )}
        </select>

        <button onClick={() => setActiveTab("encoding")}>encoding_information</button>

        <button onClick={() => setActiveTab("commuter")}>commuter_ticket_release_information</button>

        <button onClick={() => setActiveTab("singleItem")}>single_item_details_data</button>
      </div>

      {activeTab === "encoding" && (
        <>
          <select value={selectedBlock} onChange={(e) => setSelectedBlock(e.target.value)} disabled={encodingInformation.length === 0}>
            <option value="">全ブロック</option>
            {encodingInformation.map((x) => (
              <option key={x.block_number} value={x.block_number}>
                ブロック {x.block_number}
              </option>
            ))}
          </select>

          {visibleBlocks.map((block) => {
            const rows = splitEncodingBlock(block.block_number, block.binary_string);

            return (
              <div
                key={block.block_number}
                style={{
                  marginTop: 24,
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                <h2>ブロック {block.block_number}</h2>

                <HexPreview title="binary_string" hex={block.binary_string} />

                {rows.length === 0 ? <p style={{ color: "red" }}>このブロックNo.の定義が未登録です。</p> : <DataTable rows={rows} />}
              </div>
            );
          })}
        </>
      )}

      {activeTab === "commuter" && (
        <div
          style={{
            marginTop: 24,
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 16,
          }}
        >
          <h2>commuter_ticket_release_information</h2>

          <h3>No.1〜21</h3>
          <DataTable rows={commuter.baseRows} showNo />

          <div style={{ marginTop: 28 }} />

          <h3>No.22 カード活性情報</h3>
          <HexPreview title="カード活性情報 64Byte" hex={commuter.activeInfoHex} />
          <DataTable rows={commuter.activeInfoRows} />

          <div style={{ marginTop: 28 }} />

          <h3>No.23 アクセスチェック情報</h3>
          <HexPreview title="アクセスチェック情報 16Byte" hex={commuter.accessInfoHex} />
          <DataTable rows={commuter.accessInfoRows} />

          <div style={{ marginTop: 28 }} />

          <h3>No.24 定期券発券印刷情報</h3>
          <HexPreview title="定期券発券印刷情報 前半 144Byte" hex={commuter.ticketPrintHeadHex} />
          <DataTable rows={commuter.ticketPrintHeadRows} />

          <div style={{ marginTop: 28 }} />

          <HexPreview title="バス路面電車独自情報サービス ブロック0 16Byte" hex={commuter.busPrivateBlock0Hex} />
          <DataTable rows={commuter.busPrivateBlock0Rows} />

          <div style={{ marginTop: 28 }} />

          <h3>No.25 定期券判定情報</h3>
          <HexPreview title="定期券判定情報 48Byte" hex={commuter.judgeHex} />
          <DataTable rows={commuter.judgeRows} />
        </div>
      )}

      {activeTab === "singleItem" && (
        <>
          <Section title="single_item_details_data" hex={singleItemDetailsData} rows={singleItemRows} showNo />

          <Section title="single_item_details_data_writing_incomplete" hex={singleItemDetailsDataWritingIncomplete} rows={singleItemWritingIncompleteRows} showNo />
        </>
      )}
    </div>
  );
}
