// FIX: This file was created to resolve the "is not a module" error.
import React, { useState, useMemo, useEffect } from 'react';
import { Supplier, SupplierPayment } from '../types';
import usePosState from '../hooks/usePosState';
import { exportToExcel } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';

type SupplierProps = ReturnType<typeof usePosState> & {
    onViewProfile: (id: string) => void;
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-4 text-gray-800">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-4">
          <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">{t('cancel')}</button>
          <button type="button" onClick={() => { onConfirm(); onClose(); }} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">{t('confirm')}</button>
        </div>
      </div>
    </div>
  );
};

const SupplierModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (supplier: Supplier | Omit<Supplier, 'id' | 'balance'>) => void;
  supplier: Supplier | null;
}> = ({ isOpen, onClose, onSave, supplier }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', company: '' });

  useEffect(() => {
    if (supplier) {
      setFormData({ name: supplier.name, phone: supplier.phone, email: supplier.email, company: supplier.company });
    } else {
      setFormData({ name: '', phone: '', email: '', company: '' });
    }
  }, [supplier, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (supplier) {
      onSave({ ...supplier, ...formData });
    } else {
      onSave(formData);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-6">{supplier ? t('supplierModalEditTitle') : t('supplierModalAddTitle')}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="name" value={formData.name} onChange={handleChange} placeholder={t('supplierModalContactPerson')} className="p-3 border rounded-lg w-full" required />
          <input name="company" value={formData.company} onChange={handleChange} placeholder={t('supplierModalCompanyName')} className="p-3 border rounded-lg w-full" required />
          <input name="phone" value={formData.phone} onChange={handleChange} placeholder={t('customerModalPhone')} className="p-3 border rounded-lg w-full" />
          <input name="email" value={formData.email} onChange={handleChange} type="email" placeholder={t('customerModalEmail')} className="p-3 border rounded-lg w-full" />
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">{t('cancel')}</button>
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t('save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const PaymentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (payment: Omit<SupplierPayment, 'id' | 'date'>) => void;
  supplier: Supplier;
}> = ({ isOpen, onClose, onSave, supplier }) => {
    const { t } = useTranslation();
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const paymentAmount = parseFloat(amount);
        if (!isNaN(paymentAmount) && paymentAmount > 0) {
            onSave({
                supplierId: supplier.id,
                supplierName: supplier.name,
                amount: paymentAmount,
                notes,
            });
            setAmount('');
            setNotes('');
            onClose();
        } else {
            alert(t('customerPaymentModalInvalidAmount'));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-2">{t('supplierPaymentModalTitle')}</h2>
                <p className="text-lg text-gray-700 mb-6">{supplier.name}</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t('customerPaymentModalAmount')} className="p-3 border rounded-lg w-full" required min="0.01" step="0.01" />
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('customerPaymentModalNotes')} className="p-3 border rounded-lg w-full h-24" />
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">{t('cancel')}</button>
                        <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">{t('customerPaymentModalSave')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const Suppliers: React.FC<SupplierProps> = ({ suppliers, addSupplier, updateSupplier, deleteSupplier, addSupplierPayment, onViewProfile }) => {
    const { t, language, currency } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const formatCurrency = (amount: number) => new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: currency }).format(amount);

    const handleSaveSupplier = (supplierData: Supplier | Omit<Supplier, 'id' | 'balance'>) => {
        if ('id' in supplierData) {
            updateSupplier(supplierData);
        } else {
            addSupplier(supplierData);
        }
    };

    const filteredSuppliers = useMemo(() => {
        return suppliers.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.phone.includes(searchTerm)
        );
    }, [suppliers, searchTerm]);
    
    const handleExportExcel = () => {
        const data = filteredSuppliers.map(s => ({
            [t('suppliersTableCompany')]: s.company,
            [t('suppliersTableContact')]: s.name,
            [t('customersTablePhone')]: s.phone,
            [t('customersTableBalance')]: s.balance,
        }));
        exportToExcel(data, 'Suppliers_Report');
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-4xl font-bold text-gray-800">{t('suppliersTitle')}</h1>
                <div className="w-full md:w-auto flex flex-col md:flex-row gap-4">
                    <input type="text" placeholder={t('suppliersSearchPlaceholder')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="p-3 border rounded-lg w-full md:w-64" />
                    <div className="flex gap-2">
                        <button onClick={handleExportExcel} className="bg-green-700 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-800">{t('exportToExcel')}</button>
                    </div>
                    <button onClick={() => { setSelectedSupplier(null); setIsModalOpen(true); }} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700">{t('suppliersAddButton')}</button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4 text-sm font-semibold">{t('suppliersTableCompany')}</th>
                                <th className="p-4 text-sm font-semibold">{t('suppliersTableContact')}</th>
                                <th className="p-4 text-sm font-semibold">{t('customersTablePhone')}</th>
                                <th className="p-4 text-sm font-semibold">{t('customersTableBalance')}</th>
                                <th className="p-4 text-sm font-semibold">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredSuppliers.map(supplier => (
                                <tr key={supplier.id}>
                                    <td className="p-4 text-gray-700 font-bold">
                                         <button onClick={() => onViewProfile(supplier.id)} className="font-semibold text-blue-600 hover:underline text-right">
                                            {supplier.company}
                                        </button>
                                    </td>
                                    <td className="p-4 text-gray-700">{supplier.name}</td>
                                    <td className="p-4 text-gray-500">{supplier.phone}</td>
                                    <td className={`p-4 font-bold ${supplier.balance > 0 ? 'text-red-600' : 'text-gray-700'}`}>{formatCurrency(supplier.balance)}</td>
                                    <td className="p-4 space-x-2 whitespace-nowrap">
                                        <button onClick={() => { setSelectedSupplier(supplier); setIsPaymentModalOpen(true); }} className="text-green-600 hover:underline">{t('suppliersRegisterPayment')}</button>
                                        <button onClick={() => { setSelectedSupplier(supplier); setIsModalOpen(true); }} className="text-blue-600 hover:underline">{t('edit')}</button>
                                        <button onClick={() => setSupplierToDelete(supplier.id)} className="text-red-600 hover:underline">{t('delete')}</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <SupplierModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveSupplier} supplier={selectedSupplier} />
            {selectedSupplier && <PaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} onSave={addSupplierPayment} supplier={selectedSupplier} />}
            <ConfirmationModal isOpen={!!supplierToDelete} onClose={() => setSupplierToDelete(null)} onConfirm={() => supplierToDelete && deleteSupplier(supplierToDelete)} title={t('confirmDelete')} message={t('suppliersDeleteConfirm')} />
        </div>
    );
};

export default Suppliers;
