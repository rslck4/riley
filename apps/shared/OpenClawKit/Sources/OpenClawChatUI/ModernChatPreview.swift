// ModernChatPreview.swift
// Preview for Modern card-based chat UI

import SwiftUI

#Preview("Modern User Message") {
    ZStack {
        Color.black.ignoresSafeArea()
        
        VStack(spacing: 16) {
            ModernUserMessageCard(text: "Hello! This is a user message in the new Modern card design.")
            
            ModernMessageCard(isUser: false) {
                ModernMessageContent(text: "This is an assistant response with **markdown** support.\n\n```swift\nlet code = \"with code blocks\"\nprint(code)\n```")
            }
            
            ModernStreamingAssistantCard(
                text: "This is a streaming response",
                toolActivities: [
                    (toolName: "Bash", summary: "Running command", details: "ls -la", isComplete: true),
                    (toolName: "Read", summary: "Reading file", details: nil, isComplete: false)
                ],
                isStreaming: true
            )
        }
        .padding()
    }
}

#Preview("Modern Code Block") {
    ZStack {
        Color.black.ignoresSafeArea()
        
        ModernCodeBlock(code: """
            func hello() {
                print("World")
            }
            """, language: "swift")
            .padding()
    }
}
