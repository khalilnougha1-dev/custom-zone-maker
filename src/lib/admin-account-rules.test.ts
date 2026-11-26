import { test } from "node:test";
import { strict as assert } from "node:assert";
import { accountActionDenial } from "./admin-account-rules";

test("an admin may ban or delete a normal customer", () => {
  assert.equal(accountActionDenial({ callerId: "a", callerRoles: ["admin"], targetId: "b", targetRoles: ["user"] }), null);
});
test("a non-admin caller is refused", () => {
  assert.notEqual(accountActionDenial({ callerId: "a", callerRoles: ["user"], targetId: "b", targetRoles: ["user"] }), null);
});
test("an admin cannot ban or delete their own account", () => {
  assert.notEqual(accountActionDenial({ callerId: "a", callerRoles: ["super_admin"], targetId: "a", targetRoles: ["user"] }), null);
});
test("another admin cannot be banned or deleted", () => {
  assert.notEqual(accountActionDenial({ callerId: "a", callerRoles: ["admin"], targetId: "b", targetRoles: ["user", "super_admin"] }), null);
});
