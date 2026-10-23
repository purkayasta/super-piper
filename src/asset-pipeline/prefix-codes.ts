export interface PrefixCode {
  readonly lengths: Uint8Array;
  readonly codes: Uint32Array;
  readonly usedSymbols: number;
}

interface TreeNode {
  weight: number;
  symbol: number;
  left: TreeNode | null;
  right: TreeNode | null;
}

export function limitedCodeLengths(frequencies: ArrayLike<number>, maxLength: number): Uint8Array {
  const lengths = new Uint8Array(frequencies.length);
  const used: number[] = [];
  for (let symbol = 0; symbol < frequencies.length; symbol++) {
    if (frequencies[symbol] > 0) used.push(symbol);
  }
  if (used.length === 0) return lengths;
  if (used.length === 1) {
    lengths[used[0]] = 1;
    return lengths;
  }
  for (let floor = 1; ; floor *= 2) {
    const depths = huffmanDepths(used, frequencies, floor);
    let deepest = 0;
    for (const depth of depths.values()) deepest = Math.max(deepest, depth);
    if (deepest > maxLength) continue;
    for (const [symbol, depth] of depths) lengths[symbol] = depth;
    return lengths;
  }
}

export function canonicalCodes(lengths: Uint8Array): PrefixCode {
  const maxLength = lengths.reduce((max, length) => Math.max(max, length), 0);
  const countPerLength = new Uint32Array(maxLength + 1);
  let usedSymbols = 0;
  for (const length of lengths) {
    if (length === 0) continue;
    countPerLength[length]++;
    usedSymbols++;
  }
  const nextCode = new Uint32Array(maxLength + 1);
  let code = 0;
  for (let length = 1; length <= maxLength; length++) {
    code = (code + countPerLength[length - 1]) << 1;
    nextCode[length] = code;
  }
  const codes = new Uint32Array(lengths.length);
  for (let symbol = 0; symbol < lengths.length; symbol++) {
    const length = lengths[symbol];
    if (length === 0) continue;
    codes[symbol] = reverseBits(nextCode[length]++, length);
  }
  return { lengths, codes, usedSymbols };
}

export function kraftSum(lengths: Uint8Array): number {
  let sum = 0;
  for (const length of lengths) if (length > 0) sum += 2 ** -length;
  return sum;
}

export function reverseBits(value: number, bitCount: number): number {
  let reversed = 0;
  for (let bit = 0; bit < bitCount; bit++)
    reversed |= ((value >>> bit) & 1) << (bitCount - 1 - bit);
  return reversed >>> 0;
}

function huffmanDepths(
  used: readonly number[],
  frequencies: ArrayLike<number>,
  floor: number,
): Map<number, number> {
  let queue: TreeNode[] = used.map((symbol) => ({
    weight: Math.max(frequencies[symbol], floor),
    symbol,
    left: null,
    right: null,
  }));
  while (queue.length > 1) {
    queue.sort((a, b) => a.weight - b.weight || a.symbol - b.symbol);
    const [first, second] = queue;
    queue = queue.slice(2);
    queue.push({
      weight: first.weight + second.weight,
      symbol: Math.min(first.symbol, second.symbol),
      left: first,
      right: second,
    });
  }
  const depths = new Map<number, number>();
  const visit = (node: TreeNode, depth: number): void => {
    if (node.left && node.right) {
      visit(node.left, depth + 1);
      visit(node.right, depth + 1);
      return;
    }
    depths.set(node.symbol, depth);
  };
  visit(queue[0], 0);
  return depths;
}
