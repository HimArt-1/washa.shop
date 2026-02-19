import { getCategories } from "@/app/actions/settings";
import { CategoriesClient } from "./CategoriesClient";

export default async function AdminCategoriesPage() {
    const { data: categories } = await getCategories();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-fg">إدارة الفئات</h1>
                <p className="text-fg/40 mt-1">إضافة وتعديل وحذف فئات الأعمال الفنية.</p>
            </div>

            <CategoriesClient categories={categories} />
        </div>
    );
}
