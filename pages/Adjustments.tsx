import React, { useState, useMemo } from 'react';
import { Product, Unit, Adjustment, AdjustmentItem, AdjustmentReason } from '../types';
import usePosState from '../hooks/usePosState';
import { useTranslation } from '../contexts/LanguageContext';

interface AdjustmentsProps {
    adjustments: Adjustment[];
    products: Product[];
    addAdjustment: (adjustment: Omit<Adjustment, 'id' | 'date'>) => void;
}

interface AdjustmentFormItem {
    productId: string;
    productName: string;
    productUnits: Unit[];
    selectedUnitId: string;
    quantityChange: string;
}

const AdjustmentModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (adjustment: Omit<Adjustment, 'id' | 'date'>) => void;
    products: Product[];
}> = ({ isOpen, onClose, onSave, products }) => {
    const { t } = useTranslation();
    const [items, setItems] = useState<AdjustmentFormItem[]>([]);
    const [reason, setReason] = useState<AdjustmentReason>('damaged');
    const [notes, setNotes] = useState('');
    const [productSearchTerm, setProductSearchTerm] = useState('');
    
    const resetForm = () => {
        setItems([]);
        setReason('damaged');
        setNotes('');
        setProductSearchTerm('');
    };

    const handleAddProduct = (product: Product) => {
        if (!items.some(item => item.productId === product.id)) {
            setItems(prev => [...prev, {
                productId: product.id,
                productName: product.name,
                productUnits: product.units,
                selectedUnitId: product.units[0].id,
                quantityChange: '0',
            }]);
        }
        setProductSearchTerm('');
    };

    const handleItemChange = (productId: string, field: keyof AdjustmentFormItem, value: string) => {
        setItems(prev => prev.map(item => item.productId === productId ? { ...item, [field]: value } : item));
    };

    const handleRemoveItem = (productId: string) => {
        setItems(prev => prev.filter(item => item.productId !== productId));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalItems: AdjustmentItem[] = items.map(item => {
            const selectedUnit = item.productUnits.find(u => u.id === item.selectedUnitId)!;
            return {
                productId: item.productId,
                productName: item.productName,
                quantityChange: parseFloat(item.quantityChange) || 0,
                unitName: selectedUnit.name,
                unitFactor: selectedUnit.factor,
            };
        }).filter(item => item.quantityChange !== 0);

        if (finalItems.length === 0) {
            alert(t('adjustmentsModalQuantityError'));
            return;
        }
        
        onSave({ items: finalItems, reason, notes });
        resetForm();
        onClose();
    };

    const filteredProducts = useMemo(() => {
        if (!productSearchTerm) return [];
        return products.filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) && !items.some(i => i.productId === p.id));
    }, [productSearchTerm, products, items]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-6">{t('adjustmentsModalTitle')}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder={t('adjustmentsModalSearchPlaceholder')}
                            value={productSearchTerm} 
                            onChange={e => setProductSearchTerm(e.target.value)} 
                            className="p-3 border rounded-lg w-full"
                        />
                        {filteredProducts.length > 0 && (
                            <ul className="absolute z-10 w-full bg-white border rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg">
                                {filteredProducts.map(p => (
                                    <li key={p.id} onClick={() => handleAddProduct(p)} className="p-3 hover:bg-gray-100 cursor-pointer">{p.name}</li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto border p-2 rounded-lg">
                        {items.map(item => (
                            <div key={item.productId} className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 rounded">
                                <span className="col-span-4 font-semibold">{item.productName}</span>
                                <input 
                                    type="number" 
                                    value={item.quantityChange}
                                    onChange={e => handleItemChange(item.productId, 'quantityChange', e.target.value)}
                                    className="col-span-4 p-2 border rounded text-center"
                                    placeholder={t('quantity')}
                                />
                                <select 
                                    value={item.selectedUnitId} 
                                    onChange={e => handleItemChange(item.productId, 'selectedUnitId', e.target.value)} 
                                    className="col-span-3 p-2 border rounded bg-white"
                                >
                                    {item.productUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                                <button type="button" onClick={() => handleRemoveItem(item.productId)} className="col-span-1 text-red-500 hover:text-red-700 font-bold">X</button>
                            </div>
                        ))}
                         {items.length === 0 && <p className="text-center text-gray-500 py-4">{t('adjustmentsModalNoProducts')}</p>}
                    </div>
                     <p className="text-sm text-gray-500">{t('adjustmentsModalHelpText')}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select value={reason} onChange={e => setReason(e.target.value as any)} className="p-3 border rounded-lg bg-white">
                            <option value="damaged">{t('adjustmentReasonDamaged')}</option>
                            <option value="waste">{t('adjustmentReasonWaste')}</option>
                            <option value="inventory_correction">{t('adjustmentReasonCorrection')}</option>
                        </select>
                        <input 
                            type="text" 
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder={t('notesOptional')}
                            className="p-3 border rounded-lg"
                        />
                    </div>
                    <div className="flex justify-end gap-4 pt-4 border-t">
                        <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">{t('cancel')}</button>
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t('save')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Adjustments: React.FC<AdjustmentsProps> = ({ adjustments, products, addAdjustment }) => {
    const { t } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-4xl font-bold text-gray-800">{t('adjustmentsTitle')}</h1>
                <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700">
                    {t('adjustmentsAddButton')}
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4 text-sm font-semibold">{t('date')}</th>
                                <th className="p-4 text-sm font-semibold">{t('adjustmentsTableReason')}</th>
                                <th className="p-4 text-sm font-semibold">{t('adjustmentsTableDetails')}</th>
                                <th className="p-4 text-sm font-semibold">{t('notes')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {adjustments.map(adj => (
                                <tr key={adj.id}>
                                    <td className="p-4 text-sm text-gray-700">{new Date(adj.date).toLocaleString('ar-EG')}</td>
                                    <td className="p-4 text-sm">
                                        <span className="p-1.5 text-xs font-medium rounded-lg bg-yellow-200 text-yellow-800">{t(`adjustmentReason${adj.reason.charAt(0).toUpperCase() + adj.reason.slice(1)}` as any)}</span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-700">
                                        <ul className="list-disc pr-4">
                                            {adj.items.map(item => (
                                                <li key={item.productId}>
                                                    {item.productName}: <span className={`font-bold ${item.quantityChange > 0 ? 'text-green-600' : 'text-red-600'}`}>{item.quantityChange} {item.unitName}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </td>
                                    <td className="p-4 text-sm text-gray-500">{adj.notes}</td>
                                </tr>
                            ))}
                             {adjustments.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center p-8 text-gray-500">{t('adjustmentsTableNoData')}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AdjustmentModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={addAdjustment}
                products={products}
            />
        </div>
    );
};

export default Adjustments;