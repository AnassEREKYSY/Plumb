import type { Dictionary } from "./dictionaries/en";

type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;
type Paths<T> = T extends string ? never : { [K in keyof T]: T[K] extends string ? K : Join<K, Paths<T[K]>> }[keyof T];
export type TKey = Paths<Dictionary>;
export type TFn = (key: TKey, vars?: Record<string, string | number>) => string;

export function makeT(dict: Dictionary): TFn {
  return (key, vars) => {
    let node: unknown = dict;
    for (const part of key.split(".")) node = (node as Record<string, unknown>)?.[part];
    let s = typeof node === "string" ? node : key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}
