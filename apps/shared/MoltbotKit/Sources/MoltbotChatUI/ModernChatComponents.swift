import SwiftUI

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
            ChatMessageBody(
                message: self.message,
                isUser: self.isUser,
                style: self.style,
                markdownVariant: self.markdownVariant,
                userAccent: self.userAccent)
        }
        .frame(maxWidth: ChatUIConstants.bubbleMaxWidth, alignment: self.isUser ? .trailing : .leading)
        .frame(maxWidth: .infinity, alignment: self.isUser ? .trailing : .leading)
        .padding(.horizontal, 2)
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
            .padding(.vertical, 2)
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
