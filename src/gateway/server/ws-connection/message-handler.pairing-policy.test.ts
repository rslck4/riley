import { describe, expect, test } from "vitest";
import { resolvePairingAutoApprovePolicy } from "./message-handler.js";

describe("resolvePairingAutoApprovePolicy", () => {
  test("defaults to disabled when flags are missing", () => {
    const result = resolvePairingAutoApprovePolicy({
      nodeEnv: "test",
      e2eMode: undefined,
      e2eAutoApprovePairing: undefined,
      e2eAllowTailnet: undefined,
      isLocalClient: true,
      isLoopbackSocket: true,
      isHostLocal: true,
      isTailscaleRequest: false,
    });
    expect(result).toEqual({ enabled: false, reason: "pairing_flag_disabled" });
  });

  test("enables for local/loopback only when explicit E2E flags are set", () => {
    const result = resolvePairingAutoApprovePolicy({
      nodeEnv: "test",
      e2eMode: "1",
      e2eAutoApprovePairing: "1",
      e2eAllowTailnet: undefined,
      isLocalClient: false,
      isLoopbackSocket: true,
      isHostLocal: true,
      isTailscaleRequest: false,
    });
    expect(result).toEqual({ enabled: true, reason: "loopback_local" });
  });

  test("blocks in production even if flags are set", () => {
    const result = resolvePairingAutoApprovePolicy({
      nodeEnv: "production",
      e2eMode: "1",
      e2eAutoApprovePairing: "1",
      e2eAllowTailnet: "1",
      isLocalClient: true,
      isLoopbackSocket: true,
      isHostLocal: true,
      isTailscaleRequest: true,
    });
    expect(result).toEqual({ enabled: false, reason: "disabled_in_production" });
  });

  test("requires explicit tailnet override", () => {
    const blocked = resolvePairingAutoApprovePolicy({
      nodeEnv: "test",
      e2eMode: "1",
      e2eAutoApprovePairing: "1",
      e2eAllowTailnet: undefined,
      isLocalClient: false,
      isLoopbackSocket: false,
      isHostLocal: false,
      isTailscaleRequest: true,
    });
    expect(blocked).toEqual({ enabled: false, reason: "origin_not_allowed" });

    const allowed = resolvePairingAutoApprovePolicy({
      nodeEnv: "test",
      e2eMode: "1",
      e2eAutoApprovePairing: "1",
      e2eAllowTailnet: "1",
      isLocalClient: false,
      isLoopbackSocket: false,
      isHostLocal: false,
      isTailscaleRequest: true,
    });
    expect(allowed).toEqual({ enabled: true, reason: "tailnet_override" });
  });
});
