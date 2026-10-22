export function parseTileRows(
  rows: readonly string[],
  legend: Readonly<Record<string, number>>,
): { tiles: number[][]; width: number; height: number } {
  const width = rows.length > 0 ? rows[0].length : 0;
  const tiles: number[][] = [];
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    if (row.length !== width) {
      throw new Error(`Row ${r} has length ${row.length}, expected ${width}`);
    }
    const parsed: number[] = [];
    for (let c = 0; c < row.length; c++) {
      const symbol = row[c];
      if (!Object.hasOwn(legend, symbol)) {
        throw new Error(`Unknown tile symbol "${symbol}" at row ${r}, col ${c}`);
      }
      parsed.push(legend[symbol]);
    }
    tiles.push(parsed);
  }
  return { tiles, width, height: rows.length };
}

export interface TileCoordinate {
  column: number;
  row: number;
}

export function findSymbol(rows: readonly string[], symbol: string): TileCoordinate | null {
  for (let row = 0; row < rows.length; row++) {
    const column = rows[row].indexOf(symbol);
    if (column >= 0) return { column, row };
  }
  return null;
}
