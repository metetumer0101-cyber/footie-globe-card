import { createContext, useContext } from "react";

export type AdminRole = {
  isAdmin: boolean;
  isModerator: boolean;
};

const AdminRoleContext = createContext<AdminRole>({ isAdmin: false, isModerator: false });

export const AdminRoleProvider = AdminRoleContext.Provider;

export function useAdminRole(): AdminRole {
  return useContext(AdminRoleContext);
}
