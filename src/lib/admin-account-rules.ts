/** Rules deciding whether an admin may ban or permanently delete an account. */
const ADMIN_ROLES = ["admin", "super_admin"];

export function isAdminRole(roles: readonly string[]): boolean {
  return roles.some((r) => ADMIN_ROLES.includes(r));
}

export function accountActionDenial(input: {
  callerId: string;
  callerRoles: readonly string[];
  targetId: string;
  targetRoles: readonly string[];
}): string | null {
  if (!isAdminRole(input.callerRoles)) return "هذه العملية للمسؤول فقط";
  if (input.callerId === input.targetId) return "لا يمكنك حظر أو حذف حسابك أنت";
  if (isAdminRole(input.targetRoles)) return "لا يمكن حظر أو حذف حساب مسؤول";
  return null;
}
