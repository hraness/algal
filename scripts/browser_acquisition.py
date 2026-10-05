from pathlib import Path
import re


AZURE = re.compile(r"https?://azure\.archive\.ubuntu\.com/ubuntu(/?)\Z")
RUNNER_LIST = "mirror+file:/etc/apt/apt-mirrors.txt"


def uri_spans(text: str, suffix: str) -> list[tuple[int, int]]:
    if suffix not in {".list", ".sources"}:
        raise ValueError("Unsupported source format")
    if suffix == ".list":
        return [(match.start(1), match.end(1)) for match in re.finditer(
            r"^[ \t]*deb(?:-src)?[ \t]+(?:\[[^\]\r\n]*\][ \t]+)?([^\s#]+)", text, re.MULTILINE
        )]
    result = []
    pending = []
    enabled = []
    field = None
    offset = 0

    def finish():
        value = " ".join(enabled).lower()
        disabled = value in {"no", "false", "off", "without", "disable"} or re.fullmatch(r"[+-]?(?:0+|0x0+)", value)
        if not disabled:
            result.extend(pending)

    for line in text.splitlines(keepends=True):
        if not line.strip():
            finish()
            pending = []
            enabled = []
            field = None
        elif not line.lstrip().startswith("#"):
            start = 0
            if not line[0].isspace():
                header = re.match(r"([^\s:]+):", line)
                field = header[1].lower() if header else None
                start = header.end() if header else 0
            if field in {"uris", "enabled"}:
                for token in re.finditer(r"\S+", line[start:]):
                    if token[0].startswith("#"):
                        break
                    if field == "uris":
                        pending.append((offset + start + token.start(), offset + start + token.end()))
                    else:
                        enabled.append(token[0])
        offset += len(line)
    finish()
    return result


def replace_uris(text: str, spans: list[tuple[int, int]]) -> str:
    for start, end in reversed(spans):
        match = AZURE.fullmatch(text[start:end])
        if match:
            text = text[:start] + "https://archive.ubuntu.com/ubuntu" + match[1] + text[end:]
    return text


def rewrite(text: str, suffix: str) -> str:
    return replace_uris(text, uri_spans(text, suffix))


def regular_directory(path: Path):
    if path.is_symlink() or not path.is_dir():
        raise ValueError(f"Not an ordinary directory: {path}")


def read_file(path: Path) -> str:
    if path.is_symlink() or not path.is_file():
        raise ValueError(f"Not an ordinary file: {path}")
    return path.read_bytes().decode("utf-8")


def plan(root: Path) -> list[tuple[Path, str]]:
    regular_directory(root)
    parts = root / "sources.list.d"
    if parts.exists() or parts.is_symlink():
        regular_directory(parts)
    paths = sorted([*parts.glob("*.list"), *parts.glob("*.sources")])
    main = root / "sources.list"
    if main.exists() or main.is_symlink():
        paths.insert(0, main)
    changes = []
    runner_list = False
    for path in paths:
        text = read_file(path)
        spans = uri_spans(text, path.suffix)
        runner_list |= any(text[start:end] == RUNNER_LIST for start, end in spans)
        updated = replace_uris(text, spans)
        if updated != text:
            changes.append((path, updated))
    if runner_list:
        path = root / "apt-mirrors.txt"
        text = read_file(path)
        spans = [(match.start(1), match.end(1)) for match in re.finditer(r"^[ \t]*([^\s#]+)", text, re.MULTILINE)]
        updated = replace_uris(text, spans)
        if updated != text:
            changes.append((path, updated))
    return changes


if __name__ == "__main__":
    changes = plan(Path("/etc/apt"))
    for path, content in changes:
        path.write_bytes(content.encode("utf-8"))
        print(f"Normalized Azure archive URIs in {path.name}")
    print(f"Updated {len(changes)} files; APT signing configuration preserved")
