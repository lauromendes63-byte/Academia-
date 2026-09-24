import React, { useState, useRef } from 'react';
import { db, exportAllData, importAllData, initializeDatabase } from '../db/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { triggerHaptic } from '../utils/audio';
import {
  Download,
  Upload,
  Smartphone,
  RefreshCcw,
  CheckCircle2,
  HardDrive
} from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const profile = useLiveQuery(() => db.userProfile.get('main_user'));
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Export JSON backup
  const handleExportBackup = async () => {
    try {
      triggerHaptic('success');
      const data = await exportAllData();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      const today = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `academia_backup_${today}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({
        text: 'Backup exportado com sucesso! Arquivo JSON salvo.',
        type: 'success'
      });
    } catch (err: any) {
      setMessage({
        text: `Erro ao exportar: ${err.message || 'Falha desconhecida'}`,
        type: 'error'
      });
    }
  };

  // Import JSON backup
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      triggerHaptic('medium');
      const text = await file.text();
      const parsed = JSON.parse(text);

      const confirmed = window.confirm(
        'A importação irá substituir os dados atuais pelos dados do arquivo. Deseja continuar?'
      );

      if (confirmed) {
        await importAllData(parsed);
        triggerHaptic('success');
        setMessage({
          text: 'Backup importado e restaurado com sucesso!',
          type: 'success'
        });
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }
    } catch (err: any) {
      setMessage({
        text: `Falha ao importar backup: ${err.message || 'Arquivo inválido'}`,
        type: 'error'
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Reset to default factory
  const handleResetToFactory = async () => {
    const confirmed = window.confirm(
      'ATENÇÃO: Deseja apagar os dados e recarregar a rotina padrão ABCD e pesagem inicial?'
    );
    if (confirmed) {
      triggerHaptic('alert');
      await db.delete();
      await db.open();
      await initializeDatabase();
      window.location.reload();
    }
  };

  return (
    <div className="pb-36 pt-2 max-w-lg mx-auto px-4">
      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md pt-3 pb-3 mb-4 -mx-4 px-4 border-b border-slate-200/60">
        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
          Configurações
        </span>
        <h1 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
          Perfil & Dados Offline
        </h1>
      </div>

      {message && (
        <div
          className={`mb-4 p-4 rounded-2xl border text-xs font-bold flex items-center justify-between animate-in fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-2 font-black text-sm">
            ✕
          </button>
        </div>
      )}

      <div className="space-y-4">
        {/* 1. PERFIL DO USUÁRIO */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-blue-500/20">
              L
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {profile?.name || 'Lauro'}
              </h3>
              <p className="text-xs text-slate-500">
                {profile?.age || 21} anos • {profile?.heightCm ? `${(profile.heightCm / 100).toFixed(2)}m` : '1.85m'} • Homem
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Meta Proteica</span>
              <div className="text-sm font-black text-slate-800">
                {profile?.targetProteinGrams || 185}g / dia
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Meta Hidratação</span>
              <div className="text-sm font-black text-cyan-700">
                {((profile?.targetWaterMl || 4000) / 1000).toFixed(1)}L / dia
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Objetivo</span>
              <div className="text-sm font-black text-blue-600">Recomposição</div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Próximo Treino</span>
              <div className="text-sm font-black text-emerald-600">
                Rotina {profile?.activeRoutine || 'A'}
              </div>
            </div>
          </div>
        </div>

        {/* 2. BACKUP & RESTAURAÇÃO (JSON) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <HardDrive className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
              Backup e Segurança dos Dados
            </h3>
          </div>

          <p className="text-xs text-slate-500">
            Todos os seus treinos, cargas e registros ficam salvos localmente no seu celular. Exporte um arquivo JSON a qualquer momento para levar para outro aparelho ou guardar cópia.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            <button
              onClick={handleExportBackup}
              className="py-3.5 px-4 rounded-2xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Backup (.json)</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="py-3.5 px-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xs"
            >
              <Upload className="w-4 h-4" />
              <span>Importar Backup (.json)</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* 3. PWA & DEPLOY CONTÍNUO STATUS */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
              Instalação PWA & Vercel
            </h3>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>100% Offline-First Habilitado</span>
            </div>
            <p className="text-[11px] text-emerald-800">
              O app funciona perfeitamente sem sinal de internet ou Wi-Fi na academia via IndexedDB + Service Worker.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 space-y-1">
            <div className="font-bold text-xs text-slate-900">
              Como adicionar à tela inicial no Samsung A54:
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              No navegador Chrome ou Samsung Internet, toque no menu de <strong>3 pontinhos (⋮)</strong> e selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>. Ele se comportará como um app nativo de alta performance!
            </p>
          </div>
        </div>

        {/* 4. REINICIAR DADOS PADRÃO */}
        <div className="pt-2">
          <button
            onClick={handleResetToFactory}
            className="w-full py-3.5 rounded-2xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>Restaurar Rotinas ABCD de Fábrica</span>
          </button>
        </div>
      </div>
    </div>
  );
};
