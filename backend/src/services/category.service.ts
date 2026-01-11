import { CategoryModel, Category, CreateCategoryDTO, UpdateCategoryDTO } from '../models/category.model';

export class CategoryService {
  // Get all categories (flat list)
  static async getAllCategories(): Promise<Category[]> {
    return CategoryModel.findAll();
  }

  // Get all top-level categories
  static async getTopLevelCategories(): Promise<Category[]> {
    return CategoryModel.findTopLevel();
  }

  // Get children of a category
  static async getChildCategories(parentId: string): Promise<Category[]> {
    return CategoryModel.findChildren(parentId);
  }

  // Get category by ID
  static async getCategoryById(id: string): Promise<Category | null> {
    return CategoryModel.findById(id);
  }

  // Get full category tree
  static async getCategoryTree(): Promise<Category[]> {
    return CategoryModel.getCategoryTree();
  }

  // Create category
  static async createCategory(data: CreateCategoryDTO): Promise<Category> {
    return CategoryModel.create(data);
  }

  // Update category
  static async updateCategory(id: string, data: UpdateCategoryDTO): Promise<Category | null> {
    return CategoryModel.update(id, data);
  }

  // Delete category (with validation)
  static async deleteCategory(id: string): Promise<{ success: boolean; message?: string }> {
    // Check if category has children
    const hasChildren = await CategoryModel.hasChildren(id);
    if (hasChildren) {
      return { success: false, message: 'Cannot delete category with subcategories' };
    }

    // Check if category has products
    const hasProducts = await CategoryModel.hasProducts(id);
    if (hasProducts) {
      return { success: false, message: 'Cannot delete category with products' };
    }

    const deleted = await CategoryModel.delete(id);
    return { success: deleted };
  }
}
