import type { Market } from "./types";

export interface InstrumentPreset {
  symbol: string;
  market: Market;
  /** Value of a 1.0 price move for a size of 1 (lot / contract / share). */
  pointValue: number;
  /** Size step used when rounding the position size. */
  step: number;
  /** Unit label for size. */
  unit: "lots" | "contracts" | "shares" | "units";
  decimals: number;
}

/**
 * Common instruments with standard contract specs. Point values are in the quote currency;
 * the trader can always edit the value for their broker.
 */
export const INSTRUMENTS: InstrumentPreset[] = [
  { symbol: "EURUSD", market: "forex", pointValue: 100000, step: 0.01, unit: "lots", decimals: 5 },
  { symbol: "GBPUSD", market: "forex", pointValue: 100000, step: 0.01, unit: "lots", decimals: 5 },
  { symbol: "USDJPY", market: "forex", pointValue: 1000, step: 0.01, unit: "lots", decimals: 3 },
  { symbol: "AUDUSD", market: "forex", pointValue: 100000, step: 0.01, unit: "lots", decimals: 5 },
  { symbol: "XAUUSD", market: "commodities", pointValue: 100, step: 0.01, unit: "lots", decimals: 2 },
  { symbol: "US500", market: "indices", pointValue: 1, step: 0.1, unit: "contracts", decimals: 1 },
  { symbol: "NAS100", market: "indices", pointValue: 1, step: 0.1, unit: "contracts", decimals: 1 },
  { symbol: "GER40", market: "indices", pointValue: 1, step: 0.1, unit: "contracts", decimals: 1 },
  { symbol: "ES", market: "futures", pointValue: 50, step: 1, unit: "contracts", decimals: 2 },
  { symbol: "MES", market: "futures", pointValue: 5, step: 1, unit: "contracts", decimals: 2 },
  { symbol: "NQ", market: "futures", pointValue: 20, step: 1, unit: "contracts", decimals: 2 },
  { symbol: "MNQ", market: "futures", pointValue: 2, step: 1, unit: "contracts", decimals: 2 },
  { symbol: "BTCUSD", market: "crypto", pointValue: 1, step: 0.001, unit: "units", decimals: 1 },
  { symbol: "ETHUSD", market: "crypto", pointValue: 1, step: 0.01, unit: "units", decimals: 2 },
  { symbol: "AAPL", market: "stocks", pointValue: 1, step: 1, unit: "shares", decimals: 2 },
  { symbol: "NVDA", market: "stocks", pointValue: 1, step: 1, unit: "shares", decimals: 2 },
  { symbol: "MSFT", market: "stocks", pointValue: 1, step: 1, unit: "shares", decimals: 2 },
];

export const findInstrument = (symbol: string) =>
  INSTRUMENTS.find((i) => i.symbol.toUpperCase() === symbol.trim().toUpperCase());

export const MARKETS: Market[] = ["forex", "indices", "futures", "stocks", "crypto", "commodities"];

export function roundToStep(value: number, step: number) {
  const n = Math.floor(value / step) * step;
  const d = Math.max(0, -Math.floor(Math.log10(step)));
  return Number(n.toFixed(d));
}
