// ModernChatComponents.swift
// Modern chat UI with card-based messages, code blocks, and collapsible tool activity

import SwiftUI

// MARK: - Feature Flag
@MainActor
public class ModernChatSettings: ObservableObject {
    public static let shared = ModernChatSettings()
    
    @AppStorage("useModernChatUI") public var useModernChatUI: Bool = false
    
    private init() {}
}

// MARK: - Platform Colors
#if os(macOS)
import AppKit
#else
import UIKit
#endif

struct PlatformColors {
    #if os(macOS)
    static var cardBackground: Color { Color(nsColor: .textBackgroundColor).opacity(0.6) }
    static var secondaryBackground: Color { Color(nsColor: .controlBackgroundColor) }
    static var codeBackground: Color { Color(nsColor: .textBackgroundColor).opacity(0.8) }
    #else
    static var cardBackground: Color { Color(uiColor: .secondarySystemBackground).opacity(0.8) }
    static var secondaryBackground: Color { Color(uiColor: .tertiarySystemBackground) }
    static var codeBackground: Color { Color(uiColor: .tertiarySystemBackground) }
    #endif
}

// MARK: - Modern Message Card
public struct ModernMessageCard<Content: View>: View {
    let isUser: Bool
    let content: Content
    
    public init(isUser: Bool, @ViewBuilder content: () -> Content) {
        self.isUser = isUser
        self.content = content()
    }
    
    public var body: some View {
        HStack {
            if isUser { Spacer(minLength: 60) }
            
            VStack(alignment: .leading, spacing: 8) {
                content
            }
            .padding(12)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isUser ? Color.accentColor.opacity(0.15) : PlatformColors.cardBackground)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .strokeBorder(
                        isUser ? Color.accentColor.opacity(0.3) : Color.primary.opacity(0.1),
                        lineWidth: 1
                    )
            )
            
            if !isUser { Spacer(minLength: 60) }
        }
    }
}

// MARK: - Code Block with Copy Button
public struct ModernCodeBlock: View {
    let code: String
    let language: String?
    @State private var copied = false
    
    public init(code: String, language: String? = nil) {
        self.code = code
        self.language = language
    }
    
    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                if let lang = language, !lang.isEmpty {
                    Text(lang)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Capsule().fill(Color.primary.opacity(0.1)))
                }
                Spacer()
                Button(action: copyCode) {
                    HStack(spacing: 4) {
                        Image(systemName: copied ? "checkmark" : "doc.on.doc")
                        Text(copied ? "Copied!" : "Copy")
                    }
                    .font(.caption)
                    .foregroundColor(copied ? .green : .secondary)
                }
                .buttonStyle(.plain)
                .padding(.trailing, 8)
            }
            .padding(.vertical, 6)
            .background(Color.primary.opacity(0.05))
            
            ScrollView(.horizontal, showsIndicators: false) {
                Text(code)
                    .font(.system(.body, design: .monospaced))
                    .textSelection(.enabled)
                    .padding(12)
            }
        }
        .background(PlatformColors.codeBackground)
        .cornerRadius(8)
        .overlay(RoundedRectangle(cornerRadius: 8).strokeBorder(Color.primary.opacity(0.15), lineWidth: 1))
    }
    
    private func copyCode() {
        #if os(macOS)
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(code, forType: .string)
        #else
        UIPasteboard.general.string = code
        #endif
        copied = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { copied = false }
    }
}

// MARK: - Collapsible Tool Activity
public struct CollapsibleToolActivity: View {
    let toolName: String
    let summary: String
    let details: String?
    let isComplete: Bool
    @State private var isExpanded = false
    
    public init(toolName: String, summary: String, details: String? = nil, isComplete: Bool = true) {
        self.toolName = toolName
        self.summary = summary
        self.details = details
        self.isComplete = isComplete
    }
    
    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button(action: { withAnimation(.spring(response: 0.3)) { isExpanded.toggle() } }) {
                HStack(spacing: 8) {
                    Group {
                        if isComplete {
                            Image(systemName: "checkmark.circle.fill").foregroundColor(.green)
                        } else {
                            ProgressView().scaleEffect(0.7)
                        }
                    }.frame(width: 16, height: 16)
                    
                    Image(systemName: iconForTool(toolName)).foregroundColor(.secondary).frame(width: 16)
                    Text(toolName).font(.caption).fontWeight(.medium).foregroundColor(.primary)
                    Text("• \(summary)").font(.caption).foregroundColor(.secondary).lineLimit(1)
                    Spacer()
                    if details != nil {
                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down").font(.caption2).foregroundColor(.secondary)
                    }
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 8)
            }
            .buttonStyle(.plain)
            
            if isExpanded, let details = details {
                Divider().padding(.horizontal, 10)
                Text(details).font(.caption).foregroundColor(.secondary).padding(10).frame(maxWidth: .infinity, alignment: .leading).textSelection(.enabled)
            }
        }
        .background(RoundedRectangle(cornerRadius: 8).fill(Color.primary.opacity(0.03)))
        .overlay(RoundedRectangle(cornerRadius: 8).strokeBorder(Color.primary.opacity(0.08), lineWidth: 1))
    }
    
    private func iconForTool(_ name: String) -> String {
        let lowered = name.lowercased()
        if lowered.contains("bash") || lowered.contains("shell") { return "terminal" }
        else if lowered.contains("file") || lowered.contains("read") { return "doc" }
        else if lowered.contains("web") || lowered.contains("search") { return "globe" }
        else if lowered.contains("browser") { return "safari" }
        else { return "gearshape" }
    }
}

// MARK: - Streaming Indicator
public struct ModernStreamingIndicator: View {
    @State private var dotCount = 0
    let timer = Timer.publish(every: 0.4, on: .main, in: .common).autoconnect()
    
    public init() {}
    
    public var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<3, id: \.self) { index in
                Circle().fill(Color.accentColor).frame(width: 6, height: 6).opacity(index <= dotCount ? 1.0 : 0.3)
            }
        }
        .onReceive(timer) { _ in dotCount = (dotCount + 1) % 3 }
    }
}
