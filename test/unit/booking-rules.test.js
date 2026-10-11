import {
  canPurchaseChildTicket,
  isAgeEligible,
  isHoldExpired,
  isProfileComplete,
  isRefundEligible,
  isSeatCountAllowed,
} from "../../src/booking/booking-rules.js";

describe("booking rules", () => {
  describe("seat limits", () => {
    it("allows up to three seats per order", () => {
      expect(isSeatCountAllowed(3)).toBe(true);
    });

    it("rejects orders with more than three seats", () => {
      expect(isSeatCountAllowed(4)).toBe(false);
    });
  });

  describe("child tickets", () => {
    it.each(["16+", "18+"])("refuses child tickets for %s titles", (rating) => {
      expect(canPurchaseChildTicket(rating)).toBe(false);
    });

    it("allows child tickets for titles rated below 16+", () => {
      expect(canPurchaseChildTicket("12+")).toBe(true);
    });
  });

  describe("age gate", () => {
    it("uses the profile date of birth to allow a viewer who meets the rating", () => {
      expect(isAgeEligible("2010-06-15", "16+", "2026-06-15")).toBe(true);
    });

    it("rejects a viewer who has not reached the rating age on the session date", () => {
      expect(isAgeEligible("2010-06-16", "16+", "2026-06-15")).toBe(false);
    });

    it("applies the 18+ rating using the profile date of birth", () => {
      expect(isAgeEligible("2008-06-16", "18+", "2026-06-15")).toBe(false);
      expect(isAgeEligible("2008-06-15", "18+", "2026-06-15")).toBe(true);
    });
  });

  describe("seat holds", () => {
    it("keeps seats held before eight minutes have elapsed", () => {
      expect(
        isHoldExpired("2026-06-15T12:00:00.000Z", "2026-06-15T12:07:59.999Z"),
      ).toBe(false);
    });

    it("frees held seats at the eight-minute expiry", () => {
      expect(
        isHoldExpired("2026-06-15T12:00:00.000Z", "2026-06-15T12:08:00.000Z"),
      ).toBe(true);
    });
  });

  describe("refund deadline", () => {
    it("allows refunds more than two hours before the session", () => {
      expect(
        isRefundEligible("2026-06-15T20:00:00.000Z", "2026-06-15T17:59:59.999Z"),
      ).toBe(true);
    });

    it("closes refunds at the two-hour cutoff", () => {
      expect(
        isRefundEligible("2026-06-15T20:00:00.000Z", "2026-06-15T18:00:00.000Z"),
      ).toBe(false);
    });
  });

  describe("profile completeness", () => {
    it("requires a name, mobile number, and date of birth", () => {
      expect(
        isProfileComplete({
          name: "Alex Example",
          mobileNumber: "+995555123456",
          dateOfBirth: "2000-01-01",
        }),
      ).toBe(true);
    });

    it.each([
      {
        field: "name",
        profile: { mobileNumber: "+995555123456", dateOfBirth: "2000-01-01" },
      },
      {
        field: "mobile number",
        profile: { name: "Alex Example", dateOfBirth: "2000-01-01" },
      },
      {
        field: "date of birth",
        profile: { name: "Alex Example", mobileNumber: "+995555123456" },
      },
    ])("rejects a profile missing its $field", ({ profile }) => {
      expect(isProfileComplete(profile)).toBe(false);
    });
  });
});
