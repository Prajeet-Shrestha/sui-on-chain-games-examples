#!/usr/bin/env python3
"""Quick solver for Level 5 only with fewer trials."""
import random
from collections import deque

def flood_fill(board, controlled, width, height, color):
    controlled = set(controlled)
    new_board = list(board)
    for idx in controlled:
        new_board[idx] = color
    queue = deque()
    for idx in controlled:
        queue.append(idx)
    while queue:
        idx = queue.popleft()
        x, y = idx % width, idx // width
        for dx, dy in [(-1,0),(1,0),(0,-1),(0,1)]:
            nx, ny = x+dx, y+dy
            if 0 <= nx < width and 0 <= ny < height:
                nidx = ny * width + nx
                if nidx not in controlled and new_board[nidx] == color:
                    controlled.add(nidx)
                    queue.append(nidx)
    return tuple(new_board), frozenset(controlled), len(controlled)

def greedy_solve(board, starts, width, height, num_colors, max_moves):
    board = tuple(board)
    controlled = frozenset(starts)
    total = width * height
    moves = []
    for _ in range(max_moves):
        if len(controlled) == total:
            return moves, True
        current_color = board[next(iter(controlled))]
        best_color, best_count, best_board, best_ctrl = -1, -1, None, None
        for c in range(num_colors):
            if c == current_color:
                continue
            nb, nc2, cnt = flood_fill(board, controlled, width, height, c)
            if cnt > best_count:
                best_color, best_count, best_board, best_ctrl = c, cnt, nb, nc2
        moves.append(best_color)
        board, controlled = best_board, best_ctrl
    return moves, len(controlled) == total

def generate_board(width, height, num_colors, starts, start_color=0):
    board = [random.randint(0, num_colors - 1) for _ in range(width * height)]
    for s in starts:
        board[s] = start_color
    for s in starts:
        x, y = s % width, s // width
        for dx, dy in [(-1,0),(1,0),(0,-1),(0,1)]:
            nx, ny = x+dx, y+dy
            if 0 <= nx < width and 0 <= ny < height:
                nidx = ny * width + nx
                if nidx not in starts and board[nidx] == start_color:
                    board[nidx] = (start_color + 1) % num_colors
    return board

w, h, nc = 12, 12, 7
starts = [0, 11, 138]
TRIALS = 5000
random.seed(123)

print(f"Level 5: Total Extinction (12×12, 7 colors, 3 viruses)")
print(f"Testing {TRIALS} boards...")

best_greedy_moves = 0
best_board = None
best_solution = None
move_counts = {}

for trial in range(TRIALS):
    board = generate_board(w, h, nc, starts)
    moves, solved = greedy_solve(board, set(starts), w, h, nc, 50)
    if solved:
        n = len(moves)
        move_counts[n] = move_counts.get(n, 0) + 1
        if n > best_greedy_moves:
            best_greedy_moves = n
            best_board = list(board)
            best_solution = list(moves)
    if (trial + 1) % 1000 == 0:
        print(f"  ...{trial+1}/{TRIALS} tested, best so far: {best_greedy_moves} moves")

print(f"\nGreedy move distribution (top 10):")
for k in sorted(move_counts.keys(), reverse=True)[:10]:
    bar = '█' * min(move_counts[k] // 5, 40)
    print(f"  {k:2d} moves: {move_counts[k]:5d} boards {bar}")

if best_board:
    print(f"\n✅ HARDEST BOARD: greedy needs {best_greedy_moves} moves")
    row_strs = []
    for row in range(h):
        si = row * w
        row_strs.append(','.join(str(best_board[si + c]) for c in range(w)))
    print(f"Board vector:")
    print(f"  [{', '.join(row_strs)}]")
    print(f"Solution: {best_solution}")
    print(f"\nVisual grid:")
    for row in range(h):
        cells = []
        for col in range(w):
            idx = row * w + col
            c = best_board[idx]
            marker = '★' if idx in starts else ' '
            cells.append(f"{marker}{c}")
        print(f"  {'  '.join(cells)}")
