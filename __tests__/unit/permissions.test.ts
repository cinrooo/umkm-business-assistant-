import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hasPermission, requirePermission } from "../../lib/permissions";

describe("RBAC Permissions Matrix", () => {
  it("OWNER has full permissions across all modules", () => {
    assert.equal(hasPermission("OWNER", "product:delete"), true);
    assert.equal(hasPermission("OWNER", "org:settings"), true);
    assert.equal(hasPermission("OWNER", "org:delete"), true);
    assert.equal(hasPermission("OWNER", "member:manage"), true);
    assert.equal(hasPermission("OWNER", "report:view"), true);
  });

  it("ADMIN has management permissions but cannot delete organization", () => {
    assert.equal(hasPermission("ADMIN", "product:delete"), true);
    assert.equal(hasPermission("ADMIN", "member:manage"), true);
    assert.equal(hasPermission("ADMIN", "org:settings"), true);
    assert.equal(hasPermission("ADMIN", "org:delete"), false);
  });

  it("MANAGER can manage products and view reports, but cannot manage team members", () => {
    assert.equal(hasPermission("MANAGER", "product:create"), true);
    assert.equal(hasPermission("MANAGER", "product:update"), true);
    assert.equal(hasPermission("MANAGER", "product:delete"), false); // manager cannot delete product
    assert.equal(hasPermission("MANAGER", "report:view"), true);
    assert.equal(hasPermission("MANAGER", "member:manage"), false);
    assert.equal(hasPermission("MANAGER", "org:settings"), false);
  });

  it("STAFF only has operational POS and stock check access", () => {
    assert.equal(hasPermission("STAFF", "sale:create"), true);
    assert.equal(hasPermission("STAFF", "product:read"), true);
    assert.equal(hasPermission("STAFF", "inventory:read"), true);
    assert.equal(hasPermission("STAFF", "inventory:adjust"), true);

    // Forbidden for STAFF:
    assert.equal(hasPermission("STAFF", "product:create"), false);
    assert.equal(hasPermission("STAFF", "product:delete"), false);
    assert.equal(hasPermission("STAFF", "expense:read"), false);
    assert.equal(hasPermission("STAFF", "report:view"), false);
    assert.equal(hasPermission("STAFF", "member:manage"), false);
    assert.equal(hasPermission("STAFF", "org:settings"), false);
  });

  it("requirePermission throws error when permission is denied", () => {
    assert.throws(
      () => requirePermission("STAFF", "report:view"),
      /Forbidden: role STAFF tidak memiliki izin report:view/
    );

    assert.doesNotThrow(() => requirePermission("OWNER", "report:view"));
  });
});
