from pathlib import Path
import tempfile
import unittest
from browser_acquisition import plan, rewrite


class BrowserAcquisitionTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        (self.root / "sources.list.d").mkdir()

    def put(self, name, content):
        path = self.root / name
        path.write_bytes(content.encode())
        return path

    def test_deb822_preserves_signatures_bytes_and_idempotence(self):
        original = "Types: deb\r\nURIs:http://azure.archive.ubuntu.com/ubuntu\r\n https://azure.archive.ubuntu.com/ubuntu/ https://security.ubuntu.com/ubuntu # http://azure.archive.ubuntu.com/ubuntu\r\nSuites: noble noble-security\r\nSigned-By: /keys/ubuntu.gpg"
        path = self.put("sources.list.d/ubuntu.sources", original)
        expected = original.replace("URIs:http://azure.archive.ubuntu.com/ubuntu", "URIs:https://archive.ubuntu.com/ubuntu").replace(" https://azure.archive.ubuntu.com/ubuntu/ ", " https://archive.ubuntu.com/ubuntu/ ")
        self.assertEqual(plan(self.root), [(path, expected)])
        self.assertEqual(path.read_bytes(), original.encode())
        path.write_bytes(expected.encode())
        self.assertEqual(plan(self.root), [])

    def test_legacy_exact_hosts_comments_options_and_other_sources(self):
        original = "# deb http://azure.archive.ubuntu.com/ubuntu noble main\ndeb [arch=amd64 signed-by=/keys/key.gpg] http://azure.archive.ubuntu.com/ubuntu noble main # http://azure.archive.ubuntu.com/ubuntu\ndeb-src https://azure.archive.ubuntu.com/ubuntu/ noble main\ndeb https://azure.archive.ubuntu.com.evil/ubuntu noble main\ndeb http://azure.archive.ubuntu.com/ubuntu-extra noble main\ndeb https://packages.example.org/ubuntu noble main\n"
        path = self.put("sources.list", original)
        expected = original.replace("] http://azure.archive.ubuntu.com/ubuntu", "] https://archive.ubuntu.com/ubuntu").replace("deb-src https://azure.archive.ubuntu.com/ubuntu/", "deb-src https://archive.ubuntu.com/ubuntu/")
        self.assertEqual(plan(self.root), [(path, expected)])

    def test_disabled_sources_and_exact_runner_reference(self):
        source = self.put("sources.list.d/ubuntu.sources", "")
        for value in ("no", "FALSE", "off", "without", "disable", "0", "00", "-0x00", "+0"):
            source.write_text(f"URIs: http://azure.archive.ubuntu.com/ubuntu mirror+file:/etc/apt/apt-mirrors.txt\nEnabled:\n {value}\n")
            self.assertEqual(plan(self.root), [])
        source.write_text("URIs: mirror+file:/etc/apt/apt-mirrors.txt\nEnabled: yes\n")
        original = "# http://azure.archive.ubuntu.com/ubuntu\r\nhttp://azure.archive.ubuntu.com/ubuntu/\tpriority:1 arch:amd64\r\nhttps://security.ubuntu.com/ubuntu/\tpriority:2\r\n"
        mirror = self.put("apt-mirrors.txt", original)
        expected = original.replace("http://azure.archive.ubuntu.com/ubuntu/\t", "https://archive.ubuntu.com/ubuntu/\t")
        self.assertEqual(plan(self.root), [(mirror, expected)])
        mirror.write_bytes(expected.encode())
        self.assertEqual(plan(self.root), [])
        mirror.write_bytes(original.encode())
        source.write_text("URIs: mirror+file:/etc/passwd mirror+file:/etc/apt/../apt-mirrors.txt\n")
        self.assertEqual(plan(self.root), [])
        source.unlink()
        self.put("sources.list", "deb mirror+file:/etc/apt/apt-mirrors.txt noble main\n")
        self.assertEqual(plan(self.root), [(mirror, expected)])

    def test_all_inputs_validated_before_writes(self):
        original = "deb http://azure.archive.ubuntu.com/ubuntu noble main\n"
        source = self.put("sources.list", original)
        invalid = self.root / "sources.list.d/invalid.sources"
        invalid.symlink_to(source)
        with self.assertRaises(ValueError):
            plan(self.root)
        self.assertEqual(source.read_bytes(), original.encode())
        invalid.unlink()
        invalid.mkdir()
        with self.assertRaises(ValueError):
            plan(self.root)
        invalid.rmdir()
        invalid.write_bytes(b"\xff")
        with self.assertRaises(UnicodeDecodeError):
            plan(self.root)
        self.assertEqual(source.read_bytes(), original.encode())
        invalid.unlink()
        source.write_text(original + "deb mirror+file:/etc/apt/apt-mirrors.txt noble main\n")
        with self.assertRaises(ValueError):
            plan(self.root)
        (self.root / "apt-mirrors.txt").symlink_to(source)
        with self.assertRaises(ValueError):
            plan(self.root)
        with self.assertRaises(ValueError):
            rewrite(original, ".txt")

    def test_directory_symlinks_rejected(self):
        linked = self.root / "linked"
        linked.symlink_to(self.root, target_is_directory=True)
        with self.assertRaises(ValueError):
            plan(linked)
        parts = self.root / "sources.list.d"
        parts.rmdir()
        parts.symlink_to(self.root, target_is_directory=True)
        with self.assertRaises(ValueError):
            plan(self.root)


if __name__ == "__main__":
    unittest.main()
