import React, { useState, useMemo, useEffect } from 'react';
import { Sale, CartItem, Product, Customer } from '../types';
import { exportToExcel } from '../constants';
import SaleEditModal from '../components/SaleEditModal';
import Receipt from '../components/Receipt';
import { Packer, Document, ImageRun, Table, TableCell, TableRow, WidthType, Paragraph, IImageOptions } from 'docx';
import saveAs from 'file-saver';
import { useTranslation, TranslationKey } from '../contexts/LanguageContext';

interface SalesProps {
  sales: Sale[];
  products: Product[];
  updateSale: (saleId: string, updatedItems: CartItem[]) => void;
  customers: Customer[];
  storeInfo: { name: string; address: string; phone: string; logoUrl: string };
  showTaxInReceipt: boolean;
}

const Sales: React.FC<SalesProps> = ({ sales, products, updateSale, customers, storeInfo, showTaxInReceipt }) => {
  const { t, language } = useTranslation();
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleToExport, setSaleToExport] = useState<Sale | null>(null);
  const [saleToPrint, setSaleToPrint] = useState<Sale | null>(null);
  const [selectedSaleIds, setSelectedSaleIds] = useState<string[]>([]);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [saleToRenderForWord, setSaleToRenderForWord] = useState<Sale | null>(null);

  const [filters, setFilters] = useState({
    id: '',
    customerName: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (saleToExport) {
        // A small delay to allow the off-screen component to render
        setTimeout(() => {
            const receiptElement = document.getElementById('receipt-content-export');
            if (receiptElement && (window as any).html2canvas) {
                (window as any).html2canvas(receiptElement, { scale: 2, useCORS: true })
                    .then((canvas: HTMLCanvasElement) => {
                        const link = document.createElement('a');
                        link.download = `فاتورة-${saleToExport.id}.png`;
                        link.href = canvas.toDataURL('image/png');
                        link.click();
                        setSaleToExport(null); // Clean up
                    })
                    .catch((err: any) => {
                        console.error("Error exporting receipt as image:", err);
                        alert("حدث خطأ أثناء تصدير الفاتورة.");
                        setSaleToExport(null);
                    });
            } else {
                alert("لم يتم العثور على مكون الفاتورة أو مكتبة التصدير.");
                setSaleToExport(null);
            }
        }, 100);
    }
  }, [saleToExport]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const saleDate = new Date(sale.date);
      const startDate = filters.startDate ? new Date(filters.startDate) : null;
      const endDate = filters.endDate ? new Date(filters.endDate) : null;
      if (startDate) startDate.setHours(0, 0, 0, 0);
      if (endDate) endDate.setHours(23, 59, 59, 999);

      const matchesId = sale.id.toLowerCase().includes(filters.id.toLowerCase());
      const matchesCustomer = sale.customerName.toLowerCase().includes(filters.customerName.toLowerCase());
      const matchesStartDate = startDate ? saleDate >= startDate : true;
      const matchesEndDate = endDate ? saleDate <= endDate : true;

      return matchesId && matchesCustomer && matchesStartDate && matchesEndDate;
    });
  }, [sales, filters]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP' }).format(amount);
  };
  
  const handleExportExcel = () => {
    const data = filteredSales.map(s => ({
        [t('invoiceNumber')]: s.id,
        [t('date')]: new Date(s.date).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US'),
        [t('customer')]: s.customerName,
        [t('itemCount')]: s.items.length,
        [t('paymentMethod')]: s.payments.map(p => `${t(`paymentMethod${p.method.charAt(0).toUpperCase() + p.method.slice(1)}` as TranslationKey)}: ${p.amount}`).join(' | '),
        [t('subtotal')]: s.subtotal,
        [t('discount')]: s.totalDiscount,
        [t('tax')]: s.tax,
        [t('total')]: s.total,
        [t('cost')]: s.totalCost,
        [t('profit')]: s.total - s.tax - s.totalCost,
    }));
    exportToExcel(data, 'Sales_Report');
  };

  const handleSelectSale = (saleId: string) => {
    setSelectedSaleIds(prev =>
      prev.includes(saleId) ? prev.filter(id => id !== saleId) : [...prev, saleId]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedSaleIds(filteredSales.map(s => s.id));
    } else {
      setSelectedSaleIds([]);
    }
  };

  const handleExportToWord = async () => {
    setIsExportingWord(true);
    setExportProgress(0);
    const imagesAsBuffers: ArrayBuffer[] = [];
    const salesToExport = sales.filter(s => selectedSaleIds.includes(s.id));

    for (let i = 0; i < salesToExport.length; i++) {
        const sale = salesToExport[i];
        setSaleToRenderForWord(sale);
        // Wait for react to render the component off-screen
        await new Promise(resolve => setTimeout(resolve, 50)); 
        
        const element = document.getElementById(`receipt-word-export-container`);
        if (element && (window as any).html2canvas) {
            const canvas = await (window as any).html2canvas(element, { scale: 2, useCORS: true });
            const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            if (blob) {
                const buffer = await blob.arrayBuffer();
                imagesAsBuffers.push(buffer);
            }
        }
        setExportProgress(i + 1);
    }
    setSaleToRenderForWord(null); // Clean up the rendered component

    if (imagesAsBuffers.length === 0) {
        alert('لم يتمكن من إنشاء صور الفواتير.');
        setIsExportingWord(false);
        return;
    }
    
    // FIX: The `docx` library requires an explicit `type` property when creating an ImageRun from a buffer
    // to resolve type ambiguities. Since the image is a PNG from a canvas, `type: "png"` is added.
    const imageRuns = imagesAsBuffers.map(buffer => new ImageRun({
        type: "png",
        data: buffer,
        transformation: { width: 280, height: 450 }
    }));

    const rows: TableRow[] = [];
    for (let i = 0; i < imageRuns.length; i += 2) {
        const cells = [
            new TableCell({ children: [new Paragraph({ children: [imageRuns[i]] })] }),
        ];
        if (imageRuns[i + 1]) {
            cells.push(new TableCell({ children: [new Paragraph({ children: [imageRuns[i+1]] })] }));
        } else {
            cells.push(new TableCell({ children: [] })); // Add empty cell to maintain structure
        }
        rows.push(new TableRow({ children: cells }));
    }

    const doc = new Document({
        sections: [{
            children: [
                new Table({
                    rows: rows,
                    width: { size: 100, type: WidthType.PERCENTAGE },
                }),
            ],
        }],
    });

    Packer.toBlob(doc).then(blob => {
        saveAs(blob, "Fawater.docx");
        setIsExportingWord(false);
        setSelectedSaleIds([]);
    });
  };


 const customerForExport = saleToExport ? (customers.find(c => c.id === saleToExport.customerId) || customers.find(c => c.id === 'c1')) : null;
 const customerForWordExport = saleToRenderForWord ? (customers.find(c => c.id === saleToRenderForWord.customerId) || customers.find(c => c.id === 'c1')) : null;
 const customerForPrint = saleToPrint ? (customers.find(c => c.id === saleToPrint.customerId) || customers.find(c => c.id === 'c1')) : null;


  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-4xl font-bold text-gray-800">{t('salesLogTitle')}</h1>
      </div>
      
      <div className="bg-white p-4 rounded-xl shadow-md mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input type="text" name="id" value={filters.id} onChange={handleFilterChange} placeholder={t('searchByInvoiceNumber')} className="p-2 border rounded-lg" />
          <input type="text" name="customerName" value={filters.customerName} onChange={handleFilterChange} placeholder={t('searchByCustomerName')} className="p-2 border rounded-lg" />
          <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="p-2 border rounded-lg" />
          <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="p-2 border rounded-lg" />
        </div>
        <div className={`flex gap-2 justify-start border-t pt-4 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
            <button 
              onClick={handleExportToWord} 
              disabled={selectedSaleIds.length === 0 || isExportingWord}
              className="bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors shadow-sm flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isExportingWord ? `${t('exporting')} (${exportProgress}/${selectedSaleIds.length})` : t('exportSelectedToWord')}
            </button>
            <button onClick={handleExportExcel} className="bg-green-700 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-800 transition-colors shadow-sm flex items-center gap-2">{t('exportToExcel')}</button>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-md">
        <div className="overflow-x-auto">
          <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'}`}>
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={filteredSales.length > 0 && selectedSaleIds.length === filteredSales.length}
                    aria-label={t('selectAll')}
                  />
                </th>
                <th className="p-4 text-sm font-semibold tracking-wide">{t('invoiceNumber')}</th>
                <th className="p-4 text-sm font-semibold tracking-wide">{t('date')}</th>
                <th className="p-4 text-sm font-semibold tracking-wide">{t('customer')}</th>
                <th className="p-4 text-sm font-semibold tracking-wide">{t('paymentMethod')}</th>
                <th className="p-4 text-sm font-semibold tracking-wide">{t('total')}</th>
                <th className="p-4 text-sm font-semibold tracking-wide">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSales.map(sale => {
                const paymentMethodKey = sale.payments.length > 1 ? 'paymentMethodMultiple' : sale.payments[0] ? `paymentMethod${sale.payments[0].method.charAt(0).toUpperCase() + sale.payments[0].method.slice(1)}` : 'paymentMethodUnspecified';
                const paymentMethod = t(paymentMethodKey as any);
                const paymentColor =
                    sale.payments.length > 1 ? 'bg-purple-200 text-purple-800' :
                    sale.payments[0]?.method === 'cash' ? 'bg-green-200 text-green-800' :
                    sale.payments[0]?.method === 'card' ? 'bg-blue-200 text-blue-800' :
                    sale.payments[0]?.method === 'deferred' ? 'bg-orange-200 text-orange-800' :
                    'bg-gray-200 text-gray-800';

                return (
                  <tr key={sale.id}>
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedSaleIds.includes(sale.id)}
                        onChange={() => handleSelectSale(sale.id)}
                        aria-label={t('selectInvoice', sale.id)}
                      />
                    </td>
                    <td className="p-4 text-sm text-gray-700">{sale.id}</td>
                    <td className="p-4 text-sm text-gray-700">{new Date(sale.date).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</td>
                    <td className="p-4 text-sm text-gray-700">{sale.customerName}</td>
                    <td className="p-4 text-sm">
                      <span className={`p-1.5 text-xs font-medium uppercase tracking-wider rounded-lg ${paymentColor}`}>
                        {paymentMethod}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-700 font-bold">{formatCurrency(sale.total)}</td>
                    <td className="p-4 text-sm whitespace-nowrap">
                      <button onClick={() => setSelectedSale(sale)} className="text-blue-500 hover:underline">
                        {t('returnEdit')}
                      </button>
                       <button onClick={() => setSaleToExport(sale)} className={`text-green-600 hover:underline ${language === 'ar' ? 'mr-4' : 'ml-4'}`}>
                        {t('exportAsImage')}
                      </button>
                      <button onClick={() => setSaleToPrint(sale)} className={`text-purple-600 hover:underline ${language === 'ar' ? 'mr-4' : 'ml-4'}`}>
                        {t('print')}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      {selectedSale && <SaleEditModal sale={selectedSale} onClose={() => setSelectedSale(null)} onSave={updateSale} products={products} />}
       {saleToExport && customerForExport && (
            <div style={{ position: 'absolute', left: '-9999px', top: 0, zIndex: -1 }}>
                <Receipt
                    sale={saleToExport}
                    customer={customerForExport}
                    onClose={() => {}}
                    showTax={showTaxInReceipt}
                    storeInfo={storeInfo}
                    isExporting={true}
                />
            </div>
      )}
       {saleToRenderForWord && customerForWordExport && (
          <div style={{ position: 'absolute', left: '-9999px', top: 0, zIndex: -1 }}>
            <div id="receipt-word-export-container">
               <Receipt
                  sale={saleToRenderForWord}
                  customer={customerForWordExport}
                  onClose={() => {}}
                  showTax={showTaxInReceipt}
                  storeInfo={storeInfo}
                  isExporting={true}
                />
            </div>
          </div>
       )}
       {saleToPrint && customerForPrint && (
        <Receipt
            sale={saleToPrint}
            customer={customerForPrint}
            onClose={() => setSaleToPrint(null)}
            showTax={showTaxInReceipt}
            storeInfo={storeInfo}
        />
       )}
    </div>
  );
};

export default Sales;