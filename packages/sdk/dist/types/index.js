"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// types/index.ts
var types_exports = {};
__export(types_exports, {
  ChartType: () => ChartType,
  LineType: () => LineType,
  RESOURCE_ORDER: () => RESOURCE_ORDER,
  TimeInterval: () => TimeInterval,
  TimeWindow: () => TimeWindow
});
module.exports = __toCommonJS(types_exports);

// types/charts.ts
var ChartType = /* @__PURE__ */ ((ChartType2) => {
  ChartType2["PRICE"] = "Price Chart";
  ChartType2["DEPTH"] = "Depth";
  ChartType2["ORDER_BOOK"] = "Order Book";
  ChartType2["VOLUME"] = "VOLUME";
  ChartType2["LIQUIDITY"] = "LIQUIDITY";
  return ChartType2;
})(ChartType || {});
var TimeWindow = /* @__PURE__ */ ((TimeWindow2) => {
  TimeWindow2["D"] = "D";
  TimeWindow2["W"] = "W";
  TimeWindow2["M"] = "M";
  return TimeWindow2;
})(TimeWindow || {});
var TimeInterval = /* @__PURE__ */ ((TimeInterval2) => {
  TimeInterval2["I5M"] = "I5M";
  TimeInterval2["I15M"] = "I15M";
  TimeInterval2["I30M"] = "I30M";
  TimeInterval2["I4H"] = "I4H";
  TimeInterval2["I1D"] = "I1D";
  return TimeInterval2;
})(TimeInterval || {});
var LineType = /* @__PURE__ */ ((LineType2) => {
  LineType2["MarketPrice"] = "marketPrice";
  LineType2["IndexPrice"] = "indexPrice";
  LineType2["ResourcePrice"] = "resourcePrice";
  LineType2["TrailingAvgPrice"] = "trailingAvgPrice";
  return LineType2;
})(LineType || {});

// types/resources.ts
var RESOURCE_ORDER = [
  "ethereum-gas",
  "base-gas",
  "arbitrum-gas",
  "ethereum-blobspace",
  "celestia-blobspace",
  "bitcoin-fees"
];
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ChartType,
  LineType,
  RESOURCE_ORDER,
  TimeInterval,
  TimeWindow
});
