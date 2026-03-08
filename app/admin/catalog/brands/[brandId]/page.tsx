"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { Category } from "@/lib/types";
import { getErrorMessage } from "@/lib/utils";
import { usePagination } from "@/lib/hooks/usePagination";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TablePagination } from "@/components/shared/TablePagination";
import {
  Pencil,
  FolderOpen,
  Plus,
  Search,
  UserCheck,
  XCircle,
  ArrowLeft,
  ChevronRight,
  ImageIcon,
  Trash2,
  Upload,
} from "lucide-react";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const CATEGORY_TAGS = ["Clothing", "Shoes", "Bags", "Accessories", "Underwear"];

function CategoryImageCell({ storageId }: { storageId: Id<"_storage"> }) {
  const imageUrl = useQuery(api.catalog.publicBrowse.getImageUrl, { storageId });
  if (!imageUrl) return <span className="text-sm text-muted-foreground">Loading...</span>;
  return (
    <div className="relative h-10 w-10 overflow-hidden rounded-md border">
      <Image src={imageUrl} alt="Category" fill className="object-contain" sizes="40px" />
    </div>
  );
}

export default function BrandCategoriesPage() {
  const params = useParams();
  const brandId = params.brandId as Id<"brands">;

  const brand = useQuery(api.catalog.brands.getBrandById, { brandId });
  const categories = useQuery(api.catalog.categories.listCategories, {
    brandId,
  });
  const createCategory = useMutation(api.catalog.categories.createCategory);
  const updateCategory = useMutation(api.catalog.categories.updateCategory);
  const deactivateCategory = useMutation(
    api.catalog.categories.deactivateCategory
  );
  const reactivateCategory = useMutation(
    api.catalog.categories.reactivateCategory
  );
  const generateUploadUrl = useMutation(api.catalog.images.generateUploadUrl);
  const saveCategoryImage = useMutation(api.catalog.categories.saveCategoryImage);
  const deleteCategoryImage = useMutation(api.catalog.categories.deleteCategoryImage);

  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", tag: "" });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  // Edit dialog state
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editForm, setEditForm] = useState({ name: "", tag: "" });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const editFileRef = useRef<HTMLInputElement>(null);

  // Category image URL resolver
  const categoryImageUrl = useQuery(
    api.catalog.publicBrowse.getImageUrl,
    editingCategory?.storageId ? { storageId: editingCategory.storageId } : "skip"
  );

  // Filter categories
  const filteredCategories = categories?.filter((category) => {
    const matchesSearch =
      searchQuery === "" ||
      category.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && category.isActive) ||
      (statusFilter === "inactive" && !category.isActive);
    return matchesSearch && matchesStatus;
  });

  const pagination = usePagination(filteredCategories);

  const resetCreateForm = () => {
    setCreateForm({ name: "", tag: "" });
    setCreateErrors({});
  };

  const validateCreateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!createForm.name.trim()) errors.name = "Name is required";
    setCreateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateCreateForm()) return;

    setIsSubmitting(true);
    try {
      await createCategory({
        brandId,
        name: createForm.name.trim(),
        tag: createForm.tag || undefined,
      });
      toast.success("Category created successfully");
      setShowCreateDialog(false);
      resetCreateForm();
    } catch (error) {
      toast.error(`Failed to create category: ${getErrorMessage(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setEditForm({ name: category.name, tag: category.tag ?? "" });
    setEditErrors({});
  };

  const validateEditForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!editForm.name.trim()) errors.name = "Name is required";
    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveEdit = async () => {
    if (!editingCategory || !validateEditForm()) return;

    setIsSubmitting(true);
    try {
      await updateCategory({
        categoryId: editingCategory._id,
        name: editForm.name.trim(),
        tag: editForm.tag || undefined,
      });
      toast.success("Category updated successfully");
      setEditingCategory(null);
    } catch (error) {
      toast.error(`Failed to update category: ${getErrorMessage(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (category: Category) => {
    const confirmed = window.confirm(
      `Deactivate category "${category.name}"? Existing products will remain.`
    );
    if (!confirmed) return;

    try {
      await deactivateCategory({ categoryId: category._id });
      toast.success(`"${category.name}" deactivated`);
    } catch (error) {
      toast.error(`Failed to deactivate: ${getErrorMessage(error)}`);
    }
  };

  const handleReactivate = async (category: Category) => {
    try {
      await reactivateCategory({ categoryId: category._id });
      toast.success(`"${category.name}" reactivated`);
    } catch (error) {
      toast.error(`Failed to reactivate: ${getErrorMessage(error)}`);
    }
  };

  const handleCategoryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingCategory) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Invalid file type. Please upload JPEG, PNG, or WebP.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum size is 5MB.");
      return;
    }

    setIsUploadingImage(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      await saveCategoryImage({ categoryId: editingCategory._id, storageId });
      toast.success("Category image updated");
    } catch (error) {
      toast.error(`Failed to upload image: ${getErrorMessage(error)}`);
    } finally {
      setIsUploadingImage(false);
      if (editFileRef.current) editFileRef.current.value = "";
    }
  };

  const handleCategoryImageDelete = async () => {
    if (!editingCategory) return;

    setIsUploadingImage(true);
    try {
      await deleteCategoryImage({ categoryId: editingCategory._id });
      toast.success("Category image removed");
    } catch (error) {
      toast.error(`Failed to remove image: ${getErrorMessage(error)}`);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Loading state
  if (brand === undefined || categories === undefined) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Categories</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (brand === null) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/catalog"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Catalog
        </Link>
        <h1 className="text-2xl font-bold">Brand Not Found</h1>
        <p className="text-muted-foreground">
          The requested brand does not exist or has been removed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link
          href="/admin/catalog"
          className="hover:text-foreground transition-colors"
        >
          Catalog
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{brand.name}</span>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{brand.name}</h1>
            <Badge variant={brand.isActive ? "default" : "destructive"}>
              {brand.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {filteredCategories?.length ?? 0} categor
            {(filteredCategories?.length ?? 0) !== 1 ? "ies" : "y"}
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          disabled={!brand.isActive}
          title={
            brand.isActive
              ? "Create new category"
              : "Cannot add categories to inactive brand"
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          New Category
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by category name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Categories Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Tag</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.paginatedData.length > 0 ? (
              pagination.paginatedData.map((category) => (
                <TableRow key={category._id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/catalog/brands/${brandId}/categories/${category._id}`}
                      className="flex items-center gap-2 hover:text-primary transition-colors group"
                    >
                      <FolderOpen className="h-4 w-4 text-muted-foreground" />
                      {category.name}
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </TableCell>
                  <TableCell>
                    {category.tag ? (
                      <Badge variant="outline">{category.tag}</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {category.storageId ? (
                      <CategoryImageCell storageId={category.storageId} />
                    ) : (
                      <span className="text-sm text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={category.isActive ? "default" : "destructive"}
                    >
                      {category.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(category)}
                        title="Edit category"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {category.isActive ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeactivate(category)}
                          title="Deactivate category"
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReactivate(category)}
                          title="Reactivate category"
                        >
                          <UserCheck className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-8"
                >
                  {searchQuery || statusFilter !== "all"
                    ? "No categories match the current filters"
                    : "No categories yet. Create the first category for this brand."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <TablePagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        hasNextPage={pagination.hasNextPage}
        hasPrevPage={pagination.hasPrevPage}
        onNextPage={pagination.nextPage}
        onPrevPage={pagination.prevPage}
        noun="category"
      />

      {/* Create Category Dialog */}
      <Dialog
        open={showCreateDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false);
            resetCreateForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Category for {brand.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-cat-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-cat-name"
                placeholder="e.g. Shoes, Apparel, Accessories"
                value={createForm.name}
                onChange={(e) => {
                  setCreateForm({ ...createForm, name: e.target.value });
                  if (createErrors.name) {
                    setCreateErrors({});
                  }
                }}
                className={createErrors.name ? "border-destructive" : ""}
              />
              {createErrors.name && (
                <p className="text-sm text-destructive">{createErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-cat-tag">Tag</Label>
              <Select
                value={createForm.tag || "_none"}
                onValueChange={(val) =>
                  setCreateForm({ ...createForm, tag: val === "_none" ? "" : val })
                }
              >
                <SelectTrigger id="create-cat-tag">
                  <SelectValue placeholder="Select a tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {CATEGORY_TAGS.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                resetCreateForm();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog
        open={editingCategory !== null}
        onOpenChange={(open) => !open && setEditingCategory(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-cat-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-cat-name"
                value={editForm.name}
                onChange={(e) => {
                  setEditForm({ ...editForm, name: e.target.value });
                  if (editErrors.name) {
                    setEditErrors({});
                  }
                }}
                className={editErrors.name ? "border-destructive" : ""}
              />
              {editErrors.name && (
                <p className="text-sm text-destructive">{editErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cat-tag">Tag</Label>
              <Select
                value={editForm.tag || "_none"}
                onValueChange={(val) =>
                  setEditForm({ ...editForm, tag: val === "_none" ? "" : val })
                }
              >
                <SelectTrigger id="edit-cat-tag">
                  <SelectValue placeholder="Select a tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {CATEGORY_TAGS.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Category Image */}
            <div className="space-y-2">
              <Label>Image</Label>
              {editingCategory?.storageId && categoryImageUrl ? (
                <div className="flex items-center gap-3">
                  <div className="relative h-16 w-16 overflow-hidden rounded-md border">
                    <Image
                      src={categoryImageUrl}
                      alt="Category"
                      fill
                      className="object-contain"
                      sizes="64px"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => editFileRef.current?.click()}
                      disabled={isUploadingImage}
                    >
                      <Upload className="mr-1 h-3 w-3" />
                      Replace
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCategoryImageDelete}
                      disabled={isUploadingImage}
                    >
                      <Trash2 className="mr-1 h-3 w-3 text-destructive" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => editFileRef.current?.click()}
                  disabled={isUploadingImage}
                >
                  <Upload className="mr-1 h-3 w-3" />
                  {isUploadingImage ? "Uploading..." : "Upload Image"}
                </Button>
              )}
              <input
                ref={editFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleCategoryImageUpload}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingCategory(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
