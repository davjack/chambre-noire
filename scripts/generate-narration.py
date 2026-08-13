#!/usr/bin/env python3
"""
Turns every narrated line in the dictionaries into an audio clip.

Why this exists rather than `speechSynthesis`: the browser's own voices are a
lottery the audience loses. Measured on one Ubuntu desktop, same session, same
system: Firefox offered 14 805 voices — every one of them a variant of eSpeak,
a formant synthesiser whose French is not intelligible to a six-year-old — and
Brave offered none at all. A school tablet, an iPad and a parent's phone would
each have produced something different again.

Pre-generating the clips makes the narration identical everywhere, offline
included, and lets us pick a voice on merit instead of accepting whatever the
device happens to ship.

Usage
-----
    python3 -m venv .venv && .venv/bin/pip install piper-tts
    .venv/bin/python scripts/generate-narration.py

Models download once into `.voices/` (gitignored, ~60 MB each). The generated
clips ARE committed: they are deterministic, small, and every deployment needs
them without a Python toolchain.

Requires `ffmpeg` on PATH for the MP3 encode.
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
import wave
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent.parent
VOICE_DIR = ROOT / ".voices"
OUT_DIR = ROOT / "public" / "audio"

# One voice per locale, chosen by listening rather than by default.
# Both are male so the app does not change narrator when it changes language.
VOICES = {
    "fr": "fr_FR-tom-medium",
    "en": "en_GB-alan-medium",
}

HUGGING_FACE = "https://huggingface.co/rhasspy/piper-voices/resolve/main"

# Mono, 32 kHz, 64 kbps: transparent for a single speaking voice, and about
# 20 KB per clip. MP3 rather than Opus because it is the one format that every
# target decodes without an OS codec pack — including Firefox on Linux, which
# is exactly where a school machine lives.
MP3_ARGS = ["-ac", "1", "-ar", "32000", "-b:a", "64k"]


def model_url(name: str) -> str:
    """`fr_FR-tom-medium` → `fr/fr_FR/tom/medium/fr_FR-tom-medium`."""
    locale, speaker, quality = name.split("-")
    language = locale.split("_")[0]
    return f"{HUGGING_FACE}/{language}/{locale}/{speaker}/{quality}/{name}"


def ensure_model(name: str) -> Path:
    VOICE_DIR.mkdir(exist_ok=True)
    onnx = VOICE_DIR / f"{name}.onnx"
    for suffix in (".onnx", ".onnx.json"):
        target = VOICE_DIR / f"{name}{suffix}"
        if target.exists() and target.stat().st_size > 1000:
            continue
        print(f"  downloading {target.name} …", flush=True)
        with urlopen(f"{model_url(name)}{suffix}") as response:
            target.write_bytes(response.read())
    return onnx


def spoken_keys(dictionary: dict[str, str]) -> list[str]:
    """The lines `Narration` reads aloud — and only those."""
    return sorted(key for key in dictionary if ".say" in key)


def slug(key: str) -> str:
    return key.replace(".", "-")


def main() -> int:
    if shutil.which("ffmpeg") is None:
        print("ffmpeg is required and was not found on PATH.", file=sys.stderr)
        return 1

    try:
        from piper import PiperVoice, SynthesisConfig
    except ImportError:
        print(__doc__, file=sys.stderr)
        return 1

    dictionaries = {
        locale: json.loads((ROOT / "src" / "i18n" / f"{locale}.json").read_text("utf-8"))
        for locale in VOICES
    }

    keys = spoken_keys(dictionaries["fr"])
    missing = {
        locale: [key for key in keys if key not in dictionary]
        for locale, dictionary in dictionaries.items()
    }
    if any(missing.values()):
        print(f"dictionaries disagree on which lines are spoken: {missing}", file=sys.stderr)
        return 1

    # Read to a child: slower than default, and a beat between sentences.
    synthesis = SynthesisConfig(length_scale=1.12, noise_scale=0.6, noise_w_scale=0.7)

    total = 0
    for locale, voice_name in VOICES.items():
        print(f"{locale}: {voice_name}")
        voice = PiperVoice.load(ensure_model(voice_name))
        destination = OUT_DIR / locale
        destination.mkdir(parents=True, exist_ok=True)

        for stale in destination.glob("*.mp3"):
            stale.unlink()

        for key in keys:
            text = dictionaries[locale][key]
            with tempfile.NamedTemporaryFile(suffix=".wav") as raw:
                with wave.open(raw.name, "wb") as handle:
                    voice.synthesize_wav(text, handle, syn_config=synthesis)
                mp3 = destination / f"{slug(key)}.mp3"
                subprocess.run(
                    ["ffmpeg", "-y", "-loglevel", "error", "-i", raw.name, *MP3_ARGS, str(mp3)],
                    check=True,
                )
            size = mp3.stat().st_size
            total += size
            print(f"  {mp3.relative_to(ROOT)}  {size / 1024:5.1f} KB  {text[:44]}")

    print(f"\n{len(keys) * len(VOICES)} clips, {total / 1024 / 1024:.2f} MB total")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
