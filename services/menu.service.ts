import {
  MenuItemRow,
  MenuRepository,
} from "@/repositories/menu.repository";

export type CustomerMenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  preparationArea: "KITCHEN" | "WAITER";
};

export type CustomerMenuCategory = {
  id: string;
  name: string;
  sortOrder: number;
  items: CustomerMenuItem[];
};

function normalizeMenuItem(
  item: MenuItemRow,
): CustomerMenuItem {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    price: Number(item.price),
    imageUrl: item.image_url,
    preparationArea: item.preparation_area,
  };
}

export class MenuService {
  static async getCustomerMenu(
    restaurantId: string,
  ): Promise<CustomerMenuCategory[]> {
    const [categories, items] = await Promise.all([
      MenuRepository.getActiveCategories(restaurantId),
      MenuRepository.getActiveItems(restaurantId),
    ]);

    const itemsByCategory = new Map<
      string,
      CustomerMenuItem[]
    >();

    for (const item of items) {
      if (!item.category_id) {
        continue;
      }

      const categoryItems =
        itemsByCategory.get(item.category_id) ?? [];

      categoryItems.push(normalizeMenuItem(item));

      itemsByCategory.set(
        item.category_id,
        categoryItems,
      );
    }

    return categories
      .map((category) => ({
        id: category.id,
        name: category.name,
        sortOrder: category.sort_order,
        items:
          itemsByCategory.get(category.id) ?? [],
      }))
      .filter((category) => category.items.length > 0);
  }
}