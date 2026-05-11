"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const kyc_1 = require("../kyc");
describe("getEffectiveKycStatus", () => {
    it("returns unverified for no applications", () => {
        const result = (0, kyc_1.getEffectiveKycStatus)([]);
        expect(result.isVerified).toBe(false);
        expect(result.level).toBe(0);
        expect(result.features).toEqual([]);
        expect(result.effectiveApplication).toBeNull();
    });
    it("returns unverified for only PENDING applications", () => {
        const apps = [
            { status: "PENDING", level: { level: 1, features: [] } }
        ];
        const result = (0, kyc_1.getEffectiveKycStatus)(apps);
        expect(result.isVerified).toBe(false);
        expect(result.level).toBe(0);
    });
    it("returns Level 1 verified for single APPROVED Level 1", () => {
        const apps = [
            { status: "APPROVED", level: { level: 1, features: ["feature1"] } }
        ];
        const result = (0, kyc_1.getEffectiveKycStatus)(apps);
        expect(result.isVerified).toBe(true);
        expect(result.level).toBe(1);
        expect(result.features).toContain("feature1");
    });
    it("returns Level 1 when Level 1 APPROVED + Level 2 PENDING", () => {
        const apps = [
            { status: "APPROVED", level: { level: 1, features: ["feature1"] } },
            { status: "PENDING", level: { level: 2, features: ["feature2"] } }
        ];
        const result = (0, kyc_1.getEffectiveKycStatus)(apps);
        expect(result.isVerified).toBe(true);
        expect(result.level).toBe(1);
        expect(result.features).toEqual(["feature1"]);
    });
    it("returns Level 2 with cumulative features when both approved", () => {
        const apps = [
            { status: "APPROVED", level: { level: 1, features: ["feature1"] } },
            { status: "APPROVED", level: { level: 2, features: ["feature2"] } }
        ];
        const result = (0, kyc_1.getEffectiveKycStatus)(apps);
        expect(result.isVerified).toBe(true);
        expect(result.level).toBe(2);
        expect(result.features).toContain("feature1");
        expect(result.features).toContain("feature2");
    });
    it("ignores REJECTED applications", () => {
        const apps = [
            { status: "REJECTED", level: { level: 1, features: [] } },
            { status: "APPROVED", level: { level: 1, features: ["feature1"] } }
        ];
        const result = (0, kyc_1.getEffectiveKycStatus)(apps);
        expect(result.isVerified).toBe(true);
        expect(result.level).toBe(1);
    });
    it("handles malformed feature JSON gracefully", () => {
        const apps = [
            { status: "APPROVED", level: { level: 1, features: "invalid-json{" } }
        ];
        const result = (0, kyc_1.getEffectiveKycStatus)(apps);
        expect(result.isVerified).toBe(true);
        expect(result.level).toBe(1);
        expect(result.features).toEqual([]);
    });
    it("handles applications without level data", () => {
        const apps = [
            { status: "APPROVED", level: null }
        ];
        const result = (0, kyc_1.getEffectiveKycStatus)(apps);
        expect(result.isVerified).toBe(false);
    });
});
