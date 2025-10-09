import React, { useState } from 'react';
import type { DailyEntry, UserProfile } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import LoadingSpinner from './LoadingSpinner';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: DailyEntry[];
  userProfile: UserProfile;
}

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, entries, userProfile }) => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const [startDate, setStartDate] = useState(formatDate(thirtyDaysAgo));
    const [endDate, setEndDate] = useState(formatDate(today));
    const [format, setFormat] = useState<'pdf' | 'csv'>('pdf');
    const [isExporting, setIsExporting] = useState(false);

    const getFilteredEntries = () => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return entries
            .filter(entry => {
                const entryDate = new Date(entry.date);
                return entryDate >= start && entryDate <= end;
            })
            .sort((a, b) => a.date.localeCompare(b.date));
    };
    
    const escapeCsvField = (field: any): string => {
        const str = String(field ?? '');
        if (/[",\n\r]/.test(str)) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const handleExportCsv = (filteredEntries: DailyEntry[]) => {
        const headers = [
            'data', 'pasti', 'attività', 'giorno non lavorativo', 
            'calorie', 'proteine (g)', 'carboidrati (g)', 'grassi (g)', 
            'riepilogo AI', 'micronutrienti'
        ];

        const rows = filteredEntries.map(entry => [
            entry.date,
            entry.meals,
            entry.activity,
            entry.isNonWorkingDay ? 'Sì' : 'No',
            entry.analysis?.calories.toFixed(0),
            entry.analysis?.protein.toFixed(1),
            entry.analysis?.carbs.toFixed(1),
            entry.analysis?.fats.toFixed(1),
            entry.analysis?.summary,
            entry.analysis?.micronutrients?.join('; ')
        ].map(escapeCsvField));

        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
        
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `diario_alimentare_${startDate}_${endDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPdf = (filteredEntries: DailyEntry[]) => {
        const doc = new jsPDF();
        
        const goalMap = {
            lose_weight: "Perdere peso", gain_muscle: "Aumentare massa muscolare", maintain_weight: "Mantenere il peso",
            improve_performance: "Migliorare performance", eat_healthier: "Mangiare più sano", identify_issues: "Identificare cibi problematici"
        };
        const lifestyleMap = { sedentary: "Sedentario", moderately_active: "Moderatamente Attivo", active: "Attivo" };

        // Titolo
        doc.setFontSize(18);
        doc.text('Report Diario Alimentare', 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Periodo: dal ${new Date(startDate + 'T00:00:00').toLocaleDateString('it-IT')} al ${new Date(endDate + 'T00:00:00').toLocaleDateString('it-IT')}`, 14, 30);
        
        // Profilo Utente
        doc.setFontSize(14);
        doc.text('Profilo Utente', 14, 45);
        autoTable(doc, {
            startY: 50,
            head: [['Parametro', 'Valore']],
            body: [
                ['Età', userProfile.age || 'N/D'],
                ['Sesso', userProfile.gender || 'N/D'],
                ['Altezza (cm)', userProfile.height || 'N/D'],
                ['Peso (kg)', userProfile.weight || 'N/D'],
                ['Stile di Vita', userProfile.lifestyle ? lifestyleMap[userProfile.lifestyle] : 'N/D'],
                ['Obiettivo', userProfile.goal ? goalMap[userProfile.goal] : 'N/D'],
                ['Condizioni/Dieta', userProfile.conditions || 'Nessuna'],
            ],
            theme: 'grid',
            headStyles: { fillColor: [75, 85, 99] }
        });

        // Dati giornalieri
        filteredEntries.forEach(entry => {
            const finalY = (doc as any).lastAutoTable.finalY || 10;
            if (finalY > 200) doc.addPage();
            const startY = finalY > 200 ? 20 : finalY + 15;

            doc.setFontSize(14);
            doc.setTextColor(0);
            const dateString = new Date(entry.date + 'T00:00:00').toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const nonWorking = entry.isNonWorkingDay ? " (Giorno non lavorativo)" : "";
            doc.text(`${dateString}${nonWorking}`, 14, startY);
            
            autoTable(doc, {
                startY: startY + 5,
                body: [
                    [{ content: 'Pasti', styles: { fontStyle: 'bold', fillColor: '#f3f4f6' } }],
                    [entry.meals || 'Nessun pasto registrato.'],
                    [{ content: 'Attività Fisica', styles: { fontStyle: 'bold', fillColor: '#f3f4f6' } }],
                    [entry.activity || 'Nessuna attività registrata.']
                ],
                theme: 'grid'
            });

            if (entry.analysis) {
                autoTable(doc, {
                    startY: (doc as any).lastAutoTable.finalY,
                    head: [['Calorie (kcal)', 'Proteine (g)', 'Carboidrati (g)', 'Grassi (g)']],
                    body: [[
                        entry.analysis.calories.toFixed(0),
                        entry.analysis.protein.toFixed(1),
                        entry.analysis.carbs.toFixed(1),
                        entry.analysis.fats.toFixed(1),
                    ]],
                    theme: 'grid',
                    headStyles: { fillColor: [99, 102, 241] }
                });
                autoTable(doc, {
                    startY: (doc as any).lastAutoTable.finalY,
                    body: [
                        [{ content: 'Riepilogo AI', styles: { fontStyle: 'bold', fillColor: '#f3f4f6' } }],
                        [entry.analysis.summary]
                    ],
                    theme: 'grid'
                });
            }
        });

        doc.save(`diario_alimentare_${startDate}_${endDate}.pdf`);
    };


    const handleExport = () => {
        setIsExporting(true);
        // Timeout per permettere al loader di rendersi visibile
        setTimeout(() => {
            try {
                const filtered = getFilteredEntries();
                if (format === 'pdf') {
                    handleExportPdf(filtered);
                } else {
                    handleExportCsv(filtered);
                }
            } catch (error) {
                console.error("Export failed:", error);
                alert("Si è verificato un errore durante l'esportazione.");
            } finally {
                setIsExporting(false);
                onClose();
            }
        }, 100);
    };

    if (!isOpen) return null;

  return (
    <>
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity" 
            onClick={onClose}
            aria-hidden="true"
        ></div>
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-title"
        >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                <div className="p-6">
                    <h2 id="export-title" className="text-2xl font-bold text-gray-800 mb-6">Esporta Diario</h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="startDate" className="block text-sm font-medium text-gray-600 mb-1">Data di Inizio</label>
                            <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                        </div>
                        <div>
                            <label htmlFor="endDate" className="block text-sm font-medium text-gray-600 mb-1">Data di Fine</label>
                            <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">Formato</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="format" value="pdf" checked={format === 'pdf'} onChange={() => setFormat('pdf')} className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"/>
                                    <span className="text-gray-700">PDF</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="format" value="csv" checked={format === 'csv'} onChange={() => setFormat('csv')} className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"/>
                                    <span className="text-gray-700">CSV (Excel)</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-xl">
                    <button type="button" onClick={onClose} disabled={isExporting} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
                        Annulla
                    </button>
                    <button 
                        type="button" 
                        onClick={handleExport}
                        disabled={isExporting}
                        className="min-w-[120px] text-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
                    >
                        {isExporting ? <LoadingSpinner /> : 'Genera e Scarica'}
                    </button>
                </div>
            </div>
        </div>
    </>
  );
};

export default ExportModal;