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
    static var tertiaryBackground: Color { Color(nsColor: .windowBackgroundColor) }
    static var codeBackground: Color { Color(nsColor: .textBackgroundColor).opacity(0.8) }
    #else
    static var cardBackground: Color { Color(uiColor: .secondarySystemBackground).opacity(0.8) }
    static var secondaryBackground: Color { Color(uiColor: .tertiarySystemBackground) }
    static var tertiaryBackground: Color { Color(uiColor: .systemBackground) }
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
            // Header with language and copy button
            HStack {
                if let lang = language, !lang.isEmpty {
                    Text(lang)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(
                            Capsule()
                                .fill(Color.primary.opacity(0.1))
                        )
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
            
            // Code content
            ScrollView(.horizontal, showsIndicators: false) {
                Text(code)
                    .font(.system(.body, design: .monospaced))
                    .textSelection(.enabled)
                    .padding(12)
            }
        }
        .background(PlatformColors.codeBackground)
        .cornerRadius(8)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .strokeBorder(Color.primary.opacity(0.15), lineWidth: 1)
        )
    }
    
    private func copyCode() {
        #if os(macOS)
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(code, forType: .string)
        #else
        UIPasteboard.general.string = code
        #endif
        
        copied = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            copied = false
        }
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
            // Header - always visible
            Button(action: { withAnimation(.spring(response: 0.3)) { isExpanded.toggle() } }) {
                HStack(spacing: 8) {
                    // Status indicator
                    Group {
                        if isComplete {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                        } else {
                            ProgressView()
                                .scaleEffect(0.7)
                        }
                    }
                    .frame(width: 16, height: 16)
                    
                    // Tool icon
                    Image(systemName: iconForTool(toolName))
                        .foregroundColor(.secondary)
                        .frame(width: 16)
                    
                    // Tool name and summary
                    Text(toolName)
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                    
                    Text("• \(summary)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                    
                    Spacer()
                    
                    // Expand/collapse indicator
                    if details != nil {
                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 8)
            }
            .buttonStyle(.plain)
            
            // Expanded details
            if isExpanded, let details = details {
                Divider()
                    .padding(.horizontal, 10)
                
                Text(details)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(10)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .textSelection(.enabled)
            }
        }
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.primary.opacity(0.03))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .strokeBorder(Color.primary.opacity(0.08), lineWidth: 1)
        )
    }
    
    private func iconForTool(_ name: String) -> String {
        let lowered = name.lowercased()
        if lowered.contains("bash") || lowered.contains("shell") || lowered.contains("exec") {
            return "terminal"
        } else if lowered.contains("file") || lowered.contains("read") || lowered.contains("write") {
            return "doc"
        } else if lowered.contains("web") || lowered.contains("fetch") || lowered.contains("search") {
            return "globe"
        } else if lowered.contains("browser") {
            return "safari"
        } else if lowered.contains("image") || lowered.contains("vision") {
            return "photo"
        } else if lowered.contains("memory") {
            return "brain"
        } else if lowered.contains("message") || lowered.contains("send") {
            return "message"
        } else {
            return "gearshape"
        }
    }
}

// MARK: - Tool Activity Group
public struct ToolActivityGroup: View {
    let activities: [(toolName: String, summary: String, details: String?, isComplete: Bool)]
    @State private var isCollapsed = true
    
    public init(activities: [(toolName: String, summary: String, details: String?, isComplete: Bool)]) {
        self.activities = activities
    }
    
    public var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            if activities.count > 3 && isCollapsed {
                // Show first 2 and a "show more" button
                ForEach(0..<2, id: \.self) { index in
                    CollapsibleToolActivity(
                        toolName: activities[index].toolName,
                        summary: activities[index].summary,
                        details: activities[index].details,
                        isComplete: activities[index].isComplete
                    )
                }
                
                Button(action: { withAnimation { isCollapsed = false } }) {
                    HStack {
                        Image(systemName: "ellipsis.circle")
                        Text("Show \(activities.count - 2) more tool calls")
                    }
                    .font(.caption)
                    .foregroundColor(.accentColor)
                    .padding(.vertical, 6)
                }
                .buttonStyle(.plain)
            } else {
                ForEach(0..<activities.count, id: \.self) { index in
                    CollapsibleToolActivity(
                        toolName: activities[index].toolName,
                        summary: activities[index].summary,
                        details: activities[index].details,
                        isComplete: activities[index].isComplete
                    )
                }
                
                if activities.count > 3 {
                    Button(action: { withAnimation { isCollapsed = true } }) {
                        HStack {
                            Image(systemName: "chevron.up.circle")
                            Text("Show less")
                        }
                        .font(.caption)
                        .foregroundColor(.accentColor)
                        .padding(.vertical, 6)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
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
                Circle()
                    .fill(Color.accentColor)
                    .frame(width: 6, height: 6)
                    .opacity(index <= dotCount ? 1.0 : 0.3)
            }
        }
        .onReceive(timer) { _ in
            dotCount = (dotCount + 1) % 3
        }
    }
}

