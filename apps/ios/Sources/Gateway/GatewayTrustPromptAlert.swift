import SwiftUI

struct GatewayTrustPromptAlert: ViewModifier {
    func body(content: Content) -> some View {
        content
    }
}

extension View {
    func gatewayTrustPromptAlert() -> some View {
        self.modifier(GatewayTrustPromptAlert())
    }
}
