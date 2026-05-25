"use client";

import { create } from "zustand";

import type { BrandStatusFilter } from "@/app/admin/brands/schema";
import type { Brand } from "@/lib/brands/brands";

type BrandStore = {
  selectedBrandId: number | null;
  selectedBrand: Brand | null;
  isCreateDialogOpen: boolean;
  isEditDialogOpen: boolean;
  isDeactivateDialogOpen: boolean;
  isDeleteDialogOpen: boolean;
  isAnalyticsSheetOpen: boolean;
  searchQuery: string;
  selectedStatusFilter: BrandStatusFilter;
  selectedBrandFilter: string;
  openCreateDialog: () => void;
  closeCreateDialog: () => void;
  openEditDialog: (brand: Brand) => void;
  closeEditDialog: () => void;
  openDeactivateDialog: (brand: Brand) => void;
  closeDeactivateDialog: () => void;
  openDeleteDialog: (brand: Brand) => void;
  closeDeleteDialog: () => void;
  openAnalyticsSheet: (brand: Brand) => void;
  closeAnalyticsSheet: () => void;
  setSelectedBrand: (brand: Brand | null) => void;
  setSearchQuery: (query: string) => void;
  setSelectedStatusFilter: (status: BrandStatusFilter) => void;
  setSelectedBrandFilter: (brandId: string) => void;
  resetBrandFilters: () => void;
};

const clearSelection = {
  selectedBrandId: null,
  selectedBrand: null,
};

export const useBrandStore = create<BrandStore>((set) => ({
  selectedBrandId: null,
  selectedBrand: null,
  isCreateDialogOpen: false,
  isEditDialogOpen: false,
  isDeactivateDialogOpen: false,
  isDeleteDialogOpen: false,
  isAnalyticsSheetOpen: false,
  searchQuery: "",
  selectedStatusFilter: "all",
  selectedBrandFilter: "all",
  openCreateDialog: () => set({ isCreateDialogOpen: true }),
  closeCreateDialog: () => set({ isCreateDialogOpen: false }),
  openEditDialog: (brand) =>
    set({
      selectedBrandId: brand.id,
      selectedBrand: brand,
      isEditDialogOpen: true,
    }),
  closeEditDialog: () =>
    set({
      ...clearSelection,
      isEditDialogOpen: false,
    }),
  openDeactivateDialog: (brand) =>
    set({
      selectedBrandId: brand.id,
      selectedBrand: brand,
      isDeactivateDialogOpen: true,
    }),
  closeDeactivateDialog: () =>
    set({
      ...clearSelection,
      isDeactivateDialogOpen: false,
    }),
  openDeleteDialog: (brand) =>
    set({
      selectedBrandId: brand.id,
      selectedBrand: brand,
      isDeleteDialogOpen: true,
    }),
  closeDeleteDialog: () =>
    set({
      ...clearSelection,
      isDeleteDialogOpen: false,
    }),
  openAnalyticsSheet: (brand) =>
    set({
      selectedBrandId: brand.id,
      selectedBrand: brand,
      isAnalyticsSheetOpen: true,
    }),
  closeAnalyticsSheet: () =>
    set({
      ...clearSelection,
      isAnalyticsSheetOpen: false,
    }),
  setSelectedBrand: (brand) =>
    set({
      selectedBrandId: brand?.id ?? null,
      selectedBrand: brand,
    }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedStatusFilter: (selectedStatusFilter) =>
    set({ selectedStatusFilter }),
  setSelectedBrandFilter: (selectedBrandFilter) => set({ selectedBrandFilter }),
  resetBrandFilters: () =>
    set({
      searchQuery: "",
      selectedStatusFilter: "all",
      selectedBrandFilter: "all",
    }),
}));
