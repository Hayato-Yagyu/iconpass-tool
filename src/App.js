import React, { useMemo, useState } from "react";
import "./App.css";

const BLOCK_DEFINITIONS = {
  4: [
    { name: "相手方カードID", bytes: 8, format: "BIN" },
    { name: "カード制御コード", bytes: 1, format: "BIT" },
    { name: "エラーカウンタ", bytes: 2, format: "BIT" },
    { name: "パース合計金額", bytes: 3, format: "BIN" },
    { name: "一件明細ID", bytes: 2, format: "BIN" },
  ],
  32: [
    { name: "券番号", bytes: 2, format: "BCD" },
    { name: "発売所コード", bytes: 4, format: "HEX" },
    { name: "カード印章コード", bytes: 1, format: "BIT" },
    { name: "運賃", bytes: 3, format: "BIN" },
    { name: "クレジット発行番号", bytes: 2, format: "BCD" },
    { name: "処理順コード", bytes: 1, format: "BIT" },
    { name: "複数枚定期券印章", bytes: 1, format: "BIT" },
    { name: "共通予備", bytes: 2, format: "BIN" },
  ],
  36: [
    { name: "特別車両定期発駅コード1", bytes: 2, format: "BIN" },
    { name: "特別車両定期着駅コード1", bytes: 2, format: "BIN" },
    { name: "特別車両定期発駅コード2", bytes: 2, format: "BIN" },
    { name: "特別車両定期着駅コード2", bytes: 2, format: "BIN" },
    { name: "キャッシュレス情報", bytes: 1, format: "BIT" },
    { name: "特殊印刷情報", bytes: 1, format: "BIT" },
    { name: "空き", bytes: 2, format: "BIN" },
    { name: "定期券再発行年月日", bytes: 2, format: "DATE_BITS" },
    { name: "機種コード", bytes: 1, format: "BIN" },
    { name: "空き", bytes: 1, format: "BIN" },
  ],
  39: [
    { name: "社員コード", bytes: 3, format: "BIN" },
    { name: "空き", bytes: 4, format: "BIN" },
    { name: "割引コード2", bytes: 1, format: "BIN" },
    { name: "運賃2", bytes: 3, format: "BIN" },
    { name: "定期券ID", bytes: 1, format: "BIN" },
    { name: "空き", bytes: 4, format: "BIN" },
  ],
  200: [{ name: "氏名", bytes: 16, format: "HEX" }],
  201: [
    { name: "電話番号", bytes: 6, format: "BCD" },
    { name: "カード検索番号", bytes: 2, format: "BCD" },
    { name: "年齢", bytes: 1, format: "BCD" },
    { name: "生年月日", bytes: 2, format: "DATE_BITS" },
    { name: "予備", bytes: 5, format: "BIN" },
  ],
  202: [
    { name: "バス路面電車事業者コード", bytes: 2, format: "HEX" },
    { name: "開始年月日", bytes: 2, format: "DATE_BITS" },
    { name: "終了年月日", bytes: 2, format: "DATE_BITS" },
    { name: "券種コード", bytes: 1, format: "BIT" },
    { name: "発駅コード", bytes: 2, format: "BIN" },
    { name: "着駅コード", bytes: 2, format: "BIN" },
    { name: "経由駅コード1", bytes: 2, format: "BIN" },
    { name: "経由駅コード2", bytes: 2, format: "BIN" },
    { name: "地域識別コード", bytes: 1, format: "BIT" },
  ],
  203: [
    { name: "発行日", bytes: 2, format: "DATE_BITS" },
    { name: "発売金額", bytes: 2, format: "BIN" },
    { name: "発売通用期間", bytes: 1, format: "BIN" },
    { name: "割引コード1", bytes: 1, format: "BIN" },
    { name: "割引コード2", bytes: 1, format: "BIN" },
    { name: "発売共通制御コード", bytes: 1, format: "BIT" },
    { name: "カード印章コード", bytes: 1, format: "BIT" },
    { name: "機種コード", bytes: 1, format: "BIT" },
    { name: "バス定期券ID", bytes: 1, format: "BIN" },
    { name: "発行所番号・発行機号機コード", bytes: 4, format: "HEX" },
    { name: "予備", bytes: 1, format: "BIN" },
  ],
  204: [
    { name: "原券発行日", bytes: 2, format: "DATE_BITS" },
    { name: "使用開始日", bytes: 2, format: "DATE_BITS" },
    { name: "運休延長日数", bytes: 1, format: "BCD" },
    { name: "券番号", bytes: 3, format: "BCD" },
    { name: "リファレンスペーパー再印字回数", bytes: 1, format: "BCD" },
    { name: "クレジット発行番号", bytes: 2, format: "BCD" },
    { name: "予備", bytes: 5, format: "HEX" },
  ],
};

