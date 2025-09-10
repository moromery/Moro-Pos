import React, { useState, useMemo } from 'react';
import { Category, Product } from '../types';
import { useTranslation } from '../contexts/LanguageContext';

interface CategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (category: Omit<Category, 'id'>) => void;
    categoryToEdit: Category | null;
    parentCategory: Category | null;
    allCategories: Category[];
}

const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, onSave, categoryToEdit, parentCategory, allCategories }) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [parentId, setParentId] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState<string>('');
    
    React.useEffect(() => {
        if (isOpen) {
            setName(categoryToEdit?.name || '');
            setParentId(categoryToEdit?.parentId || parentCategory?.id || null);
            setImageUrl(categoryToEdit?.imageUrl || '');
        }
    }, [isOpen, categoryToEdit, parentCategory]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setImageUrl(reader.result as string);
          };
          reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, parentId, imageUrl });
        onClose();
    };
    
    if (!isOpen) return null;

    const renderCategoryOptions = (categories: Category[], currentParentId: string | null, level: number): JSX.Element[] => {
        return categories
            .filter(c => c.parentId === currentParentId)
            .flatMap(c => [
                <option key={c.id} value={c.id}>
                    {'—'.repeat(level)} {c.name}
                </option>,
                ...renderCategoryOptions(categories, c.id, level + 1)
            ]);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-6">{categoryToEdit ? t('categoryModalEditTitle') : (parentCategory ? t('categoryModalAddSubTitle', parentCategory.name) : t('categoryModalAddMainTitle'))}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('categoryModalNamePlaceholder')} className="p-3 border rounded-lg w-full" required />
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('categoryModalImageLabel')}</label>
                        <div className="mt-1 flex items-center gap-4">
                            <img src={imageUrl || `https://via.placeholder.com/200x200.png?text=${encodeURIComponent(name || t('categoryModalImagePlaceholder'))}`} alt={t('categoryModalImagePreviewAlt')} className="w-20 h-20 object-cover rounded-lg border bg-gray-100" />
                            <label htmlFor="imageUpload" className="cursor-pointer bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
                                <span>{t('categoryModalChangeImage')}</span>
                                <input id="imageUpload" name="imageUpload" type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} />
                            </label>
                        </div>
                    </div>

                    <select value={parentId || ''} onChange={(e) => setParentId(e.target.value || null)} className="p-3 border rounded-lg w-full bg-white">
                        <option value="">{t('categoryModalParentOptionMain')}</option>
                        {renderCategoryOptions(allCategories.filter(c => c.id !== categoryToEdit?.id), null, 0)}
                    </select>
                    <div className="flex justify-end gap-4 mt-6">
                        <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">{t('cancel')}</button>
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t('save')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


interface CategoryItemProps {
  category: Category;
  level: number;
  allCategories: Category[];
  products: Product[];
  productCount: number;
  onAddSub: (parent: Category) => void;
  onEdit: (category: Category) => void;
  onDelete: (id: string) => void;
}

