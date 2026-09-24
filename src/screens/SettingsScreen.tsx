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
  HardDrive,
  Flame,
  Check
} from 'lucide-react';

export const SettingsScreen: React.FC = () => {
  const profile = useLiveQuery(() => db.userProfile.get('main_user'));
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const currentCalorieMode = profile?.calorieMode || 'recomposicao';

  const handleSelectCalorieMode = async (mode: 'recomposicao' | 'manutencao') => {
    triggerHaptic('light');
    const kcal = mode === 'recomposicao' ? 2200 : 2700;
    await db.userProfile.update('main_user', {
      targetCaloriesKcal: kcal,
      calorieMode: mode
    });
    setMessage({
      text: `Meta atualizada para ${kcal.toLocaleString('pt-BR')} kcal (${mode === 'recomposicao' ? 'Recomposição' : 'Manutenção'})!`,
      type: 'success'
    });
  };

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
      {/* HEADER CENTRALIZADO PREMIUM */}
      <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md pt-2 pb-2.5 mb-3 -mx-4 px-4 border-b border-slate-200/60">
        <div className="text-center min-w-0 px-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-50 border border-blue-200/80 shadow-2xs mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">
              Ajustes do Sistema
            </span>
          </div>
          <h1 className="text-base font-black text-slate-900 tracking-tight truncate leading-tight">
            Perfil & Metas Calóricas
          </h1>
        </div>
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
        {/* 1. SELETOR DE PERFIL CALÓRICO (2.200 kcal vs 2.700 kcal) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-500 fill-current" />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800">
              Meta Calórica Diária (Cálculo Gemini)
            </h3>
          </div>

          <p className="text-xs text-slate-500">
            Gasto estimado em 2.700 - 2.800 kcal (4-5 treinos/semana). Selecione a estratégia atual:
          </p>

          <div className="grid grid-cols-1 gap-2.5 pt-1">
            {/* OPÇÃO 1: RECOMPOSIÇÃO (2.200 kcal) - PADRÃO */}
            <div
              onClick={() => handleSelectCalorieMode('recomposicao')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all duration-150 flex items-center justify-between active:scale-[0.98] ${
                currentCalorieMode === 'recomposicao'
                  ? 'border-blue-500 bg-blue-50/70 text-blue-950 shadow-xs ring-1 ring-blue-400/40'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black">Recomposição Corporal</span>
                  <span className="text-[10px] font-black uppercase bg-blue-600 text-white px-2 py-0.5 rounded-md">
                    Padrão
                  </span>
                </div>
                <div className="text-base font-black text-blue-700 mt-0.5">
                  2.200 kcal / dia
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Déficit de ~500 kcal: foco em perder gordura preservando/ganhando massa magra.
                </p>
              </div>

              {currentCalorieMode === 'recomposicao' ? (
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full border border-slate-300 shrink-0" />
              )}
            </div>

            {/* OPÇÃO 2: MANUTENÇÃO (2.700 kcal) */}
            <div
              onClick={() => handleSelectCalorieMode('manutencao')}
              className={`p-4 rounded-2xl border cursor-pointer transition-all duration-150 flex items-center justify-between active:scale-[0.98] ${
                currentCalorieMode === 'manutencao'
                  ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 shadow-xs ring-1 ring-emerald-400/40'
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black">Manutenção Muscular</span>
                  <span className="text-[10px] font-black uppercase bg-emerald-600 text-white px-2 py-0.5 rounded-md">
                    Equilíbrio
                  </span>
                </div>
                <div className="text-base font-black text-emerald-700 mt-0.5">
                  2.700 kcal / dia
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Sem déficit calórico: para manter o percentual de gordura e progredir cargas.
                </p>
              </div>

              {currentCalorieMode === 'manutencao' ? (
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full border border-slate-300 shrink-0" />
              )}
            </div>
          </div>
        </div>

        {/* 2. PERFIL DO USUÁRIO */}
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
              <span className="text-[10px] uppercase font-bold text-slate-400">Meta Calórica</span>
              <div className="text-sm font-black text-amber-700">
                {(profile?.targetCaloriesKcal || 2200).toLocaleString('pt-BR')} kcal
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Meta Hidratação</span>
              <div className="text-sm font-black text-cyan-700">
                {((profile?.targetWaterMl || 4000) / 1000).toFixed(1)}L / dia
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Próximo Treino</span>
              <div className="text-sm font-black text-emerald-600">
                Rotina {profile?.activeRoutine || 'A'}
              </div>
            </div>
          </div>
        </div>

        {/* 3. BACKUP & RESTAURAÇÃO (JSON) */}
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

        {/* 4. PWA & DEPLOY CONTÍNUO STATUS */}
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
              No navegador Chrome ou Samsung Internet, toque no menu de <strong>3 pontinhos (⋮)</strong> e selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
            </p>
          </div>
        </div>

        {/* 5. REINICIAR DADOS PADRÃO */}
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