const COMMUTER_DEFINITIONS = {
  ticketPrintHead: [
    { name: "事業者コード", bytes: 2, format: "HEX" },
    { name: "有効期間", bytes: 1, format: "BIN" },
    { name: "割引コード", bytes: 1, format: "BIN" },
    { name: "発券不可情報", bytes: 1, format: "BIT" },
    { name: "学年", bytes: 1, format: "BIT" },
    { name: "発行区分", bytes: 1, format: "BIN" },
    { name: "原券発行日", bytes: 2, format: "DATE_BITS" },
    { name: "使用開始日", bytes: 2, format: "DATE_BITS" },
    { name: "日調日数", bytes: 1, format: "BCD" },
    { name: "運休延長日数", bytes: 1, format: "BCD" },
    { name: "一括社番", bytes: 2, format: "BCD" },
    { name: "券番号上位", bytes: 1, format: "BCD" },
    { name: "券番号下位", bytes: 2, format: "BCD" },
    { name: "発売所コード", bytes: 4, format: "HEX" },
    { name: "カード印章コード", bytes: 1, format: "BIT" },
    { name: "運賃", bytes: 3, format: "BIN" },
    { name: "クレジット発行番号", bytes: 2, format: "BCD" },
    { name: "処理順コード", bytes: 1, format: "BIT" },
    { name: "複数枚定期券印章", bytes: 1, format: "BIT" },
    { name: "共通予備", bytes: 2, format: "HEX" },
    { name: "発駅側接続・乗換コード", bytes: 2, format: "BIN" },
    { name: "着駅側接続・乗換コード", bytes: 2, format: "BIN" },
    { name: "経由印刷情報1", bytes: 12, format: "HEX" },
    { name: "経由印刷情報2", bytes: 16, format: "HEX" },
    { name: "経由印刷情報3", bytes: 8, format: "HEX" },
    { name: "新幹線の乗車駅1", bytes: 2, format: "BIN" },
    { name: "新幹線の降車駅1", bytes: 2, format: "BIN" },
    { name: "新幹線の乗車駅2", bytes: 2, format: "BIN" },
    { name: "新幹線の降車駅2", bytes: 2, format: "BIN" },
    { name: "特別車両定期発駅コード1", bytes: 2, format: "BIN" },
    { name: "特別車両定期着駅コード1", bytes: 2, format: "BIN" },
    { name: "特別車両定期発駅コード2", bytes: 2, format: "BIN" },
    { name: "特別車両定期着駅コード2", bytes: 2, format: "BIN" },
    { name: "キャッシュレス情報", bytes: 1, format: "BIT" },
    { name: "特殊印刷情報", bytes: 1, format: "BIT" },
    { name: "空き", bytes: 2, format: "HEX" },
    { name: "定期券再発行年月日", bytes: 2, format: "DATE_BITS" },
    { name: "機種コード", bytes: 1, format: "BIN" },
    { name: "空き", bytes: 1, format: "HEX" },
    { name: "後方情報【マルス】", bytes: 16, format: "HEX" },
    { name: "後方情報", bytes: 4, format: "HEX" },
    { name: "商品管理コード", bytes: 12, format: "HEX" },
    { name: "社員コード", bytes: 3, format: "BIN" },
    { name: "空き", bytes: 4, format: "HEX" },
    { name: "割引コード2", bytes: 1, format: "BIN" },
    { name: "運賃2", bytes: 3, format: "BIN" },
    { name: "定期券ID", bytes: 1, format: "BIN" },
    { name: "空き", bytes: 4, format: "HEX" },
  ],
  busPrivateBlock0: [
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
  ],
};

