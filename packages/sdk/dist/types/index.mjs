import {
  RESOURCE_ORDER
} from "../chunk-EBQGTPWR.mjs";

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
export {
  ChartType,
  LineType,
  RESOURCE_ORDER,
  TimeInterval,
  TimeWindow
};
