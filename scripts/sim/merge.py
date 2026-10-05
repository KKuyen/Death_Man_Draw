#!/usr/bin/env python3
"""First-market purchase association within each policy; avoids survival bias, not a causal estimate."""
import json
import math
from pathlib import Path
import sys

root = Path(sys.argv[1])
files = sorted(root.glob('*.raw.json'))
if not files:
    sys.exit('Không có shard hoàn tất để tổng hợp.')
raws = [json.loads(f.read_text()) for f in files]
config, catalog = raws[0]['config'], raws[0]['catalog']
if any(r['config'] != config or r['catalog'] != catalog for r in raws):
    sys.exit('Các shard dùng cấu hình/catalog khác nhau; hãy dùng thư mục kết quả mới.')
if len({r['seed'] for r in raws}) != len(raws):
    sys.exit('Seed shard bị trùng.')
summaries = [json.loads(f.with_name(f.name.replace('.raw.json', '.json')).read_text()) for f in files]
violations = [v for s in summaries for v in s['violations']]
H = [h for r in raws for h in r['holders']]
usage, money, hands = {}, {}, []
for r in raws:
    for k, v in r['usage'].items():
        u = usage.setdefault(k, {'bought': 0, 'used': 0, 'heldHands': 0})
        for key in u:
            u[key] += v.get(key, 0)
    for k, v in r['money'].items():
        money[k] = money.get(k, 0) + v
    hands += r['handsPerGame']
pols = ['all', 'cheap', 'none', 'smart']
wins = {p: sum(h['won'] for h in H if h['policy'] == p) for p in pols}
total = sum(wins.values())
if not hands or not total:
    sys.exit('Không có trận kết thúc hợp lệ.')
study = []
for m in catalog:
    cid = m['id']
    n = won = expect = variance = 0
    for p in pols:
        group = [h for h in H if h['policy'] == p]
        base = [h for h in group if cid not in h['first']]
        held = [h for h in group if cid in h['first']]
        if not held or not base:
            continue
        held_wins = sum(h['won'] for h in held)
        ph, pb = held_wins / len(held), sum(h['won'] for h in base) / len(base)
        n += len(held); won += held_wins; expect += len(held) * pb
        variance += len(held) * ph * (1 - ph) + len(held) ** 2 * pb * (1 - pb) / len(base)
    u = usage.get(cid, {'bought': 0, 'used': 0, 'heldHands': 0})
    delta = (won - expect) / n * 100 if n else None
    se = math.sqrt(variance) / n * 100 if n else None
    flags = []
    if not u['bought']: flags.append('NEVER_BOUGHT')
    if delta is not None and abs(delta) > 5:
        flags.append('DELTA>5' if abs(delta) > 1.96 * se else 'delta>5(noisy)')
    study.append({**m, **u, 'firstBuyers': n, 'winDeltaPts': round(delta, 2) if delta is not None else None,
                  'seDeltaPts': round(se, 2) if se is not None else None,
                  'realisedChipsPerBuy': round(money[cid] / max(1, u['bought']), 1) if cid in money else None, 'flags': flags})
report = {'config': config, 'seeds': [r['seed'] for r in raws], 'games': len(H) // 4,
          'finished': sum(s['summary']['finished'] for s in summaries), 'capped': sum(s['summary']['capped'] for s in summaries),
          'violations': violations, 'handsMean': round(sum(hands) / len(hands), 2),
          'winRateByPolicy': {p: round(wins[p] / total, 4) for p in pols}, 'winsByPolicy': wins, 'cards': study}
(root / 'merged.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
fmt = lambda x: '—' if x is None else str(x)
lines = ['# Khảo sát cân bằng Bài Phép', '',
         f"{report['games']} trận; {report['handsMean']} ván/trận; {len(violations)} vi phạm; {report['capped']} trận chạm trần.", '',
         f"Cấu hình: `{json.dumps(config)}`. Seed shard: `{report['seeds']}`.", '',
         'Tỷ lệ thắng: ' + ', '.join(f'{p} {wins[p]}/{total} ({wins[p]/total:.1%})' for p in pols) + '.', '',
         'Delta là chênh lệch tỷ lệ thắng của người mua lá ở chợ đầu so với người không mua cùng chính sách, tính bằng điểm phần trăm. '
         'Đây là liên hệ quan sát, không chứng minh tác động nhân quả; chọn mua vẫn phụ thuộc offer và tổ hợp lá khác. '
         'SE xấp xỉ tính cả nhóm mua và nhóm đối chứng; các trận có tương quan giữa ghế, chưa hiệu chỉnh 22 phép so sánh.', '',
         'Dùng = lệnh kích hoạt/tráo thành công; nội tại không phát lệnh này nên có thể bằng 0. '
         'Ván giữ = tổng số ván lá nằm trong khay lúc chia. Chip/mua chỉ đo tiền thực nhận N01/N02/N06, chưa đo EV của lá thông tin/phòng thủ/tráo.', '',
         '| ID | Tên | Giá gốc | Mua | Dùng | Ván giữ | Mua chợ đầu | Delta (đpt) | SE (đpt) | Chip/mua | Cờ |',
         '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|']
for s in study:
    lines.append('| ' + ' | '.join(fmt(s[k]) for k in ['id','name','price','bought','used','heldHands','firstBuyers','winDeltaPts','seDeltaPts','realisedChipsPerBuy']) + ' | ' + ', '.join(s['flags']) + ' |')
(root / 'BALANCE.md').write_text('\n'.join(lines) + '\n')
print('\n'.join(lines))
if violations or report['capped'] or report['finished'] != report['games']:
    sys.exit(1)
