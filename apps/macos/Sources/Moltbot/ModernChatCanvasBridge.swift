import AppKit
import MoltbotChatUI
import Foundation

/// Bridge between modern chat UI and Canvas - implements "Send to Canvas" functionality
@MainActor
final class ModernChatCanvasBridge: ModernChatCanvasDelegate {
    static let shared = ModernChatCanvasBridge()

    private init() {}

    var canvasAvailable: Bool {
        AppStateStore.shared.canvasEnabled
    }

    func sendToCanvas(content: String, filename: String?) async {
        // Extract code blocks from content
        let codeBlocks = Self.extractCodeBlocks(from: content)

        guard !codeBlocks.isEmpty else {
            // No code blocks found, nothing to send
            return
        }

        // Get the current session key from WebChatManager
        guard let sessionKey = WebChatManager.shared.activeSessionKey else {
            return
        }

        // Write files to canvas directory
        do {
            let canvasDir = try CanvasManager.shared.show(sessionKey: sessionKey, path: nil)

            for (index, block) in codeBlocks.enumerated() {
                let fileName = Self.inferFileName(
                    from: block.language,
                    index: index,
                    suggestedName: filename)
                let fileUrl = URL(fileURLWithPath: canvasDir)
                    .appendingPathComponent(fileName)

                try block.code.write(to: fileUrl, atomically: true, encoding: .utf8)
            }

            // Refresh canvas to show new files
            _ = try CanvasManager.shared.show(sessionKey: sessionKey, path: "/")
        } catch {
            // Log error but don't crash
            print("Failed to send to canvas: \(error)")
        }
    }

    // MARK: - Code Block Extraction

    private struct CodeBlock {
        let language: String?
        let code: String
    }

    private static func extractCodeBlocks(from text: String) -> [CodeBlock] {
        var blocks: [CodeBlock] = []
        var remaining = text[...]
        let codePattern = /```(\w*)\n([\s\S]*?)```/

        while let match = remaining.firstMatch(of: codePattern) {
            let language = match.output.1.isEmpty ? nil : String(match.output.1)
            let code = String(match.output.2)
            blocks.append(CodeBlock(language: language, code: code))
            remaining = remaining[match.range.upperBound...]
        }

        return blocks
    }

    private static func inferFileName(from language: String?, index: Int, suggestedName: String?) -> String {
        if let suggested = suggestedName, !suggested.isEmpty {
            return suggested
        }

        let ext = Self.extensionForLanguage(language)
        let baseName = index == 0 ? "snippet" : "snippet_\(index + 1)"
        return "\(baseName).\(ext)"
    }

    private static func extensionForLanguage(_ language: String?) -> String {
        guard let lang = language?.lowercased() else { return "txt" }

        switch lang {
        case "python", "py": return "py"
        case "javascript", "js": return "js"
        case "typescript", "ts": return "ts"
        case "swift": return "swift"
        case "rust", "rs": return "rs"
        case "go", "golang": return "go"
        case "java": return "java"
        case "c": return "c"
        case "cpp", "c++": return "cpp"
        case "csharp", "c#", "cs": return "cs"
        case "ruby", "rb": return "rb"
        case "php": return "php"
        case "html": return "html"
        case "css": return "css"
        case "json": return "json"
        case "yaml", "yml": return "yaml"
        case "toml": return "toml"
        case "xml": return "xml"
        case "sql": return "sql"
        case "bash", "sh", "shell", "zsh": return "sh"
        case "markdown", "md": return "md"
        case "jsx": return "jsx"
        case "tsx": return "tsx"
        case "vue": return "vue"
        case "svelte": return "svelte"
        case "kotlin", "kt": return "kt"
        case "scala": return "scala"
        case "r": return "r"
        case "lua": return "lua"
        case "perl", "pl": return "pl"
        case "dockerfile": return "dockerfile"
        case "makefile": return "makefile"
        default: return "txt"
        }
    }
}

// MARK: - Setup

extension ModernChatCanvasBridge {
    /// Call this at app startup to wire up the Canvas delegate
    static func setup() {
        ModernChatCanvasSupport.delegate = ModernChatCanvasBridge.shared
    }
}
