# Working State
Last updated: 2026-02-14 22:45

## Current Issue
None - fixed gateway connection scope issue

## Status
- ✅ Fixed "missing scope operator.write" error
- ✅ Added "operator.write" to connection scopes
- ✅ Build completed successfully

## Blocked
Nothing

## Next Up
Test the gateway connection to verify chat functionality works

## Context
- Gateway was rejecting connections with "missing scope operator.write"
- iOS app was connecting as role: "operator" with scopes: ["chat", "node", "operator.read"]
- Gateway requires "operator.write" scope for chat.send and other write methods
- Fixed by adding "operator.write" to scopes array in GatewayConnectionController:328
- Recent commit 9034bfbd8 added NODE_ALLOWED_METHODS but app still connects as operator role
- Also fixed TLS default to true (line 32) which caused initial connection failures
