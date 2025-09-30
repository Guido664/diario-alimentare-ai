
import React, { useState, useEffect } from 'react';
import type { UserProfile } from '../types';

interface UserProfileModalProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ profile, onSave, onClose }) => {
    const [formData, setFormData] = useState<UserProfile>(profile);

    useEffect(() => {
        setFormData(profile);
    }, [profile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        // Allow empty string or a valid number
        if (value === '' || !isNaN(Number(value))) {
            setFormData(prev => ({ ...prev, [name]: value === '' ? undefined : Number(value) }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

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
            aria-labelledby="user-profile-title"
        >
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 sm:p-8">
                        <h2 id="user-profile-title" className="text-2xl font-bold text-gray-800 mb-6">Profilo Utente</h2>
                        
                        <div className="space-y-6">
                            {/* Dati Antropometrici */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">Dati Antropometrici</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="age" className="block text-sm font-medium text-gray-600">Età</label>
                                        <input type="number" name="age" id="age" value={formData.age || ''} onChange={handleNumericChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                                    </div>
                                    <div>
                                        <label htmlFor="gender" className="block text-sm font-medium text-gray-600">Sesso</label>
                                        <select name="gender" id="gender" value={formData.gender || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                                            <option value="">Seleziona...</option>
                                            <option value="male">Maschio</option>
                                            <option value="female">Femmina</option>
                                            <option value="other">Altro</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="height" className="block text-sm font-medium text-gray-600">Altezza (cm)</label>
                                        <input type="number" name="height" id="height" value={formData.height || ''} onChange={handleNumericChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                                    </div>
                                    <div>
                                        <label htmlFor="weight" className="block text-sm font-medium text-gray-600">Peso (kg)</label>
                                        <input type="number" name="weight" id="weight" step="0.1" value={formData.weight || ''} onChange={handleNumericChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                                    </div>
                                </div>
                            </div>

                            {/* Stile di Vita e Obiettivi */}
                            <div>
                               <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">Stile di Vita e Obiettivi</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="lifestyle" className="block text-sm font-medium text-gray-600">Stile di Vita Lavorativo</label>
                                        <select name="lifestyle" id="lifestyle" value={formData.lifestyle || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                                            <option value="">Seleziona...</option>
                                            <option value="sedentary">Sedentario</option>
                                            <option value="moderately_active">Moderatamente Attivo</option>
                                            <option value="active">Attivo</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="goal" className="block text-sm font-medium text-gray-600">Obiettivo Principale</label>
                                        <select name="goal" id="goal" value={formData.goal || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                                            <option value="">Seleziona...</option>
                                            <option value="lose_weight">Perdere peso</option>
                                            <option value="gain_muscle">Aumentare massa muscolare</option>
                                            <option value="maintain_weight">Mantenere il peso</option>
                                            <option value="improve_performance">Migliorare performance</option>
                                            <option value="eat_healthier">Mangiare più sano</option>
                                            <option value="identify_issues">Identificare cibi problematici</option>
                                        </select>
                                    </div>
                               </div>
                            </div>
                            
                            {/* Condizioni Mediche */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">Condizioni e Dieta</h3>
                                <div>
                                    <label htmlFor="conditions" className="block text-sm font-medium text-gray-600">Allergie, intolleranze, diete (vegano, etc.)</label>
                                    <textarea name="conditions" id="conditions" value={formData.conditions || ''} onChange={handleChange} rows={4} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="Es: Intollerante al lattosio, dieta vegetariana..."></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-xl">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Annulla
                        </button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Salva Profilo
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </>
  );
};

export default UserProfileModal;