// MARK: - Modern Streaming Assistant Card
public struct ModernStreamingAssistantCard: View {
    let text: String
    let toolActivities: [(toolName: String, summary: String, details: String?, isComplete: Bool)]
    let isStreaming: Bool
    
    public init(
        text: String,
        toolActivities: [(toolName: String, summary: String, details: String?, isComplete: Bool)] = [],
        isStreaming: Bool = false
    ) {
        self.text = text
        self.toolActivities = toolActivities
        self.isStreaming = isStreaming
    }
    
    public var body: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 10) {
                // Tool activities (collapsed by default)
                if !toolActivities.isEmpty {
                    ToolActivityGroup(activities: toolActivities)
                }
                
                // Message content
                if !text.isEmpty {
                    ModernMessageContent(text: text)
                }
                
                // Streaming indicator
                if isStreaming && text.isEmpty {
                    ModernStreamingIndicator()
                        .padding(.vertical, 8)
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(PlatformColors.cardBackground)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .strokeBorder(Color.primary.opacity(0.1), lineWidth: 1)
            )
            
            Spacer(minLength: 40)
        }
    }
}

// MARK: - Modern Message Content (with code block parsing)
public struct ModernMessageContent: View {
    let text: String
    
    public init(text: String) {
        self.text = text
    }
    
    public var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(Array(parseContent().enumerated()), id: \.offset) { _, segment in
                switch segment {
                case .text(let content):
                    Text(content)
                        .textSelection(.enabled)
                case .code(let code, let language):
                    ModernCodeBlock(code: code, language: language)
                }
            }
        }
    }
    
    private enum ContentSegment {
        case text(String)
        case code(String, String?)
    }
    
    private func parseContent() -> [ContentSegment] {
        var segments: [ContentSegment] = []
        let pattern = "```(\\w*)\\n([\\s\\S]*?)```"
        
        guard let regex = try? NSRegularExpression(pattern: pattern, options: []) else {
            return [.text(text)]
        }
        
        let nsText = text as NSString
        var lastEnd = 0
        
        let matches = regex.matches(in: text, options: [], range: NSRange(location: 0, length: nsText.length))
        
        for match in matches {
            // Add text before code block
            if match.range.location > lastEnd {
                let textRange = NSRange(location: lastEnd, length: match.range.location - lastEnd)
                let textContent = nsText.substring(with: textRange).trimmingCharacters(in: .whitespacesAndNewlines)
                if !textContent.isEmpty {
                    segments.append(.text(textContent))
                }
            }
            
            // Add code block
            let langRange = match.range(at: 1)
            let codeRange = match.range(at: 2)
            
            let language = langRange.length > 0 ? nsText.substring(with: langRange) : nil
            let code = nsText.substring(with: codeRange).trimmingCharacters(in: .newlines)
            
            segments.append(.code(code, language))
            lastEnd = match.range.location + match.range.length
        }
        
        // Add remaining text
        if lastEnd < nsText.length {
            let remaining = nsText.substring(from: lastEnd).trimmingCharacters(in: .whitespacesAndNewlines)
            if !remaining.isEmpty {
                segments.append(.text(remaining))
            }
        }
        
        if segments.isEmpty {
            segments.append(.text(text))
        }
        
        return segments
    }
}

// MARK: - Modern User Message Card
public struct ModernUserMessageCard: View {
    let text: String
    let images: [Data]?
    
    public init(text: String, images: [Data]? = nil) {
        self.text = text
        self.images = images
    }
    
    public var body: some View {
        HStack(alignment: .top) {
            Spacer(minLength: 40)
            
            VStack(alignment: .trailing, spacing: 8) {
                // Images if present
                if let images = images, !images.isEmpty {
                    HStack(spacing: 4) {
                        ForEach(0..<min(images.count, 4), id: \.self) { index in
                            if let image = platformImage(from: images[index]) {
                                #if os(macOS)
                                Image(nsImage: image)
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                                    .frame(width: 60, height: 60)
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                                #else
                                Image(uiImage: image)
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                                    .frame(width: 60, height: 60)
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                                #endif
                            }
                        }
                    }
                }
                
                // Text content
                if !text.isEmpty {
                    Text(text)
                        .textSelection(.enabled)
                }
            }
            .padding(12)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.accentColor.opacity(0.15))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .strokeBorder(Color.accentColor.opacity(0.3), lineWidth: 1)
            )
        }
    }
    
    #if os(macOS)
    private func platformImage(from data: Data) -> NSImage? {
        NSImage(data: data)
    }
    #else
    private func platformImage(from data: Data) -> UIImage? {
        UIImage(data: data)
    }
    #endif
}
