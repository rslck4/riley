import SwiftUI
import MoltbotKit

// MARK: - Modern (2026) chat components
// This file intentionally keeps the existing data model and feature surface.
// It only changes presentation.

@MainActor
struct ModernChatMessageCard: View {
    let message: MoltbotChatMessage
    let style: MoltbotChatView.Style
    let markdownVariant: ChatMarkdownVariant
    let userAccent: Color?

    private var isUser: Bool { self.message.role.lowercased() == "user" }

    var body: some View {
        ModernChatCardContainer(isUser: self.isUser, userAccent: self.userAccent) {
            ModernChatMessageContent(
                message: self.message,
                isUser: self.isUser,
                style: self.style,
                markdownVariant: self.markdownVariant,
                userAccent: self.userAccent)
        }
        .frame(maxWidth: 760, alignment: self.isUser ? .trailing : .leading)
        .frame(maxWidth: .infinity, alignment: self.isUser ? .trailing : .leading)
        .padding(.horizontal, 2)
    }
}

@MainActor
private struct ModernChatMessageContent: View {
    let message: MoltbotChatMessage
    let isUser: Bool
    let style: MoltbotChatView.Style
    let markdownVariant: ChatMarkdownVariant
    let userAccent: Color?

    var body: some View {
        let text = self.primaryText
        let textColor = self.isUser ? MoltbotChatTheme.userText : MoltbotChatTheme.assistantText

        VStack(alignment: .leading, spacing: 10) {
            if self.isToolResultMessage {
                if !text.isEmpty {
                    ToolResultCard(title: self.toolResultTitle, text: text, isUser: self.isUser)
                }
            } else if self.isUser {
                ChatMarkdownRenderer(
                    text: text,
                    context: .user,
                    variant: self.markdownVariant,
                    font: .system(size: 14),
                    textColor: textColor)
            } else {
                ChatAssistantTextBody(text: text, markdownVariant: self.markdownVariant)
            }

            if !self.inlineAttachments.isEmpty {
                ForEach(self.inlineAttachments.indices, id: \.self) { idx in
                    AttachmentRow(att: self.inlineAttachments[idx], isUser: self.isUser)
                }
            }

            if !self.toolCalls.isEmpty {
                ForEach(self.toolCalls.indices, id: \.self) { idx in
                    ToolCallCard(content: self.toolCalls[idx], isUser: self.isUser)
                }
            }

            if !self.inlineToolResults.isEmpty {
                ForEach(self.inlineToolResults.indices, id: \.self) { idx in
                    let toolResult = self.inlineToolResults[idx]
                    ToolResultCard(
                        title: "🔧 \(toolResult.name ?? "tool")",
                        text: toolResult.text ?? "",
                        isUser: self.isUser)
                }
            }
        }
        .textSelection(.enabled)
        .padding(.vertical, 12)
        .padding(.horizontal, 14)
        .foregroundStyle(textColor)
    }

    private var primaryText: String {
        let parts = self.message.content.compactMap { content -> String? in
            let kind = (content.type ?? "text").lowercased()
            guard kind == "text" || kind.isEmpty else { return nil }
            return content.text
        }
        return parts.joined(separator: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var inlineAttachments: [MoltbotChatMessageContent] {
        self.message.content.filter { content in
            switch content.type ?? "text" {
            case "file", "attachment":
                true
            default:
                false
            }
        }
    }

    private var toolCalls: [MoltbotChatMessageContent] {
        self.message.content.filter { content in
            let kind = (content.type ?? "").lowercased()
            if ["toolcall", "tool_call", "tooluse", "tool_use"].contains(kind) {
                return true
            }
            return content.name != nil && content.arguments != nil
        }
    }

    private var inlineToolResults: [MoltbotChatMessageContent] {
        self.message.content.filter { content in
            let kind = (content.type ?? "").lowercased()
            return kind == "toolresult" || kind == "tool_result"
        }
    }

    private var isToolResultMessage: Bool {
        let role = self.message.role.lowercased()
        return role == "toolresult" || role == "tool_result"
    }

    private var toolResultTitle: String {
        if let name = self.message.toolName, !name.isEmpty {
            let display = ToolDisplayRegistry.resolve(name: name, args: nil)
            return "\(display.emoji) \(display.title)"
        }
        let display = ToolDisplayRegistry.resolve(name: "tool", args: nil)
        return "\(display.emoji) \(display.title)"
    }
}

@MainActor
struct ModernChatActivityRow: View {
    let title: String
    let subtitle: String
    let details: String

    @State private var expanded: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button {
                withAnimation(.snappy(duration: 0.2)) {
                    self.expanded.toggle()
                }
            } label: {
                HStack(spacing: 10) {
                    Image(systemName: self.expanded ? "chevron.down" : "chevron.right")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                        .frame(width: 12)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(self.title)
                            .font(.callout.weight(.semibold))
                        Text(self.subtitle)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer(minLength: 0)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(Text("\(self.title). \(self.subtitle)"))

            if self.expanded {
                Text(self.details)
                    .font(.caption.monospaced())
                    .foregroundStyle(.secondary)
                    .textSelection(.enabled)
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.black.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
        }
        .padding(.vertical, 6)
        .padding(.horizontal, 10)
        .background(Color.black.opacity(0.06))
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

@MainActor
private struct ModernChatCardContainer<Content: View>: View {
    let isUser: Bool
    let userAccent: Color?
    @ViewBuilder let content: Content

    var body: some View {
        content
            .background(self.background)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(Color.white.opacity(0.08), lineWidth: 1)
            )
    }

    private var background: some View {
        // Neutral, modern “card” treatment. We’ll fine-tune later with proper macOS material.
        let base = Color.black.opacity(0.12)
        if self.isUser {
            return AnyView(base.opacity(0.85))
        }
        return AnyView(base.opacity(0.55))
    }
}