const CategoryItem: React.FC<CategoryItemProps> = ({ category, level, allCategories, products, productCount, onAddSub, onEdit, onDelete }) => {
    const { t } = useTranslation();
    const children = allCategories.filter(c => c.parentId === category.id);

    const getProductCountForChild = (childId: string): number => {
        const getDescendantIds = (parentId: string): string[] => {
          const directChildren = allCategories.filter(c => c.parentId === parentId);
          let ids = directChildren.map(c => c.id);
          directChildren.forEach(child => {
              ids = [...ids, ...getDescendantIds(child.id)];
          });
          return ids;
        };
        const allCategoryIds = [childId, ...getDescendantIds(childId)];
        return products.filter(p => allCategoryIds.includes(p.categoryId)).length;
    };

    return (
        <div className="flex flex-col">
            <div className="flex items-center justify-between p-3 bg-white border-b hover:bg-gray-50">
                <div style={{ paddingRight: `${level * 2}rem` }} className="flex items-center gap-3">
                   <img src={category.imageUrl || `https://via.placeholder.com/100x100.png?text=${encodeURIComponent(category.name)}`} alt={category.name} className="w-12 h-12 object-cover rounded-md flex-shrink-0" />
                   <div className="flex flex-col">
                       <span className="font-semibold">{category.name}</span> 
                       <span className="text-xs text-gray-500">{t('categoryProductCount', productCount)}</span>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => onAddSub(category)} className="text-sm text-green-600 hover:underline">{t('categoryAddSub')}</button>
                    <button onClick={() => onEdit(category)} className="text-sm text-blue-600 hover:underline">{t('edit')}</button>
                    <button onClick={() => onDelete(category.id)} className="text-sm text-red-600 hover:underline">{t('delete')}</button>
                </div>
            </div>
            {children.length > 0 && (
                <div className="border-r-2 border-gray-200">
                    {children.map(child => (
                        <CategoryItem
                            key={child.id}
                            category={child}
                            level={level + 1}
                            allCategories={allCategories}
                            products={products}
                            productCount={getProductCountForChild(child.id)}
                            onAddSub={onAddSub}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

interface CategoriesProps {
    categories: Category[];
    products: Product[];
    addCategory: (category: Omit<Category, 'id'>) => void;
    updateCategory: (category: Category) => void;
    deleteCategory: (id: string) => Promise<boolean>;
}

const Categories: React.FC<CategoriesProps> = ({ categories, products, addCategory, updateCategory, deleteCategory }) => {
    const { t } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
    const [parentCategory, setParentCategory] = useState<Category | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const getProductCount = (categoryId: string) => {
      const getDescendantIds = (parentId: string): string[] => {
          const children = categories.filter(c => c.parentId === parentId);
          let ids = children.map(c => c.id);
          children.forEach(child => {
              ids = [...ids, ...getDescendantIds(child.id)];
          });
          return ids;
      };
      const allCategoryIds = [categoryId, ...getDescendantIds(categoryId)];
      return products.filter(p => allCategoryIds.includes(p.categoryId)).length;
    };
    
    const getCategoryPath = (categoryId: string, allCategories: Category[]): string => {
        const path: string[] = [];
        let currentId: string | null = categoryId;
        const categoryMap = new Map(allCategories.map(c => [c.id, c]));

        while (currentId) {
            const category = categoryMap.get(currentId);
            if (category) {
                path.unshift(category.name);
                currentId = category.parentId;
            } else {
                currentId = null;
            }
        }
        return path.join(' / ');
    };

    const filteredSearchResults = useMemo(() => {
        if (!searchTerm.trim()) {
            return [];
        }
        const lowercasedTerm = searchTerm.toLowerCase();
        return categories.filter(category => category.name.toLowerCase().includes(lowercasedTerm));
    }, [categories, searchTerm]);

    const categoryTree = useMemo(() => {
        return categories.filter(c => c.parentId === null);
    }, [categories]);

    const handleOpenModal = (toEdit: Category | null = null, parent: Category | null = null) => {
        setCategoryToEdit(toEdit);
        setParentCategory(parent);
        setIsModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCategoryToEdit(null);
        setParentCategory(null);
    };

    const handleSaveCategory = (categoryData: Omit<Category, 'id'>) => {
        if (categoryToEdit) {
            updateCategory({ ...categoryToEdit, ...categoryData });
        } else {
            addCategory(categoryData);
        }
    };

    const handleDelete = (id: string) => {
        if (window.confirm(t('categoryDeleteConfirm'))) {
            deleteCategory(id);
        }
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-4xl font-bold text-gray-800">{t('categoriesTitle')}</h1>
                <div className="w-full md:w-auto flex flex-col md:flex-row gap-4">
                    <input
                        type="text"
                        placeholder={t('categorySearchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="p-3 border rounded-lg w-full md:w-64"
                    />
                    <button onClick={() => handleOpenModal()} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md">
                        {t('categoryAddMain')}
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-3 bg-gray-50 border-b font-semibold text-gray-600">
                    {searchTerm ? t('categorySearchResults', searchTerm) : t('categoryTreeTitle')}
                </div>
                {searchTerm.trim() ? (
                    <div>
                        {filteredSearchResults.length > 0 ? filteredSearchResults.map(cat => (
                             <div key={cat.id} className="flex items-center justify-between p-3 bg-white border-b hover:bg-gray-50">
                                <div className="flex items-center gap-3">
                                   <img src={cat.imageUrl || `https://via.placeholder.com/100x100.png?text=${encodeURIComponent(cat.name)}`} alt={cat.name} className="w-12 h-12 object-cover rounded-md flex-shrink-0" />
                                   <div>
                                       <span className="font-semibold">{cat.name}</span> 
                                       <span className="text-sm text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full mr-2">{getProductCount(cat.id)}</span>
                                       <p className="text-xs text-gray-400 mt-1">{getCategoryPath(cat.id, categories)}</p>
                                   </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => handleOpenModal(null, cat)} className="text-sm text-green-600 hover:underline">{t('categoryAddSub')}</button>
                                    <button onClick={() => handleOpenModal(cat)} className="text-sm text-blue-600 hover:underline">{t('edit')}</button>
                                    <button onClick={() => handleDelete(cat.id)} className="text-sm text-red-600 hover:underline">{t('delete')}</button>
                                </div>
                            </div>
                        )) : (
                            <div className="p-4 text-center text-gray-500">
                                {t('categoryNoResults')}
                            </div>
                        )}
                    </div>
                ) : (
                    categoryTree.map(cat => (
                        <CategoryItem
                            key={cat.id}
                            category={cat}
                            level={0}
                            allCategories={categories}
                            products={products}
                            productCount={getProductCount(cat.id)}
                            onAddSub={parent => handleOpenModal(null, parent)}
                            onEdit={handleOpenModal}
                            onDelete={handleDelete}
                        />
                    ))
                )}
            </div>

            <CategoryModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveCategory}
                categoryToEdit={categoryToEdit}
                parentCategory={parentCategory}
                allCategories={categories}
            />
        </div>
    );
};

export default Categories;