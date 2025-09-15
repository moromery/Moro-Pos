import React, { useState, useMemo } from 'react';
import { Attendance, User } from '../types';
import { useTranslation } from '../contexts/LanguageContext';
import { exportToExcel } from '../constants';

interface AttendanceProps {
    attendance: Attendance[];
    users: User[];
}

const Attendance: React.FC<AttendanceProps> = ({ attendance, users }) => {
    const { t } = useTranslation();
    const [filters, setFilters] = useState({
        userId: 'all',
        startDate: '',
        endDate: '',
    });

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const calculateDuration = (checkInTime: string, checkOutTime: string | null): string => {
        if (!checkOutTime) return t('attendanceStatusCheckedIn');
        const start = new Date(checkInTime).getTime();
        const end = new Date(checkOutTime).getTime();
        const diff = end - start;

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        return `${hours} ${t('hours')} و ${minutes} ${t('minutes')}`;
    };

    const formatDateTime = (isoString: string | null) => {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
    };

    const filteredAttendance = useMemo(() => {
        return attendance.filter(record => {
            const recordDate = new Date(record.checkInTime);
            const startDate = filters.startDate ? new Date(filters.startDate) : null;
            const endDate = filters.endDate ? new Date(filters.endDate) : null;
            if (startDate) startDate.setHours(0, 0, 0, 0);
            if (endDate) endDate.setHours(23, 59, 59, 999);

            const matchesUser = filters.userId === 'all' || record.userId === filters.userId;
            const matchesStartDate = !startDate || recordDate >= startDate;
            const matchesEndDate = !endDate || recordDate <= endDate;

            return matchesUser && matchesStartDate && matchesEndDate;
        });
    }, [attendance, filters]);

    const handleExport = () => {
        const dataToExport = filteredAttendance.map(record => ({
            [t('attendanceTableUser')]: record.username,
            [t('attendanceTableCheckIn')]: formatDateTime(record.checkInTime),
            [t('attendanceTableCheckOut')]: formatDateTime(record.checkOutTime),
            [t('attendanceTableDuration')]: calculateDuration(record.checkInTime, record.checkOutTime),
        }));
        exportToExcel(dataToExport, 'Attendance_Report');
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-4xl font-bold text-gray-800">{t('attendanceLogTitle')}</h1>
                <button onClick={handleExport} className="bg-green-700 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-800">{t('exportToExcel')}</button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-md mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <select name="userId" value={filters.userId} onChange={handleFilterChange} className="p-3 border rounded-lg bg-white">
                        <option value="all">{t('attendanceFilterAllUsers')}</option>
                        {users.map(user => (
                            <option key={user.id} value={user.id}>{user.username}</option>
                        ))}
                    </select>
                    <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="p-3 border rounded-lg" />
                    <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="p-3 border rounded-lg" />
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4 text-sm font-semibold">{t('attendanceTableUser')}</th>
                                <th className="p-4 text-sm font-semibold">{t('attendanceTableCheckIn')}</th>
                                <th className="p-4 text-sm font-semibold">{t('attendanceTableCheckOut')}</th>
                                <th className="p-4 text-sm font-semibold">{t('attendanceTableDuration')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredAttendance.map(record => (
                                <tr key={record.id}>
                                    <td className="p-4 text-sm text-gray-700">{record.username}</td>
                                    <td className="p-4 text-sm text-gray-700">{formatDateTime(record.checkInTime)}</td>
                                    <td className="p-4 text-sm text-gray-700">{formatDateTime(record.checkOutTime)}</td>
                                    <td className="p-4 text-sm text-gray-700 font-semibold">
                                        {record.status === 'checked-in' ? (
                                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                                {calculateDuration(record.checkInTime, record.checkOutTime)}
                                            </span>
                                        ) : (
                                            calculateDuration(record.checkInTime, record.checkOutTime)
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {filteredAttendance.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center p-8 text-gray-500">{t('attendanceNoRecords')}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Attendance;
