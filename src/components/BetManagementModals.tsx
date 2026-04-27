import React from 'react';
import { AnimatePresence } from 'motion/react';
import { EditBetModal } from './modals/EditBetModal';
import { CashoutModal } from './modals/CashoutModal';
import { BulkConfirmModal } from './modals/BulkConfirmModal';
import { DuplicateWarningModal } from './modals/DuplicateWarningModal';

interface BetManagementModalsProps {
  // Cashout
  cashoutBetId: string | null;
  setCashoutBetId: (v: string | null) => void;
  bets: any[];
  cashoutAmount: string;
  setCashoutAmount: (v: string) => void;
  updateStatus: (id: string, status: any, value?: number) => void;

  // Bulk Queue (Scanning)
  bulkQueue: any[];
  setBulkQueue: (v: any[]) => void;
  userBookmakers: string[];
  addBet: any;
  isScanning: boolean;
  setIsScanning: (v: boolean) => void;
  showToast: (m: string, t?: any) => void;
  setActiveTab: (tab: string) => void;

  // Edit Bet
  showEditModal: boolean;
  setShowEditModal: (v: boolean) => void;
  editingBetId: string | null;
  setEditingBetId: (v: string | null) => void;
  betForm: any;
  setBetForm: (v: any) => void;
  isManualBookmaker: boolean;
  setIsManualBookmaker: (v: boolean) => void;
  updateBet: any;
  safeNewDate: any;

  // Duplicate Warning
  duplicateWarning: any;
  setDuplicateWarning: (v: any) => void;
}

export function BetManagementModals({
  cashoutBetId,
  setCashoutBetId,
  bets,
  cashoutAmount,
  setCashoutAmount,
  updateStatus,
  bulkQueue,
  setBulkQueue,
  userBookmakers,
  addBet,
  isScanning,
  setIsScanning,
  showToast,
  setActiveTab,
  showEditModal,
  setShowEditModal,
  editingBetId,
  setEditingBetId,
  betForm,
  setBetForm,
  isManualBookmaker,
  setIsManualBookmaker,
  updateBet,
  safeNewDate,
  duplicateWarning,
  setDuplicateWarning,
}: BetManagementModalsProps) {
  return (
    <>
      {/* Cashout Modal */}
      <AnimatePresence>
        {cashoutBetId && (
          <CashoutModal
            isOpen={!!cashoutBetId}
            onClose={() => setCashoutBetId(null)}
            bet={bets.find(b => b.id === cashoutBetId) || null}
            cashoutAmount={cashoutAmount}
            setCashoutAmount={setCashoutAmount}
            onConfirm={() => {
              const val = parseFloat(cashoutAmount.replace(',', '.'));
              updateStatus(cashoutBetId, 'cashout', val || 0);
              setCashoutBetId(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Bulk Queue Modal */}
      <AnimatePresence>
        {bulkQueue.length > 0 && (
          <BulkConfirmModal
            isOpen={bulkQueue.length > 0}
            onClose={() => setBulkQueue([])}
            bulkQueue={bulkQueue}
            setBulkQueue={setBulkQueue}
            bets={bets}
            userBookmakers={userBookmakers}
            addBet={addBet}
            isScanning={isScanning}
            setIsScanning={setIsScanning}
            showToast={showToast}
            setActiveTab={setActiveTab}
          />
        )}
      </AnimatePresence>

      {/* Edit Bet Modal */}
      <AnimatePresence>
        {showEditModal && editingBetId && (
          <EditBetModal
            isOpen={showEditModal && !!editingBetId}
            onClose={() => {
              setShowEditModal(false);
              setEditingBetId(null);
            }}
            editingBetId={editingBetId}
            betForm={betForm}
            setBetForm={setBetForm}
            userBookmakers={userBookmakers}
            isManualBookmaker={isManualBookmaker}
            setIsManualBookmaker={setIsManualBookmaker}
            updateBet={updateBet}
            safeNewDate={safeNewDate}
          />
        )}
      </AnimatePresence>

      {/* Duplicate Warning Modal */}
      <AnimatePresence>
        {duplicateWarning && (
          <DuplicateWarningModal
            isOpen={!!duplicateWarning}
            onClose={() => setDuplicateWarning(null)}
            data={duplicateWarning.data}
            onConfirm={(data) => addBet(data, true)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
