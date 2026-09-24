import AppKit
import ApplicationServices
import Foundation

// Read only this task-owned application's accessibility tree. Never request a
// new permission, inspect another app, or use inference to perform the actions.
func attribute(_ node: AXUIElement, _ name: CFString) -> CFTypeRef? {
    var value: CFTypeRef?
    return AXUIElementCopyAttributeValue(node, name, &value) == .success ? value : nil
}
func nodes(_ root: AXUIElement) -> [AXUIElement] {
    var result: [AXUIElement] = []
    var queue: [(AXUIElement, Int)] = [(root, 0)]
    var cursor = 0
    while cursor < queue.count && cursor < 4096 {
        let (node, depth) = queue[cursor]; cursor += 1; result.append(node)
        if depth < 24, let children = attribute(node, kAXChildrenAttribute as CFString) as? [AXUIElement] {
            for child in children.prefix(256) { queue.append((child, depth + 1)) }
        }
    }
    return result
}
func text(_ node: AXUIElement) -> [String] {
    [kAXTitleAttribute, kAXValueAttribute, kAXDescriptionAttribute].compactMap {
        attribute(node, $0 as CFString) as? String
    }
}
func button(_ nodes: [AXUIElement], _ label: String) -> AXUIElement? {
    nodes.first { (attribute($0, kAXRoleAttribute as CFString) as? String) == kAXButtonRole && text($0).contains(label) }
}
func waitFor(_ predicate: () -> Bool, seconds: Double = 8) -> Bool {
    let deadline = ProcessInfo.processInfo.systemUptime + seconds
    repeat { if predicate() { return true }; Thread.sleep(forTimeInterval: 0.02) }
    while ProcessInfo.processInfo.systemUptime < deadline
    return false
}
func rss(_ pid: Int32) -> Int {
    let process = Process(); process.executableURL = URL(fileURLWithPath: "/bin/ps")
    process.arguments = ["-o", "rss=", "-p", String(pid)]
    let pipe = Pipe(); process.standardOutput = pipe; process.standardError = FileHandle.nullDevice
    do { try process.run(); let bytes = pipe.fileHandleForReading.readDataToEndOfFile(); process.waitUntilExit()
        return (Int(String(decoding: bytes, as: UTF8.self).trimmingCharacters(in: .whitespacesAndNewlines)) ?? 0) * 1024
    } catch { return 0 }
}
func emit(_ object: [String: Any], code: Int32) -> Never {
    if let bytes = try? JSONSerialization.data(withJSONObject: object, options: [.sortedKeys]) {
        print(String(decoding: bytes, as: UTF8.self))
    }
    exit(code)
}
guard CommandLine.arguments.count == 4,
      let pid = Int32(CommandLine.arguments[1]),
      let started = Double(CommandLine.arguments[2]),
      let count = Int(CommandLine.arguments[3]), count > 0 && count <= 24 else {
    emit(["ok": false, "reason": "Expected PID, start epoch milliseconds and at most 24 actions"], code: 2)
}
guard AXIsProcessTrusted() else {
    emit(["ok": false, "available": false, "reason": "Inherited accessibility permission unavailable; no permission prompt was requested"], code: 2)
}
let app = AXUIElementCreateApplication(pid)
guard waitFor({ nodes(app).contains { text($0).contains { $0.contains("Performance task") } } }, seconds: 12) else {
    emit(["ok": false, "available": true, "reason": "Task content did not become accessibility-visible within the readiness deadline"], code: 3)
}
let readyMs = Date().timeIntervalSince1970 * 1000 - started
let beforeRss = rss(pid)
var elapsed: [Double] = []
for index in 0..<count {
    let completing = index % 2 == 0
    guard let target = button(nodes(app), completing ? "Complete" : "Reopen") else {
        emit(["ok": false, "available": true, "reason": "Expected captured task action unavailable", "completed": index], code: 4)
    }
    let begin = ProcessInfo.processInfo.systemUptime
    guard AXUIElementPerformAction(target, kAXPressAction as CFString) == .success,
          waitFor({ (button(nodes(app), "Reopen") != nil) == completing }) else {
        emit(["ok": false, "available": true, "reason": "Task action did not reach its displayed result", "completed": index], code: 5)
    }
    elapsed.append((ProcessInfo.processInfo.systemUptime - begin) * 1000)
}
Thread.sleep(forTimeInterval: 0.2)
emit(["ok": true, "available": true, "readyMs": readyMs, "actionsMs": elapsed,
      "mainProcessRssBeforeBytes": beforeRss, "mainProcessRssAfterBytes": rss(pid),
      "memoryScope": "Desktop main process only; separately managed WebKit processes are excluded",
      "timingScope": "Application launch to accessibility-visible task content; action includes AX observation overhead"], code: 0)
