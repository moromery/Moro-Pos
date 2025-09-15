import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, Category, Unit, Batch } from '../types';
import usePosState from '../hooks/usePosState';
import { generateProductDescription } from '../services/geminiService';
import { exportToExcel } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';

type InventoryProps = ReturnType<typeof usePosState>;

type FormUnit = {
    id?: string;
    name: string;
    price: number;
    costPrice: number;
    relativeQuantity: number | string;
};

type ProductFormData = Omit<Product, 'id' | 'units' | 'batches'> & {
    units: FormUnit[];
    expiryDate?: string;
};

// BarcodeLabelModal Component
const BarcodeLabelModal: React.FC<{
    product: Product;
    onClose: () => void;
}> = ({ product, onClose }) => {
    const { t, language, currency } = useTranslation();
    const barcodeRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (barcodeRef.current && product.sku) {
            (window as any).JsBarcode(barcodeRef.current, product.sku, {
                format: "CODE128",
                displayValue: true,
                fontSize: 18,
                margin: 10,
            });
        }
    }, [product.sku]);

    const handlePrint = () => {
        const printContent = document.getElementById('barcode-label-content');
        if (!printContent) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert(t('allowPopupsForPrinting'));
            return;
        }
        printWindow.document.write('<html><head><title>Barcode Label</title>');
        printWindow.document.write('<style>@media print { .no-print { display: none; } body { margin: 0; padding: 10px; display: flex; justify-content: center; align-items: center; } .label-container { text-align: center; font-family: sans-serif; border: 1px solid #ccc; padding: 10px; border-radius: 5px; } }</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(printContent.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();

        printWindow.onafterprint = () => printWindow.close();
        
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 250);
    };

    const mainUnit = product.units.find(u => u.factor === 1) || product.units[0];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-xs">
                <h3 className="text-xl font-bold mb-4 text-center">{t('barcodeLabelTitle')}</h3>
                <div id="barcode-label-content" className="label-container text-center font-sans border p-4 rounded-lg">
                    <p className="font-bold text-lg">{product.name}</p>
                    <p className="text-md mb-2">{new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: currency }).format(mainUnit.price)}</p>
                    <svg ref={barcodeRef}></svg>
                </div>
                <div className="flex justify-around mt-6 no-print">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400">{t('close')}</button>
                    <button onClick={handlePrint} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t('print')}</button>
                </div>
            </div>
        </div>
    );
};


const CategoryOptions: React.FC<{ categories: Category[], parentId: string | null, level: number }> = ({ categories, parentId, level }) => {
    return categories
        .filter(c => c.parentId === parentId)
        .flatMap(cat => (
            <React.Fragment key={cat.id}>
                <option value={cat.id}>
                    {'—'.repeat(level)} {cat.name}
                </option>
                <CategoryOptions categories={categories} parentId={cat.id} level={level + 1} />
            </React.Fragment>
        ));
};

const ProductModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: (Product | Omit<Product, 'id' | 'batches'>) & { expiryDate?: string }) => void;
  product: Product | null;
  categories: Category[];
}> = ({ isOpen, onClose, onSave, product, categories }) => {
  const { t } = useTranslation();
  
  const initialFormState: ProductFormData = {
    name: '', categoryId: '', sku: '', stock: 0, description: '', imageUrl: '', expiryDate: '',
    sellingMethod: 'unit',
    units: [{ name: '', price: 0, costPrice: 0, relativeQuantity: 1 }]
  };

  const [formData, setFormData] = useState<ProductFormData>(initialFormState);
  const [stockUnitName, setStockUnitName] = useState<string>('');

  React.useEffect(() => {
    if (isOpen) {
        if (product) {
            const {id, batches, ...editableData} = product;
            
            const formUnits: FormUnit[] = editableData.units.map((unit, index, arr) => {
                const relativeQuantity = index > 0 ? (arr[index-1].factor / unit.factor) : 1;
                const { factor, ...restOfUnit } = unit;
                return { ...restOfUnit, relativeQuantity: isFinite(relativeQuantity) ? relativeQuantity : '' };
            });

            const largestUnit = editableData.units.reduce((prev, current) => (prev.factor > current.factor) ? prev : current, editableData.units[0]);
            const stockInLargestUnit = largestUnit.factor > 0 ? editableData.stock / largestUnit.factor : 0;

            setFormData({
                ...editableData,
                sellingMethod: editableData.sellingMethod || 'unit',
                units: formUnits,
                stock: Number.isFinite(stockInLargestUnit) ? stockInLargestUnit : 0,
                expiryDate: batches[0]?.expiryDate || '',
            });
            setStockUnitName(largestUnit.name);
        } else {
            setFormData(initialFormState);
            setStockUnitName('');
        }
    }
  }, [product, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'stock' ? parseFloat(value) || 0 : value }));
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUnitChange = (index: number, field: keyof FormUnit, value: string | number) => {
    const newUnits = [...formData.units];
    const unit = newUnits[index];
    
    if (typeof (unit as any)[field] === 'number') {
        (unit as any)[field] = parseFloat(value as string) || 0;
    } else {
        (unit as any)[field] = value;
    }

    if (index === 0 && field === 'name') {
        setStockUnitName(value as string);
    }
    setFormData(prev => ({ ...prev, units: newUnits }));
  };

  const addUnit = () => {
    setFormData(prev => ({ ...prev, units: [...prev.units, { name: '', price: 0, costPrice: 0, relativeQuantity: '' }] }));
  };

  const removeUnit = (index: number) => {
    if (formData.units.length > 1) {
      const removedUnitName = formData.units[index].name;
      if (stockUnitName === removedUnitName) {
        setStockUnitName(formData.units[index-1]?.name || '');
      }
      setFormData(prev => ({ ...prev, units: prev.units.filter((_, i) => i !== index) }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(formData.units.length === 0 || formData.units.some(u => !u.name.trim() || (formData.sellingMethod === 'unit' && u.relativeQuantity === ''))) {
        alert(t('productModalCompleteUnitInfo'));
        return;
    }

    const finalUnits: Unit[] = [];
    let currentFactor = 1;
    const tempIdPart = product?.id || `new_${Date.now()}`;

    for (let i = formData.units.length - 1; i >= 0; i--) {
        const formUnit = formData.units[i];
        finalUnits.unshift({
            id: formUnit.id || `u_${tempIdPart}_${i}`,
            name: formUnit.name,
            price: formUnit.price,
            costPrice: formUnit.costPrice,
            factor: currentFactor
        });
        if (i > 0 && formData.sellingMethod === 'unit') {
            const relativeQty = Number(formUnit.relativeQuantity);
            currentFactor *= isNaN(relativeQty) || relativeQty === 0 ? 1 : relativeQty;
        }
    }
    
    const selectedStockUnit = finalUnits.find(u => u.name === stockUnitName);
    if (!selectedStockUnit) {
        alert(t('productModalStockUnitError'));
        return;
    }
    const stockInBaseUnit = (formData.stock || 0) * selectedStockUnit.factor;
    
    const finalProductData = {
        ...formData,
        units: finalUnits,
        stock: stockInBaseUnit
    };
    
    const { units: formUnits, ...restOfData } = finalProductData;
    const saveData = { ...restOfData, units: finalUnits };

    if (product) {
        onSave({ ...product, ...saveData });
    } else {
        onSave(saveData);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-6">{product ? t('productModalEditTitle') : t('productModalAddTitle')}</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-1">{t('productModalProductName')}</label>
              <input id="productName" type="text" name="name" value={formData.name} onChange={handleChange} placeholder={t('productModalProductNamePlaceholder')} className="p-3 border rounded-lg w-full" required />
            </div>
             <div>
                <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">{t('productModalSku')}</label>
                <input id="sku" type="text" name="sku" value={formData.sku} onChange={handleChange} placeholder={t('productModalSkuPlaceholder')} className="p-3 border rounded-lg w-full" required />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-1">{t('productModalCategory')}</label>
                <select id="categoryId" name="categoryId" value={formData.categoryId} onChange={handleChange} className="p-3 border rounded-lg bg-white w-full" required>
                    <option value="" disabled>{t('productModalCategorySelect')}</option>
                    <CategoryOptions categories={categories} parentId={null} level={0} />
                </select>
            </div>
             <div>
                <label htmlFor="sellingMethod" className="block text-sm font-medium text-gray-700 mb-1">{t('productModalSellingMethod')}</label>
                <select id="sellingMethod" name="sellingMethod" value={formData.sellingMethod} onChange={handleChange} className="p-3 border rounded-lg bg-white w-full">
                    <option value="unit">{t('productModalSellingMethodUnit')}</option>
                    <option value="weight">{t('productModalSellingMethodWeight')}</option>
                </select>
            </div>
          </div>

          <div className="border p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">{t('productModalUnitsAndPrices')}</h3>
            {formData.sellingMethod === 'unit' ? (
                <p className="text-sm text-gray-600 mb-4">{t('productModalUnitHelpTextUnit')}</p>
            ) : (
                <p className="text-sm text-gray-600 mb-4">{t('productModalUnitHelpTextWeight')}</p>
            )}
            
            {formData.units.map((unit, index) => (
                <div key={index} className={`grid grid-cols-12 gap-2 items-center mb-2 p-2 bg-gray-50 rounded-md ${formData.sellingMethod === 'weight' && index > 0 ? 'hidden' : ''}`}>
                    <div className="col-span-12 md:col-span-8">
                         {index === 0 ? (
                            <div className="p-2 text-sm text-gray-500 bg-gray-100 rounded-md h-full flex items-center justify-center">
                               {formData.sellingMethod === 'unit' ? t('productModalBaseUnitLargest') : t('productModalBaseUnitWeight')}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 h-full">
                                <span className="text-sm text-gray-600 hidden md:inline">1 {formData.units[index-1]?.name || ''} =</span>
                                <input 
                                    type="number" 
                                    placeholder="0" 
                                    value={unit.relativeQuantity} 
                                    onChange={e => handleUnitChange(index, 'relativeQuantity', e.target.value)} 
                                    className="p-2 border rounded w-20 text-center" 
                                    min="1" 
                                    required 
                                    aria-label={`Number of ${unit.name} in one ${formData.units[index-1]?.name}`}
                                />
                                <span className="text-sm text-gray-800 font-medium">{t('productModalOfNextUnit')}</span>
                            </div>
                        )}
                    </div>
                     <div className="col-span-10 md:col-span-3">
                        <label className="block text-xs font-medium text-gray-500 md:hidden mb-1">{t('productModalUnitNameLabel')}</label>
                        <input type="text" placeholder={formData.sellingMethod === 'unit' ? t('productModalUnitNamePlaceholderUnit') : t('productModalUnitNamePlaceholderWeight')} value={unit.name} onChange={e => handleUnitChange(index, 'name', e.target.value)} className="p-2 border rounded w-full" required/>
                    </div>
                     <div className="col-span-2 md:col-span-1 flex items-center justify-center h-full">
                        {index > 0 && 
                          <button type="button" onClick={() => removeUnit(index)} className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-red-100 font-bold text-lg" aria-label="Remove unit">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        }
                    </div>

                    <div className="col-span-6 md:col-span-4">
                        <label className="block text-xs font-medium text-gray-500 mb-1">{t('productModalSellingPrice', unit.name || t('productModalUnit'))}</label>
                        <input type="number" placeholder="0.00" value={unit.price} onChange={e => handleUnitChange(index, 'price', e.target.value)} className="p-2 border rounded w-full" min="0" step="0.01" required/>
                    </div>
                    <div className="col-span-6 md:col-span-4">
                         <label className="block text-xs font-medium text-gray-500 mb-1">{t('productModalCostPrice', unit.name || t('productModalUnit'))}</label>
                        <input type="number" placeholder="0.00" value={unit.costPrice} onChange={e => handleUnitChange(index, 'costPrice', e.target.value)} className="p-2 border rounded w-full" min="0" step="0.01" required/>
                    </div>
                </div>
            ))}
            {formData.sellingMethod === 'unit' && 
                <button type="button" onClick={addUnit} className="mt-2 text-sm text-blue-600 font-semibold hover:underline">{t('productModalAddSmallerUnit')}</button>
            }
          </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">{t('productModalInitialStock')}</label>
                <div className="flex items-center gap-2">
                    <input id="stock" type="number" name="stock" value={formData.stock} onChange={handleChange} placeholder="0" className={`p-3 border rounded-lg w-full ${product ? 'bg-gray-200' : ''}`} required min="0" disabled={!!product} />
                    <select value={stockUnitName} onChange={e => setStockUnitName(e.target.value)} className={`p-3 border rounded-lg bg-white w-48 ${product ? 'bg-gray-200' : ''}`} disabled={!!product}>
                        {formData.units.filter(u => u.name).map(u => (
                            <option key={u.name} value={u.name}>{u.name}</option>
                        ))}
                    </select>
                </div>
                {product ? (
                     <p className="text-xs text-orange-600 mt-1">{t('productModalCannotEditStock')}</p>
                ) : (
                     <p className="text-xs text-gray-500 mt-1">{t('productModalStockHelpText')}</p>
                )}
             </div>
             <div>
                <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-1">{t('productModalExpiryDate')}</label>
                <input id="expiryDate" type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} className={`p-3 border rounded-lg w-full ${product ? 'bg-gray-200' : ''}`} disabled={!!product} />
            </div>
           </div>
          
           <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('productModalImage')}</label>
              <div className="mt-1 flex items-center gap-4">
                <img src={formData.imageUrl || `https://via.placeholder.com/200x200.png?text=${encodeURIComponent(t('productModalNoImage'))}`} alt="معاينة" className="w-24 h-24 object-cover rounded-lg border bg-gray-100" />
                <label htmlFor="imageUpload" className="cursor-pointer bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <span>{t('browseFiles')}</span>
                  <input id="imageUpload" name="imageUpload" type="file" className="sr-only" accept="image/*" onChange={handleImageUpload} />
                </label>
              </div>
            </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">{t('productModalDescription')}</label>
            <textarea id="description" name="description" value={formData.description} onChange={handleChange} placeholder={t('productModalDescriptionPlaceholder')} className="p-3 border rounded-lg w-full h-24"></textarea>
          </div>
          <div className="flex justify-end gap-4 mt-6 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">{t('cancel')}</button>
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t('save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}> = ({ isOpen, onClose, onConfirm, title, message }) => {
    const { t } = useTranslation();
    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4 text-gray-800">{title}</h2>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="flex justify-end gap-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
                        {t('cancel')}
                    </button>
                    <button type="button" onClick={handleConfirm} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                        {t('confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
};


const Inventory: React.FC<InventoryProps> = ({ products, categories, addProduct, updateProduct, deleteProduct }) => {
  const { t, language, currency } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);


  const filteredProducts = useMemo(() => {
    const getDescendantIds = (parentId: string): string[] => {
        const children = categories.filter(c => c.parentId === parentId);
        let ids = children.map(c => c.id);
        children.forEach(child => {
            ids = [...ids, ...getDescendantIds(child.id)];
        });
        return ids;
    };

    let filtered = products;

    if (searchTerm) {
        const lowercasedTerm = searchTerm.toLowerCase();
        filtered = filtered.filter(product =>
            product.name.toLowerCase().includes(lowercasedTerm) ||
            (product.sku && product.sku.toLowerCase().includes(lowercasedTerm))
        );
    }

    if (categoryFilter && categoryFilter !== 'all') {
        const categoryIdsToFilter = [categoryFilter, ...getDescendantIds(categoryFilter)];
        filtered = filtered.filter(product => categoryIdsToFilter.includes(product.categoryId));
    }

    switch (stockFilter) {
        case 'in_stock':
            filtered = filtered.filter(p => p.stock > 10);
            break;
        case 'low_stock':
            filtered = filtered.filter(p => p.stock > 0 && p.stock <= 10);
            break;
        case 'out_of_stock':
            filtered = filtered.filter(p => p.stock <= 0);
            break;
        default:
            break;
    }

    return filtered;
  }, [products, searchTerm, categoryFilter, stockFilter, categories]);

  const handleOpenModal = (product: Product | null = null) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const handleSaveProduct = (productData: (Product | Omit<Product, 'id' | 'batches'>) & { expiryDate?: string }) => {
    if ('id' in productData) {
      updateProduct(productData as Product);
    } else {
      addProduct(productData as Omit<Product, 'id' | 'batches'> & { expiryDate?: string });
    }
  };

  const handleDeleteRequest = (id: string) => {
    setProductToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (productToDelete) {
      deleteProduct(productToDelete);
      setProductToDelete(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: currency }).format(amount);
  };

  const getCategoryName = (categoryId: string) => {
      return categories.find(c => c.id === categoryId)?.name || 'Unknown';
  };
  
  const getLargestUnit = (product: Product) => {
      if (!product.units || product.units.length === 0) return null;
      return product.units.reduce((largest, unit) => unit.factor > largest.factor ? unit : largest, product.units[0]);
  }
  
  const getExpiryStatus = (product: Product): { text: string; color: string } | null => {
    const EXPIRY_THRESHOLD_DAYS = 30;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + EXPIRY_THRESHOLD_DAYS);
    const today = new Date();
    today.setHours(0,0,0,0);

    const expiringBatch = (product.batches || []).find(b => 
        b.expiryDate && new Date(b.expiryDate) <= thresholdDate && new Date(b.expiryDate) >= today
    );

    if (expiringBatch) {
        return { text: t('inventoryStatusExpiresSoon'), color: 'bg-red-100 text-red-800' };
    }
    return null;
  };

const handleExportExcel = () => {
    const data = filteredProducts.map(p => {
        const largestUnit = getLargestUnit(p);
        const stockInLargestUnit = largestUnit && largestUnit.factor > 0 ? (p.stock / largestUnit.factor) : p.stock;
        return {
            [t('inventoryTableProduct')]: p.name,
            [t('inventoryTableSku')]: p.sku,
            [t('inventoryTableCategory')]: getCategoryName(p.categoryId),
            [t('inventoryTablePrice')]: largestUnit ? largestUnit.price : 0,
            [t('inventoryTablePriceUnit')]: largestUnit ? largestUnit.name : '',
            [t('inventoryTableStock')]: stockInLargestUnit,
            [t('inventoryTableStockUnit')]: largestUnit ? largestUnit.name : '',
        };
    });
    exportToExcel(data, 'Inventory_Report');
};


  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold text-gray-800">{t('inventoryTitle')}</h1>
      </div>

       <div className="bg-white p-4 rounded-xl shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <input
                type="text"
                placeholder={t('inventorySearchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="p-3 border rounded-lg w-full lg:col-span-2"
            />
             <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="p-3 border rounded-lg w-full bg-white"
            >
                <option value="all">{t('inventoryFilterAllCategories')}</option>
                <CategoryOptions categories={categories} parentId={null} level={0} />
            </select>
             <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="p-3 border rounded-lg w-full bg-white"
            >
                <option value="all">{t('inventoryFilterAllStock')}</option>
                <option value="in_stock">{t('inventoryFilterInStock')}</option>
                <option value="low_stock">{t('inventoryFilterLowStock')}</option>
                <option value="out_of_stock">{t('inventoryFilterOutOfStock')}</option>
            </select>
            <div className="lg:col-span-1">
                <button onClick={handleExportExcel} className="w-full bg-green-700 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-800 transition-colors shadow-sm flex items-center justify-center gap-2">{t('exportToExcel')}</button>
            </div>
        </div>
        <div className="mt-4">
             <button onClick={() => handleOpenModal()} className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md">
                {t('inventoryAddNewProduct')}
            </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 text-sm font-semibold tracking-wide">{t('inventoryTableProduct')}</th>
                <th className="p-4 text-sm font-semibold tracking-wide">{t('inventoryTableSku')}</th>
                <th className="p-4 text-sm font-semibold tracking-wide">{t('inventoryTableCategory')}</th>
                <th className="p-4 text-sm font-semibold tracking-wide">{t('inventoryTablePrice')}</th>
                <th className="p-4 text-sm font-semibold tracking-wide">{t('inventoryTableStock')}</th>
                <th className="p-4 text-sm font-semibold tracking-wide">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.map(product => {
                const largestUnit = getLargestUnit(product);
                const stockInLargestUnit = largestUnit && largestUnit.factor > 0 
                    ? (product.stock / largestUnit.factor) 
                    : product.stock;
                const expiryStatus = getExpiryStatus(product);

                const formattedStock = Number.isInteger(stockInLargestUnit) 
                    ? stockInLargestUnit 
                    : stockInLargestUnit.toFixed(2);
                
                return (
                  <tr key={product.id}>
                    <td className="p-4 text-sm text-gray-700 flex items-center gap-3">
                      <img src={product.imageUrl} alt={product.name} className="w-10 h-10 object-cover rounded-md"/>
                      <span>{product.name}</span>
                      {expiryStatus && (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${expiryStatus.color}`}>
                              {expiryStatus.text}
                          </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-500">{product.sku}</td>
                    <td className="p-4 text-sm text-gray-700">{getCategoryName(product.categoryId)}</td>
                    <td className="p-4 text-sm text-gray-700 font-bold">{largestUnit ? formatCurrency(largestUnit.price) : '-'}</td>
                    <td className="p-4 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${product.stock > 10 ? 'bg-green-100 text-green-800' : (product.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800')}`}>
                              {formattedStock} {largestUnit?.name}
                          </span>
                          {product.stock <= 10 && product.stock > 0 && (
                              <div className="flex items-center gap-1 text-yellow-600 whitespace-nowrap" title={t('inventoryStatusLowStock')}>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  <span className="text-xs font-medium">{t('inventoryStatusLowStock')}</span>
                              </div>
                          )}
                           {product.stock <= 0 && (
                              <div className="flex items-center gap-1 text-red-600 whitespace-nowrap" title={t('inventoryStatusOutOfStock')}>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                  <span className="text-xs font-medium">{t('inventoryStatusOutOfStock')}</span>
                              </div>
                          )}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-700 space-x-2 whitespace-nowrap">
                      <button onClick={() => handleOpenModal(product)} className="text-blue-500 hover:underline">{t('edit')}</button>
                      <button onClick={() => handleDeleteRequest(product.id)} className="text-red-500 hover:underline">{t('delete')}</button>
                      <button onClick={() => setBarcodeProduct(product)} className="text-purple-500 hover:underline">{t('inventoryPrintBarcode')}</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <ProductModal isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSaveProduct} product={selectedProduct} categories={categories} />
      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('confirmDelete')}
        message={t('inventoryDeleteConfirmMessage')}
      />
       {barcodeProduct && (
        <BarcodeLabelModal product={barcodeProduct} onClose={() => setBarcodeProduct(null)} />
      )}
    </div>
  );
};

export default Inventory;