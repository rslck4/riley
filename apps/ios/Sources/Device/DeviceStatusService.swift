import Foundation
import OpenClawKit
import UIKit

final class DeviceStatusService: DeviceStatusServicing {
    private let networkStatus: NetworkStatusService

    init(networkStatus: NetworkStatusService = NetworkStatusService()) {
        self.networkStatus = networkStatus
    }

    func status() async throws -> OpenClawDeviceStatusPayload {
        let battery = await self.batteryStatus()
        let thermal = self.thermalStatus()
        let storage = self.storageStatus()
        let network = await self.networkStatus.currentStatus()
        let uptime = ProcessInfo.processInfo.systemUptime

        return OpenClawDeviceStatusPayload(
            battery: battery,
            thermal: thermal,
            storage: storage,
            network: network,
            uptimeSeconds: uptime)
    }

    func info() async -> OpenClawDeviceInfoPayload {
        let (deviceName, systemName, systemVersion) = await MainActor.run {
            let d = UIDevice.current
            return (d.name, d.systemName, d.systemVersion)
        }
        let appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "dev"
        let appBuild = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "0"
        let locale = Locale.preferredLanguages.first ?? Locale.current.identifier
        return OpenClawDeviceInfoPayload(
            deviceName: deviceName,
            modelIdentifier: Self.modelIdentifier(),
            systemName: systemName,
            systemVersion: systemVersion,
            appVersion: appVersion,
            appBuild: appBuild,
            locale: locale)
    }

    private func batteryStatus() async -> OpenClawBatteryStatusPayload {
        let (level, batteryState) = await MainActor.run {
            let d = UIDevice.current
            d.isBatteryMonitoringEnabled = true
            let rawLevel = d.batteryLevel
            return (rawLevel, d.batteryState)
        }
        let resolvedLevel = level >= 0 ? Double(level) : nil
        let state: OpenClawBatteryState = switch batteryState {
        case .charging: .charging
        case .full: .full
        case .unplugged: .unplugged
        case .unknown: .unknown
        @unknown default: .unknown
        }
        return OpenClawBatteryStatusPayload(
            level: resolvedLevel,
            state: state,
            lowPowerModeEnabled: ProcessInfo.processInfo.isLowPowerModeEnabled)
    }

    private func thermalStatus() -> OpenClawThermalStatusPayload {
        let state: OpenClawThermalState = switch ProcessInfo.processInfo.thermalState {
        case .nominal: .nominal
        case .fair: .fair
        case .serious: .serious
        case .critical: .critical
        @unknown default: .nominal
        }
        return OpenClawThermalStatusPayload(state: state)
    }

    private func storageStatus() -> OpenClawStorageStatusPayload {
        let attrs = (try? FileManager.default.attributesOfFileSystem(forPath: NSHomeDirectory())) ?? [:]
        let total = (attrs[.systemSize] as? NSNumber)?.int64Value ?? 0
        let free = (attrs[.systemFreeSize] as? NSNumber)?.int64Value ?? 0
        let used = max(0, total - free)
        return OpenClawStorageStatusPayload(totalBytes: total, freeBytes: free, usedBytes: used)
    }

    private static func modelIdentifier() -> String {
        var systemInfo = utsname()
        uname(&systemInfo)
        let machine = withUnsafeBytes(of: &systemInfo.machine) { ptr in
            String(bytes: ptr.prefix { $0 != 0 }, encoding: .utf8)
        }
        let trimmed = machine?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return trimmed.isEmpty ? "unknown" : trimmed
    }
}
