import React, { useState, useEffect, useRef } from 'react';
import { User, AutoBackup } from '../types';
import { db } from '../db';
import { useTranslation } from '../contexts/LanguageContext';
import { exportDB } from 'dexie-export-import';
import saveAs from 'file-saver';


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

const UserModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: User | Omit<User, 'id'>) => void;
  userToEdit: User | null;
}> = ({ isOpen, onClose, onSave, userToEdit }) => {
    const { t } = useTranslation();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'admin' | 'cashier'>('cashier');

    useEffect(() => {
        if (userToEdit) {
            setUsername(userToEdit.username);
            setPassword('');
            setRole(userToEdit.role);
        } else {
            setUsername('');
            setPassword('');
            setRole('cashier');
        }
    }, [userToEdit, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) {
            alert(t('usernameRequired'));
            return;
        }
        if (!userToEdit && !password.trim()) {
            alert(t('passwordRequired'));
            return;
        }
        
        const saveData = {
            username,
            password,
            role,
        };

        if (userToEdit) {
            onSave({ ...userToEdit, ...saveData });
        } else {
            onSave(saveData);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-6">{userToEdit ? t('editUser') : t('addNewUser')}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('username')}</label>
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="p-3 border rounded-lg w-full bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none" required disabled={!!userToEdit} />
                        {!!userToEdit && <p className="text-xs text-gray-500 mt-1">{t('usernameCannotBeChanged')}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('password')}</label>
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={userToEdit ? t('leaveBlankToKeep') : ''} className="p-3 border rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:outline-none" required={!userToEdit} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('role')}</label>
                        <select value={role} onChange={e => setRole(e.target.value as 'admin' | 'cashier')} className="p-3 border rounded-lg w-full bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none">
                            <option value="cashier">{t('roleCashier')}</option>
                            <option value="admin">{t('roleAdmin')}</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-4 pt-4 border-t mt-6">
                        <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300">{t('cancel')}</button>
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">{t('save')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


interface SettingsProps {
    taxRate: number;
    updateTaxRate: (newRate: number) => void;
    showTaxInReceipt: boolean;
    updateShowTaxInReceipt: (show: boolean) => void;
    storeInfo: { name: string; address: string; phone: string; logoUrl: string };
    updateStoreInfo: (info: Partial<{ name: string; address: string; phone: string; logoUrl: string }>) => void;
    users: User[];
    currentUser: User | null;
    addUser: (user: Omit<User, 'id'>) => void;
    updateUser: (user: User) => void;
    deleteUser: (userId: string) => void;
    syncServerUrl: string;
    syncStatus: 'disconnected' | 'connecting' | 'connected';
    updateSyncServerUrl: (url: string) => void;
    autoBackups: AutoBackup[];
    importData: (blob: Blob) => Promise<void>;
    deleteAutoBackup: (id: string) => Promise<void>;
    restoreAutoBackup: (id: string) => Promise<void>;
    autoBackupTime: string;
    updateAutoBackupTime: (time: string) => void;
    backupDirectoryHandle: FileSystemDirectoryHandle | null;
    setBackupDirectory: () => void;
    clearBackupDirectory: () => void;
}

const Settings: React.FC<SettingsProps> = (props) => {
    const { 
        taxRate, updateTaxRate, showTaxInReceipt, updateShowTaxInReceipt, 
        storeInfo, updateStoreInfo, 
        users, currentUser, addUser, updateUser, deleteUser,
        syncServerUrl, syncStatus, updateSyncServerUrl,
        autoBackups, importData, deleteAutoBackup, restoreAutoBackup,
        autoBackupTime, updateAutoBackupTime,
        backupDirectoryHandle, setBackupDirectory, clearBackupDirectory
    } = props;
    
    const { t, language, setLanguage, currency, setCurrency } = useTranslation();
    const [currentTaxRate, setCurrentTaxRate] = useState(taxRate);
    const [currentStoreInfo, setCurrentStoreInfo] = useState(storeInfo);
    const [isSaved, setIsSaved] = useState(false);
    const [isStoreInfoSaved, setIsStoreInfoSaved] = useState(false);
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [currentCurrency, setCurrentCurrency] = useState(currency);
    const [isCurrencySaved, setIsCurrencySaved] = useState(false);
    const [currentSyncUrl, setCurrentSyncUrl] = useState(syncServerUrl);
    const [confirmAction, setConfirmAction] = useState<{ type: 'import' | 'restore'; data: any; message: string; } | null>(null);
    const importFileRef = useRef<HTMLInputElement>(null);
    const [currentBackupTime, setCurrentBackupTime] = useState(autoBackupTime);
    const [isBackupTimeSaved, setIsBackupTimeSaved] = useState(false);
    const [fileApiSupport, setFileApiSupport] = useState<{ supported: boolean; reason: 'secure_context' | 'browser_support' | null }>({ supported: true, reason: null });


    useEffect(() => {
        setCurrentTaxRate(taxRate);
    }, [taxRate]);

    useEffect(() => {
        setCurrentStoreInfo(storeInfo);
    }, [storeInfo]);

    useEffect(() => {
        setCurrentCurrency(currency);
    }, [currency]);

    useEffect(() => {
        setCurrentSyncUrl(syncServerUrl);
    }, [syncServerUrl]);

    useEffect(() => {
        setCurrentBackupTime(autoBackupTime);
    }, [autoBackupTime]);

    useEffect(() => {
        if (!('showDirectoryPicker' in window)) {
            setFileApiSupport({ supported: false, reason: 'browser_support' });
        } else if (!window.isSecureContext) {
            setFileApiSupport({ supported: false, reason: 'secure_context' });
        } else {
            setFileApiSupport({ supported: true, reason: null });
        }
    }, []);

    const handleTaxSave = () => {
        updateTaxRate(currentTaxRate);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000); // Hide message after 2 seconds
    };
    
    const handleCurrencySave = () => {
        setCurrency(currentCurrency);
        setIsCurrencySaved(true);
        setTimeout(() => setIsCurrencySaved(false), 2000);
    };

    const handleBackupTimeSave = () => {
        updateAutoBackupTime(currentBackupTime);
        setIsBackupTimeSaved(true);
        setTimeout(() => setIsBackupTimeSaved(false), 2000);
    };

    const handleStoreInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCurrentStoreInfo(prev => ({...prev, [name]: value}));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setCurrentStoreInfo(prev => ({ ...prev, logoUrl: reader.result as string }));
          };
          reader.readAsDataURL(file);
        }
    };

    const handleStoreInfoSave = () => {
        updateStoreInfo(currentStoreInfo);
        setIsStoreInfoSaved(true);
        setTimeout(() => setIsStoreInfoSaved(false), 2000);
    };

    const handleSyncUrlSave = () => {
        updateSyncServerUrl(currentSyncUrl);
    };

    const isStoreInfoChanged = JSON.stringify(storeInfo) !== JSON.stringify(currentStoreInfo);

    const handleOpenUserModal = (user: User | null = null) => {
        setUserToEdit(user);
        setIsUserModalOpen(true);
    };

    const handleSaveUser = (userData: User | Omit<User, 'id'>) => {
        if ('id' in userData) {
            const finalUserData = { ...userData };
            if (!finalUserData.password) {
                const existingUser = users.find(u => u.id === finalUserData.id);
                if (existingUser) {
                    finalUserData.password = existingUser.password;
                }
            }
            updateUser(finalUserData);
        } else {
            addUser(userData as Omit<User, 'id'>);
        }
    };
    
    const handleConfirmDeleteUser = () => {
        if (userToDelete) {
            deleteUser(userToDelete.id);
        }
    };

    const handleExport = async () => {
        try {
            const blob = await exportDB(db);
            saveAs(blob, `pos-backup-${new Date().toISOString().split('T')[0]}.json`);
        } catch (error) {
            console.error('Export failed:', error);
            alert(t('exportFailed', (error as Error).message));
        }
    };
    
    const handleImportClick = () => {
        importFileRef.current?.click();
    };
    
    const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setConfirmAction({
                type: 'import',
                data: file,
                message: t('importConfirmMessage'),
            });
        }
        if(e.target) e.target.value = '';
    };

    const handleRestoreClick = (backupId: string) => {
        setConfirmAction({
            type: 'restore',
            data: backupId,
            message: t('restoreConfirmMessage', backupId),
        });
    };
    
    const handleConfirmAction = () => {
        if (!confirmAction) return;
        const { type, data } = confirmAction;
        if (type === 'import') {
            importData(data as Blob);
        } else if (type === 'restore') {
            restoreAutoBackup(data as string);
        }
        setConfirmAction(null);
    };

    const handleDownloadBackup = (backup: AutoBackup) => {
        saveAs(backup.blob, `pos-autobackup-${backup.id}.json`);
    };
    
    const statusInfo = {
        connected: { text: t('statusConnected'), color: 'bg-green-100 text-green-800' },
        connecting: { text: t('statusConnecting'), color: 'bg-yellow-100 text-yellow-800' },
        disconnected: { text: t('statusDisconnected'), color: 'bg-red-100 text-red-800' },
    };

    return (
        <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-6">{t('settingsTitle')}</h1>
            
            <div className="bg-white p-6 rounded-xl shadow-md max-w-2xl mt-8">
                <h2 className="text-2xl font-bold text-gray-700 mb-4 border-b pb-3">{t('languageSettings')}</h2>
                 <div className="flex items-center gap-4 mb-4">
                    <label htmlFor="language-select" className="text-lg font-medium text-gray-600">
                        {t('appLanguage')}
                    </label>
                    <select
                        id="language-select"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as 'ar' | 'en')}
                        className="p-3 border rounded-lg bg-white w-48"
                    >
                        <option value="ar">{t('languageArabic')}</option>
                        <option value="en">{t('languageEnglish')}</option>
                    </select>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md max-w-2xl mt-8">
                <h2 className="text-2xl font-bold text-gray-700 mb-4 border-b pb-3">{t('currencySettings')}</h2>
                <div className="flex items-center gap-4 mb-4">
                    <label htmlFor="currency-select" className="text-lg font-medium text-gray-600">
                        {t('appCurrency')}
                    </label>
                    <select
                        id="currency-select"
                        value={currentCurrency}
                        onChange={(e) => setCurrentCurrency(e.target.value)}
                        className="p-3 border rounded-lg bg-white w-48"
                    >
                        <option value="EGP">{t('currencyEGP')}</option>
                        <option value="USD">{t('currencyUSD')}</option>
                        <option value="EUR">{t('currencyEUR')}</option>
                        <option value="SAR">{t('currencySAR')}</option>
                    </select>
                </div>
                <div className="mt-6 flex items-center gap-4 border-t pt-4">
                    <button
                        onClick={handleCurrencySave}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md disabled:bg-gray-400"
                        disabled={currentCurrency === currency}
                    >
                        {t('saveCurrency')}
                    </button>
                    {isCurrencySaved && <span className="text-green-600 font-semibold" role="status">{t('savedSuccessfully')}</span>}
                </div>
            </div>

             <div className="bg-white p-6 rounded-xl shadow-md max-w-2xl mt-8">
                <h2 className="text-2xl font-bold text-gray-700 mb-4 border-b pb-3">{t('networkSyncSettings')}</h2>
                <p className="text-sm text-gray-600 mb-4">{t('networkSyncDescription')}</p>
                <div>
                    <label htmlFor="syncServerUrl" className="text-lg font-medium text-gray-600">{t('serverUrlLabel')}</label>
                    <input id="syncServerUrl" name="syncServerUrl" value={currentSyncUrl} onChange={(e) => setCurrentSyncUrl(e.target.value)} className="mt-1 p-3 border rounded-lg w-full" placeholder={t('serverUrlPlaceholder')} />
                </div>
                <div className="mt-4 flex items-center gap-2">
                    <label className="text-lg font-medium text-gray-600">{t('connectionStatusLabel')}:</label>
                    <span className={`px-3 py-1 rounded-full font-semibold text-sm ${statusInfo[syncStatus].color}`}>
                        {statusInfo[syncStatus].text}
                    </span>
                </div>
                 <div className="mt-6 flex items-center gap-4 border-t pt-4">
                    <button
                        onClick={handleSyncUrlSave}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md disabled:bg-gray-400"
                        disabled={currentSyncUrl === syncServerUrl}
                    >
                        {t('saveServerUrlButton')}
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md max-w-2xl mt-8">
                <h2 className="text-2xl font-bold text-gray-700 mb-4 border-b pb-3">{t('generalSettings')}</h2>
                <div className="flex items-center gap-4 mb-4">
                    <label htmlFor="tax-rate" className="text-lg font-medium text-gray-600">
                        {t('taxRate')} (%)
                    </label>
                    <input
                        id="tax-rate"
                        type="number"
                        value={currentTaxRate}
                        onChange={(e) => setCurrentTaxRate(parseFloat(e.target.value) || 0)}
                        className="p-3 border rounded-lg w-32 text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        min="0"
                        step="0.1"
                        aria-label="معدل الضريبة بالنسبة المئوية"
                    />
                </div>
                 <div className="flex items-center justify-between pt-4 border-t">
                    <label htmlFor="show-tax" className="text-lg font-medium text-gray-600 cursor-pointer">
                        {t('showTaxInReceipt')}
                    </label>
                    <input
                        id="show-tax"
                        type="checkbox"
                        checked={showTaxInReceipt}
                        onChange={(e) => updateShowTaxInReceipt(e.target.checked)}
                        className="h-6 w-6 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                    />
                </div>

                <div className="mt-6 flex items-center gap-4 border-t pt-4">
                    <button
                        onClick={handleTaxSave}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md disabled:bg-gray-400"
                        disabled={currentTaxRate === taxRate}
                    >
                        {t('saveTaxRate')}
                    </button>
                    {isSaved && <span className="text-green-600 font-semibold" role="status">{t('savedSuccessfully')}</span>}
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md max-w-2xl mt-8">
                <h2 className="text-2xl font-bold text-gray-700 mb-4 border-b pb-3">{t('storeInfo')}</h2>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="storeName" className="text-lg font-medium text-gray-600">{t('storeName')}</label>
                        <input id="storeName" name="name" value={currentStoreInfo.name} onChange={handleStoreInfoChange} className="mt-1 p-3 border rounded-lg w-full" />
                    </div>
                    <div>
                        <label htmlFor="storeAddress" className="text-lg font-medium text-gray-600">{t('storeAddress')}</label>
                        <input id="storeAddress" name="address" value={currentStoreInfo.address} onChange={handleStoreInfoChange} className="mt-1 p-3 border rounded-lg w-full" />
                    </div>
                    <div>
                        <label htmlFor="storePhone" className="text-lg font-medium text-gray-600">{t('storePhone')}</label>
                        <input id="storePhone" name="phone" value={currentStoreInfo.phone} onChange={handleStoreInfoChange} className="mt-1 p-3 border rounded-lg w-full" />
                    </div>
                     <div>
                        <label className="text-lg font-medium text-gray-600">{t('storeLogo')}</label>
                        <div className="mt-1 flex items-center gap-4">
                            {currentStoreInfo.logoUrl && (
                                <img src={currentStoreInfo.logoUrl} alt={t('storeLogo')} className="w-20 h-20 object-contain rounded-md border bg-gray-100" />
                            )}
                            <label htmlFor="logoUpload" className="cursor-pointer bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                <span>{t('browseFiles')}</span>
                                <input id="logoUpload" name="logoUpload" type="file" className="sr-only" accept="image/*" onChange={handleLogoUpload} />
                            </label>
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex items-center gap-4 border-t pt-4">
                    <button
                        onClick={handleStoreInfoSave}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md disabled:bg-gray-400"
                        disabled={!isStoreInfoChanged}
                    >
                        {t('saveStoreInfo')}
                    </button>
                    {isStoreInfoSaved && <span className="text-green-600 font-semibold" role="status">{t('savedSuccessfully')}</span>}
                </div>
            </div>

            {currentUser?.role === 'admin' && (
                <div className="bg-white p-6 rounded-xl shadow-md max-w-2xl mt-8">
                    <div className="flex justify-between items-center mb-4 border-b pb-3">
                        <h2 className="text-2xl font-bold text-gray-700">{t('userManagement')}</h2>
                        <button onClick={() => handleOpenUserModal()} className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-sm">
                            {t('addUser')}
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-right">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-4 text-sm font-semibold tracking-wide">{t('username')}</th>
                                    <th className="p-4 text-sm font-semibold tracking-wide">{t('role')}</th>
                                    <th className="p-4 text-sm font-semibold tracking-wide">{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td className="p-4 text-sm text-gray-700 font-medium">{user.username}</td>
                                        <td className="p-4 text-sm">
                                            <span className={`p-1.5 text-xs font-medium uppercase tracking-wider rounded-lg ${user.role === 'admin' ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-800'}`}>
                                                {user.role === 'admin' ? t('roleAdmin') : t('roleCashier')}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm space-x-4 whitespace-nowrap">
                                            <button onClick={() => handleOpenUserModal(user)} className="text-blue-600 hover:underline">{t('edit')}</button>
                                            <button 
                                                onClick={() => setUserToDelete(user)} 
                                                className="text-red-600 hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
                                                disabled={user.id === currentUser.id}
                                            >
                                                {t('delete')}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="bg-white p-6 rounded-xl shadow-md max-w-2xl mt-8">
                <h2 className="text-2xl font-bold text-gray-700 mb-4 border-b pb-3">{t('dataManagement')}</h2>
                <p className="text-sm text-gray-600 mb-4">{t('dataManagementDescription')}</p>
                <div className="flex gap-4">
                    <button onClick={handleExport} className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700">{t('exportData')}</button>
                    <button onClick={handleImportClick} className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600">{t('importData')}</button>
                    <input type="file" ref={importFileRef} onChange={onFileSelected} className="hidden" accept=".json"/>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md max-w-2xl mt-8">
                <h2 className="text-2xl font-bold text-gray-700 mb-4 border-b pb-3">{t('autoBackupTitle')}</h2>
                 <div>
                    <label htmlFor="backup-time" className="block text-lg font-medium text-gray-600">{t('autoBackupTimeSetting')}</label>
                    <p className="text-sm text-gray-500 mb-2">{t('autoBackupTimeDescription')}</p>
                    <input
                        id="backup-time"
                        type="time"
                        value={currentBackupTime}
                        onChange={(e) => setCurrentBackupTime(e.target.value)}
                        className="p-3 border rounded-lg"
                    />
                    <button 
                        onClick={handleBackupTimeSave} 
                        disabled={currentBackupTime === autoBackupTime}
                        className="bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 mx-4"
                    >
                        {t('saveBackupTime')}
                    </button>
                    {isBackupTimeSaved && <span className="text-green-600 font-semibold">{t('savedSuccessfully')}</span>}
                </div>
                <div className="border-t mt-4 pt-4">
                    <p className="text-sm text-gray-600 mb-4">{t('autoBackupDescription')}</p>
                    {autoBackups.length > 0 ? (
                        <ul className="space-y-3 max-h-72 overflow-y-auto border p-2 rounded-lg">
                            {autoBackups.map(backup => (
                                <li key={backup.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">{t('backupDate', backup.id)}</p>
                                        <p className="text-xs text-gray-500">{new Date(backup.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleRestoreClick(backup.id)} className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">{t('restore')}</button>
                                        <button onClick={() => handleDownloadBackup(backup)} className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600">{t('download')}</button>
                                        <button onClick={() => deleteAutoBackup(backup.id)} className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600">{t('delete')}</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 p-4">{t('noAutoBackups')}</p>
                    )}
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md max-w-2xl mt-8">
                <h2 className="text-2xl font-bold text-gray-700 mb-4 border-b pb-3">{t('settingsAutoFileBackup')}</h2>
                <p className="text-sm text-gray-600 mb-4">{t('settingsAutoFileBackupDesc')}</p>
                {fileApiSupport.supported ? (
                    <>
                        {backupDirectoryHandle ? (
                            <div className="flex items-center gap-4 p-3 bg-green-100 rounded-lg">
                                <p className="text-green-800 font-medium">
                                    {t('settingsSelectedFolder')}: <span className="font-bold">{backupDirectoryHandle.name}</span>
                                </p>
                                <button onClick={clearBackupDirectory} className="ml-auto bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-semibold hover:bg-red-600">
                                    {t('settingsClearSelection')}
                                </button>
                            </div>
                        ) : (
                            <button onClick={setBackupDirectory} className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700">
                                {t('settingsChooseFolder')}
                            </button>
                        )}
                    </>
                ) : (
                    <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded-lg" role="alert">
                        <p className="font-bold">
                            {fileApiSupport.reason === 'secure_context'
                                ? t('settingsFileSystemInsecure')
                                : t('settingsFileSystemNotSupported')}
                        </p>
                        <p className="text-sm mt-1">
                            {fileApiSupport.reason === 'secure_context'
                                ? t('settingsFileSystemInsecureDesc')
                                : t('settingsFileSystemNotSupportedDesc')}
                        </p>
                    </div>
                )}
            </div>

            <UserModal 
                isOpen={isUserModalOpen}
                onClose={() => setIsUserModalOpen(false)}
                onSave={handleSaveUser}
                userToEdit={userToEdit}
            />
            <ConfirmationModal 
                isOpen={!!userToDelete}
                onClose={() => setUserToDelete(null)}
                onConfirm={handleConfirmDeleteUser}
                title={t('confirmDelete')}
                message={t('deleteUserConfirmation', userToDelete?.username || '')}
            />
             <ConfirmationModal
                isOpen={!!confirmAction}
                onClose={() => setConfirmAction(null)}
                onConfirm={handleConfirmAction}
                title={t('confirmActionTitle')}
                message={confirmAction?.message || ''}
            />
        </div>
    );
};

export default Settings;