const SINGLE_ITEM_DETAILS_DEFINITIONS = [
  { no: 1, name: "IDi", bytes: 8, format: "HEX" },
  { no: 2, name: "リサイクルID", bytes: 1, format: "BIN" },
  { no: 3, name: "一件明細レビジョン", bytes: 1, format: "BIN" },
  { no: 4, name: "設定ビットマスク", bytes: 8, format: "HEX" },
  { no: 5, name: "一件明細ID", bytes: 2, format: "BIN" },
  { no: 6, name: "処理コード", bytes: 2, format: "BCD" },
  { no: 7, name: "駅務機器事業者コード", bytes: 2, format: "HEX" },
  { no: 8, name: "機種コード", bytes: 1, format: "HEX" },
  { no: 9, name: "駅務機器ID", bytes: 4, format: "HEX" },
  { no: 10, name: "IC取扱通番", bytes: 2, format: "BIN" },
  { no: 11, name: "年月日", bytes: 4, format: "DATE_BCD_YYYYMMDD" },
  { no: 12, name: "時間", bytes: 3, format: "TIME_BCD_HHMMSS" },
  { no: 13, name: "機能種別", bytes: 1, format: "BIT" },
  { no: 14, name: "カード制御コード", bytes: 1, format: "BIT" },
  { no: 15, name: "利用駅1", bytes: 2, format: "HEX" },
  { no: 16, name: "利用駅2", bytes: 2, format: "HEX" },
  { no: 17, name: "処理種別", bytes: 1, format: "HEX" },
  { no: 18, name: "利用駅種別", bytes: 1, format: "BIN" },
  { no: 19, name: "他社改札通過", bytes: 1, format: "BIT" },
  { no: 20, name: "相手方カードID", bytes: 8, format: "HEX" },
  { no: 21, name: "相手方カードリサイクルID", bytes: 1, format: "BIN" },
  { no: 22, name: "合計利用金額", bytes: 3, format: "BIN" },
  { no: 23, name: "SFログID", bytes: 2, format: "BIN" },
  { no: 24, name: "事業者コード（SF1）", bytes: 2, format: "HEX" },
  { no: 25, name: "利用金額（SF1）", bytes: 3, format: "BIN" },
  { no: 26, name: "残額（SF1）", bytes: 3, format: "BIN" },
  { no: 27, name: "入金区分（SF1）", bytes: 1, format: "HEX" },
  { no: 28, name: "プラン識別コード", bytes: 18, format: "HEX" },
  { no: 29, name: "デポジット額", bytes: 2, format: "BIN" },
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
  { no: 47, name: "改札利用パターン", bytes: 2, format: "BIT" },
  { no: 48, name: "乗車始点駅", bytes: 2, format: "HEX" },
  { no: 49, name: "自線内ピーク運賃", bytes: 2, format: "BIN" },
  { no: 50, name: "利用駅1・2地域識別コード", bytes: 1, format: "BIT" },
  { no: 51, name: "トリップ継続情報", bytes: 1, format: "BIT" },
  { no: 52, name: "サム値", bytes: 1, format: "BIN" },
];

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

function parseBcd(hex) {
  return hex.replace(/F/gi, "");
}

