import { create } from 'zustand'
import type {
  CemeteryPlot,
  SalesContract,
  BurialRecord,
  SacrificeBooking,
  MaintenanceTask,
  CustomerRecord,
  FeeRecord,
  PlotStatus,
  ContractStatus,
  BurialStatus,
  SacrificeStatus,
  MaintenanceStatus,
  FeeStatus,
} from '@/types'
import {
  cemeteryPlots as initialPlots,
  salesContracts as initialContracts,
  burialRecords as initialBurials,
  sacrificeBookings as initialSacrifices,
  maintenanceTasks as initialMaintenance,
  customerRecords as initialCustomers,
  feeRecords as initialFees,
  cemeteryAreas as initialAreas,
} from '@/data/mockData'

interface CemeteryArea {
  id: string
  name: string
  description: string
  totalPlots: number
  soldPlots: number
  rows: number
  columns: number
}

interface AppState {
  areas: CemeteryArea[]
  plots: CemeteryPlot[]
  contracts: SalesContract[]
  burials: BurialRecord[]
  sacrifices: SacrificeBooking[]
  maintenance: MaintenanceTask[]
  customers: CustomerRecord[]
  fees: FeeRecord[]

  setPlotStatus: (plotId: string, status: PlotStatus) => void
  addContract: (contract: SalesContract) => void
  updateContractStatus: (contractId: string, status: ContractStatus) => void
  addBurial: (burial: BurialRecord) => void
  updateBurialStatus: (burialId: string, status: BurialStatus) => void
  addSacrifice: (sacrifice: SacrificeBooking) => void
  updateSacrificeStatus: (sacrificeId: string, status: SacrificeStatus) => void
  addMaintenanceTask: (task: MaintenanceTask) => void
  updateMaintenanceStatus: (taskId: string, status: MaintenanceStatus) => void
  addFollowUp: (customerId: string, record: CustomerRecord['followUpRecords'][0]) => void
  addFee: (fee: FeeRecord) => void
  updateFeeStatus: (feeId: string, status: FeeStatus, paidAmount?: number) => void
}

export const useStore = create<AppState>((set) => ({
  areas: initialAreas,
  plots: initialPlots,
  contracts: initialContracts,
  burials: initialBurials,
  sacrifices: initialSacrifices,
  maintenance: initialMaintenance,
  customers: initialCustomers,
  fees: initialFees,

  setPlotStatus: (plotId, status) =>
    set((state) => ({
      plots: state.plots.map((p) => (p.id === plotId ? { ...p, status } : p)),
    })),

  addContract: (contract) =>
    set((state) => ({ contracts: [...state.contracts, contract] })),

  updateContractStatus: (contractId, status) =>
    set((state) => ({
      contracts: state.contracts.map((c) => (c.id === contractId ? { ...c, status } : c)),
    })),

  addBurial: (burial) =>
    set((state) => ({ burials: [...state.burials, burial] })),

  updateBurialStatus: (burialId, status) =>
    set((state) => ({
      burials: state.burials.map((b) => (b.id === burialId ? { ...b, status } : b)),
    })),

  addSacrifice: (sacrifice) =>
    set((state) => ({ sacrifices: [...state.sacrifices, sacrifice] })),

  updateSacrificeStatus: (sacrificeId, status) =>
    set((state) => ({
      sacrifices: state.sacrifices.map((s) => (s.id === sacrificeId ? { ...s, status } : s)),
    })),

  addMaintenanceTask: (task) =>
    set((state) => ({ maintenance: [...state.maintenance, task] })),

  updateMaintenanceStatus: (taskId, status) =>
    set((state) => ({
      maintenance: state.maintenance.map((m) =>
        m.id === taskId ? { ...m, status, completedDate: status === 'completed' ? new Date().toISOString().split('T')[0] : m.completedDate } : m
      ),
    })),

  addFollowUp: (customerId, record) =>
    set((state) => ({
      customers: state.customers.map((c) =>
        c.id === customerId ? { ...c, followUpRecords: [...c.followUpRecords, record] } : c
      ),
    })),

  addFee: (fee) =>
    set((state) => ({ fees: [...state.fees, fee] })),

  updateFeeStatus: (feeId, status, paidAmount) =>
    set((state) => ({
      fees: state.fees.map((f) =>
        f.id === feeId
          ? { ...f, status, paidAmount: paidAmount ?? f.paidAmount, paidDate: status === 'paid' ? new Date().toISOString().split('T')[0] : f.paidDate }
          : f
      ),
    })),
}))
