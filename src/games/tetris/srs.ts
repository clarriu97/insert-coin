export type PieceKind = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';
export type Rotation = 0 | 1 | 2 | 3;
export type Offset = readonly [number, number];

export const PIECE_KINDS: readonly PieceKind[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

interface Shape {
    size: number;
    cells: readonly Offset[];
}

const SHAPES: Readonly<Record<PieceKind, Shape>> = {
    I: { size: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
    J: { size: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
    L: { size: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
    O: { size: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
    S: { size: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
    T: { size: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
    Z: { size: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] }
};

function rotateClockwise(cells: readonly Offset[], size: number): Offset[] {
    return cells.map(([x, y]) => [size - 1 - y, x]);
}

function rotations({ size, cells }: Shape): Offset[][] {
    const states: Offset[][] = [[...cells]];
    for (let index = 1; index < 4; index++) {
        states.push(rotateClockwise(states[index - 1] ?? [], size));
    }
    return states;
}

const ROTATIONS = Object.fromEntries(
    PIECE_KINDS.map((kind) => [kind, rotations(SHAPES[kind])])
) as Record<PieceKind, Offset[][]>;

export function cells(kind: PieceKind, rotation: Rotation): readonly Offset[] {
    return ROTATIONS[kind][rotation] ?? [];
}

export function spawnColumn(kind: PieceKind): number {
    return kind === 'O' ? 4 : 3;
}

type KickTable = Readonly<Record<string, readonly Offset[]>>;

const JLSTZ_KICKS: KickTable = {
    '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
};

const I_KICKS: KickTable = {
    '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
    '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
};

const NO_KICKS: readonly Offset[] = [[0, 0]];

export function kicks(kind: PieceKind, from: Rotation, to: Rotation): Offset[] {
    if (kind === 'O') return [...NO_KICKS];
    const table = kind === 'I' ? I_KICKS : JLSTZ_KICKS;
    return (table[`${from}>${to}`] ?? NO_KICKS).map(([x, y]) => [x, -y]);
}