function parseDateBits(hex) {
  const value = parseInt(hex, 16);
  if (Number.isNaN(value)) return "";

  const year = (value >> 9) & 0x7f;
  const month = (value >> 5) & 0x0f;
  const day = value & 0x1f;

  return `20${String(year).padStart(2, "0")}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
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

  return `地域番号:${region} / ユーザコード:${userCode}`;
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

function parseValue(hex, format, name = "") {
  if (!hex) return "";

  if (name === "入金区分（デポジット）") {
    return parseDepositPaymentType(hex);
  }

  if (name === "SF券種コード") {
    return parseSfTicketType(hex);
  }

  if (name === "通信未了フラグ") {
    return parseCommunicationIncompleteFlag(hex);
  }

  switch (format) {
    case "BIN":
      return parseInt(hex, 16).toString();
    case "BCD":
      return parseBcd(hex);
    case "BIT":
      return hexToBin(hex);
    case "DATE_BITS":
      return parseDateBits(hex);
    case "TIME_BCD":
      return parseTimeBcd(hex);
    case "TIME_BCD_HHMMSS":
      return parseTimeBcdHhMmSs(hex);
    case "DATE_BCD_YYYYMMDD":
      return parseDateBcdYyyyMmDd(hex);
    case "DATETIME_BCD_YYMMDDHHMMSS":
      return parseDateTimeBcdYyMmDdHhMmSs(hex);
    case "BUS_WRITE_INFO":
      return parseBusWriteInfo(hex);
    case "BUS_OPERATOR_CODE":
      return parseBusOperatorCode(hex);
    case "BUS_TRANSFER":
      return parseBusTransfer(hex);
    case "BUS_ROUTE":
      return parseBusRoute(hex);
    case "HEX":
    default:
      return hex;
  }
}

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
  const ticketPrintHeadHex = hex.slice(0, 144 * 2);
  const busPrivateBlock0Hex = hex.slice(144 * 2, 160 * 2);
  const remainingHex = hex.slice(160 * 2);

  return {
    ticketPrintHeadHex,
    busPrivateBlock0Hex,
    remainingHex,
    ticketPrintHeadRows: splitByDefinition(COMMUTER_DEFINITIONS.ticketPrintHead, ticketPrintHeadHex, 0),
    busPrivateBlock0Rows: splitByDefinition(COMMUTER_DEFINITIONS.busPrivateBlock0, busPrivateBlock0Hex, 144),
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
            <td style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{r.format === "BIT" || r.format === "DATE_BITS" || r.format === "BUS_WRITE_INFO" || r.format === "BUS_TRANSFER" || r.format === "BUS_ROUTE" ? r.bitString : ""}</td>
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
  const [logText, setLogText] = useState("");
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

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1>iconpass-tool</h1>

      <textarea
        style={{
          width: "100%",
          height: 220,
          fontFamily: "monospace",
          fontSize: 13,
          padding: 10,
          boxSizing: "border-box",
        }}
        placeholder="ログを貼り付け"
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

          {!commuterTicketReleaseInformation ? (
            <p style={{ color: "red" }}>commuter_ticket_release_information が見つかりません。</p>
          ) : (
            <>
              <div style={{ marginBottom: 12 }}>
                <strong>全体サイズ：</strong>
                {hexToBytes(commuterTicketReleaseInformation).length} Byte / {commuterTicketReleaseInformation.length} HEX文字
              </div>

              <HexPreview title="定期券発券印刷情報 前半 144Byte" hex={commuter.ticketPrintHeadHex} />

              <DataTable rows={commuter.ticketPrintHeadRows} />

              <div style={{ marginTop: 28 }} />

              <HexPreview title="バス路面電車独自情報サービス ブロック0 16Byte" hex={commuter.busPrivateBlock0Hex} />

              <DataTable rows={commuter.busPrivateBlock0Rows} />

              {commuter.remainingHex && (
                <>
                  <div style={{ marginTop: 28 }} />
                  <HexPreview title="残りデータ" hex={commuter.remainingHex} />
                </>
              )}
            </>
          )}
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
