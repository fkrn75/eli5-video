# Supertonic v3 로 한국어 내레이션 WAV 합성(문장 묶음 단위).
# 사용: <python> tts.py <입력.json> <출력폴더>
#   입력.json = {"voice":"F1","speed":1.0,"steps":10,"items":[{"id":"s01_b0","text":"..."}]}
#   출력: <출력폴더>/<id>.wav + <출력폴더>/durations.json {"s01_b0": 2.34, ...}
# 같은 문장·음성·속도는 해시 캐시(tts_cache/)를 재사용 → 대본 일부만 고쳐도 바뀐 문장만 다시 합성
import hashlib
import json
import os
import shutil
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        pass

HERE = Path(__file__).resolve().parent
CACHE = HERE / "tts_cache"
TAIL_DB = -45  # 앞뒤 무음 자르기 기준(dBFS)


def model_dir():
    """이미 받아 둔 Supertonic v3 폴더 재사용(없으면 None → 자동 다운로드)."""
    for c in [os.environ.get("SUPERTONIC_DIR"), str(Path.home() / ".cache" / "supertonic3")]:
        if c and (Path(c) / "onnx" / "vocoder.onnx").exists():
            return c
    return None


def trim(wav, sr):
    """앞뒤 무음을 잘라 장면 타이밍을 정확히 맞춘다(앞 30ms·뒤 80ms 여유는 남김)."""
    thr = 10 ** (TAIL_DB / 20)
    idx = np.where(np.abs(wav) > thr)[0]
    if len(idx) == 0:
        return wav
    a = max(0, idx[0] - int(0.03 * sr))
    b = min(len(wav), idx[-1] + int(0.08 * sr))
    return wav[a:b]


def main():
    spec = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8-sig"))
    out = Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    CACHE.mkdir(exist_ok=True)
    voice, speed, steps = spec.get("voice", "F1"), float(spec.get("speed", 1.0)), int(spec.get("steps", 10))

    todo, durs, tts, style = [], {}, None, None
    for it in spec["items"]:
        key = hashlib.sha1(f"{voice}|{speed}|{steps}|{it['text']}".encode("utf-8")).hexdigest()[:16]
        cached = CACHE / f"{key}.wav"
        if not cached.exists():
            todo.append((it, cached))
        else:
            shutil.copyfile(cached, out / f"{it['id']}.wav")
            durs[it["id"]] = sf.info(str(cached)).duration

    if todo:
        from supertonic import TTS  # 합성할 게 있을 때만 모델 로드
        md = model_dir()
        print(f"[TTS] Supertonic v3 모델: {md or '기본 캐시(없으면 자동 다운로드)'} · 음성 {voice} · 속도 {speed}", flush=True)
        tts = TTS(model="supertonic-3", model_dir=md, auto_download=True)
        style = tts.get_voice_style(voice)
        for k, (it, cached) in enumerate(todo, 1):
            wav, _ = tts.synthesize(it["text"], voice_style=style, lang="ko", speed=speed, total_steps=steps)
            w = trim(np.asarray(wav[0], dtype=np.float32), tts.sample_rate)
            sf.write(str(cached), w, tts.sample_rate)
            shutil.copyfile(cached, out / f"{it['id']}.wav")
            durs[it["id"]] = len(w) / tts.sample_rate
            print(f"[TTS] {k}/{len(todo)} {it['id']} {durs[it['id']]:.2f}s  {it['text'][:40]}", flush=True)
    print(f"[TTS] 완료: 새로 합성 {len(todo)} · 캐시 재사용 {len(spec['items']) - len(todo)}", flush=True)
    (out / "durations.json").write_text(json.dumps(durs, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
