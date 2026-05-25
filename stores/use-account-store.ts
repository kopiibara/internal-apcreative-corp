"use client";

import { create } from "zustand";

import type { AccountListItem } from "@/lib/auth/accounts";

type AccountStore = {
  selectedAccountId: number | null;
  selectedAccount: AccountListItem | null;
  isCreateDialogOpen: boolean;
  isEditDialogOpen: boolean;
  isDisableDialogOpen: boolean;
  isDetailsSheetOpen: boolean;
  isForcePasswordDialogOpen: boolean;
  isSoftDeleteDialogOpen: boolean;
  searchQuery: string;
  selectedRoleFilter: string;
  selectedBrandFilter: string;
  selectedStatusFilter: string;
  selectedAccountTypeFilter: string;
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  openEditDialog: (account: AccountListItem) => void;
  closeEditDialog: () => void;
  openDisableDialog: (account: AccountListItem) => void;
  closeDisableDialog: () => void;
  openDetailsSheet: (account: AccountListItem) => void;
  closeDetailsSheet: () => void;
  openForcePasswordDialog: (account: AccountListItem) => void;
  closeForcePasswordDialog: () => void;
  openSoftDeleteDialog: (account: AccountListItem) => void;
  closeSoftDeleteDialog: () => void;
  setSelectedAccount: (account: AccountListItem | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedRoleFilter: (roleId: string) => void;
  setSelectedBrandFilter: (brandId: string) => void;
  setSelectedStatusFilter: (status: string) => void;
  setSelectedAccountTypeFilter: (accountType: string) => void;
  resetAccountFilters: () => void;
};

export const useAccountStore = create<AccountStore>((set) => ({
  selectedAccountId: null,
  selectedAccount: null,
  isCreateDialogOpen: false,
  isEditDialogOpen: false,
  isDisableDialogOpen: false,
  isDetailsSheetOpen: false,
  isForcePasswordDialogOpen: false,
  isSoftDeleteDialogOpen: false,
  searchQuery: "",
  selectedRoleFilter: "all",
  selectedBrandFilter: "all",
  selectedStatusFilter: "all",
  selectedAccountTypeFilter: "all",
  openCreateDialog: () => set({ isCreateDialogOpen: true }),
  closeCreateDialog: () => set({ isCreateDialogOpen: false }),
  openEditDialog: (account) =>
    set({
      selectedAccountId: account.id,
      selectedAccount: account,
      isEditDialogOpen: true,
    }),
  closeEditDialog: () =>
    set({
      selectedAccountId: null,
      selectedAccount: null,
      isEditDialogOpen: false,
    }),
  openDisableDialog: (account) =>
    set({
      selectedAccountId: account.id,
      selectedAccount: account,
      isDisableDialogOpen: true,
    }),
  closeDisableDialog: () =>
    set({
      selectedAccountId: null,
      selectedAccount: null,
      isDisableDialogOpen: false,
    }),
  openDetailsSheet: (account) =>
    set({
      selectedAccountId: account.id,
      selectedAccount: account,
      isDetailsSheetOpen: true,
    }),
  closeDetailsSheet: () =>
    set({
      selectedAccountId: null,
      selectedAccount: null,
      isDetailsSheetOpen: false,
    }),
  openForcePasswordDialog: (account) =>
    set({
      selectedAccountId: account.id,
      selectedAccount: account,
      isForcePasswordDialogOpen: true,
    }),
  closeForcePasswordDialog: () =>
    set({
      selectedAccountId: null,
      selectedAccount: null,
      isForcePasswordDialogOpen: false,
    }),
  openSoftDeleteDialog: (account) =>
    set({
      selectedAccountId: account.id,
      selectedAccount: account,
      isSoftDeleteDialogOpen: true,
    }),
  closeSoftDeleteDialog: () =>
    set({
      selectedAccountId: null,
      selectedAccount: null,
      isSoftDeleteDialogOpen: false,
    }),
  setSelectedAccount: (account) =>
    set({
      selectedAccountId: account?.id ?? null,
      selectedAccount: account,
    }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedRoleFilter: (selectedRoleFilter) => set({ selectedRoleFilter }),
  setSelectedBrandFilter: (selectedBrandFilter) => set({ selectedBrandFilter }),
  setSelectedStatusFilter: (selectedStatusFilter) =>
    set({ selectedStatusFilter }),
  setSelectedAccountTypeFilter: (selectedAccountTypeFilter) =>
    set({ selectedAccountTypeFilter }),
  resetAccountFilters: () =>
    set({
      searchQuery: "",
      selectedRoleFilter: "all",
      selectedBrandFilter: "all",
      selectedStatusFilter: "all",
      selectedAccountTypeFilter: "all",
    }),
}));
