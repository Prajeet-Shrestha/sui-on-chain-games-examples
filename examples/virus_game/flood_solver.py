#!/usr/bin/env python3
"""
Flood-It board generator: finds boards that are hard for greedy solver.
For each level config, generates many random boards and picks the one 
where greedy takes the most moves.
"""
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
    """Generate random board with start cells set to start_color."""
    board = [random.randint(0, num_colors - 1) for _ in range(width * height)]
    for s in starts:
        board[s] = start_color
    # Ensure no start neighbor is same color (to avoid trivial first move)
    for s in starts:
        x, y = s % width, s // width
        for dx, dy in [(-1,0),(1,0),(0,-1),(0,1)]:
            nx, ny = x+dx, y+dy
            if 0 <= nx < width and 0 <= ny < height:
                nidx = ny * width + nx
                if nidx not in starts and board[nidx] == start_color:
                    board[nidx] = (start_color + 1) % num_colors
    return board

# Level configs
configs = {
    2: {"name": "Outbreak", "w": 6, "h": 6, "colors": 5, "starts": [0], "target_greedy": 15},
    3: {"name": "Pandemic", "w": 8, "h": 8, "colors": 6, "starts": [0], "target_greedy": 23},
    4: {"name": "Contagion", "w": 10, "h": 10, "colors": 6, "starts": [0, 99], "target_greedy": 25},
    5: {"name": "Total Extinction", "w": 12, "h": 12, "colors": 7, "starts": [0, 11, 138], "target_greedy": 28},
}

TRIALS = 20000
random.seed(42)

for lvl, cfg in sorted(configs.items()):
    print(f"\n{'═'*60}")
    print(f"Level {lvl}: {cfg['name']} ({cfg['w']}×{cfg['h']}, {cfg['colors']} colors)")
    print(f"Target: greedy needs ≥{cfg['target_greedy']} moves")
    print(f"Testing {TRIALS} random boards...")
    
    best_greedy_moves = 0
    best_board = None
    best_solution = None
    
    # Track distribution
    move_counts = {}
    
    for trial in range(TRIALS):
        board = generate_board(cfg['w'], cfg['h'], cfg['colors'], cfg['starts'])
        # Use a high max_moves to see true greedy difficulty
        moves, solved = greedy_solve(board, set(cfg['starts']), cfg['w'], cfg['h'], cfg['colors'], 50)
        if solved:
            n = len(moves)
            move_counts[n] = move_counts.get(n, 0) + 1
            if n > best_greedy_moves:
                best_greedy_moves = n
                best_board = list(board)
                best_solution = list(moves)
    
    print(f"\nGreedy move distribution (top 10):")
    for k in sorted(move_counts.keys(), reverse=True)[:10]:
        bar = '█' * min(move_counts[k] // 10, 40)
        print(f"  {k:2d} moves: {move_counts[k]:5d} boards {bar}")
    
    if best_board:
        print(f"\n✅ HARDEST BOARD FOUND: greedy needs {best_greedy_moves} moves")
        # Format board vector
        row_strs = []
        for row in range(cfg['h']):
            start_idx = row * cfg['w']
            row_strs.append(','.join(str(best_board[start_idx + c]) for c in range(cfg['w'])))
        print(f"Board vector:")
        print(f"  [{', '.join(row_strs)}]")
        print(f"Solution: {best_solution}")
        
        # Print visual grid
        print(f"\nVisual grid:")
        colors = ['🔴','🔵','🟢','🟡','🟣','🟠','🔷']
        for row in range(cfg['h']):
            cells = []
            for col in range(cfg['w']):
                idx = row * cfg['w'] + col
                c = best_board[idx]
                marker = '★' if idx in cfg['starts'] else ' '
                cells.append(f"{marker}{c}")
            print(f"  {'  '.join(cells)}")
    else:
        print(f"❌ No solvable board found!")

print(f"\n{'═'*60}")
print("DONE — Copy the hardest boards into level_design.md")
