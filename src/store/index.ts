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

interface AppData {
  areas: CemeteryArea[]
  plots: CemeteryPlot[]
  contracts: SalesContract[]
  burials: BurialRecord[]
  sacrifices: SacrificeBooking[]
  maintenance: MaintenanceTask[]
  customers: CustomerRecord[]
  fees: FeeRecord[]
}

const STORAGE_KEY = 'yongning_cemetery_data'

function loadPersistedData(): AppData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.plots)) {
        return parsed as AppData
      }
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
  return null
}

function persistData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // storage full or unavailable, silently fail
  }
}

const persisted = loadPersistedData()

const defaultData: AppData = {
  areas: initialAreas,
  plots: initialPlots,
  contracts: initialContracts,
  burials: initialBurials,
  sacrifices: initialSacrifices,
  maintenance: initialMaintenance,
  customers: initialCustomers,
  fees: initialFees,
}

interface AppState extends AppData {
  setPlotStatus: (plotId: string, status: PlotStatus) => void
  addContract: (contract: SalesContract) => void
  updateContractStatus: (contractId: string, status: ContractStatus) => void
  addBurial: (burial: BurialRecord) => void
  updateBurialStatus: (burialId: string, status: BurialStatus) => void
  updateInscription: (burialId: string, inscription: BurialRecord['inscription']) => void
  addSacrifice: (sacrifice: SacrificeBooking) => void
  updateSacrificeStatus: (sacrificeId: string, status: SacrificeStatus) => void
  addMaintenanceTask: (task: MaintenanceTask) => void
  updateMaintenanceStatus: (taskId: string, status: MaintenanceStatus) => void
  addFollowUp: (customerId: string, record: CustomerRecord['followUpRecords'][0]) => void
  updateRelocationStatus: (customerId: string, status: RelocationStatus) => void
  addRelocation: (customerId: string, info: RelocationInfo) => void
  addFee: (fee: FeeRecord) => void
  updateFeeStatus: (feeId: string, status: FeeStatus, paidAmount?: number) => void
  resetData: () => void
}

type RelocationStatus = import('@/types').RelocationStatus
type RelocationInfo = import('@/types').RelocationInfo

const initialData: AppData = persisted || defaultData

export const useStore = create<AppState>((set, get) => ({
  areas: initialData.areas,
  plots: initialData.plots,
  contracts: initialData.contracts,
  burials: initialData.burials,
  sacrifices: initialData.sacrifices,
  maintenance: initialData.maintenance,
  customers: initialData.customers,
  fees: initialData.fees,

  setPlotStatus: (plotId, status) =>
    set((state) => {
      const newState = { plots: state.plots.map((p) => (p.id === plotId ? { ...p, status } : p)) }
      persistData({ ...state, ...newState })
      return newState
    }),

  addContract: (contract) =>
    set((state) => {
      const newState = { contracts: [...state.contracts, contract] }
      persistData({ ...state, ...newState })
      return newState
    }),

  updateContractStatus: (contractId, status) =>
    set((state) => {
      const newState = { contracts: state.contracts.map((c) => (c.id === contractId ? { ...c, status } : c)) }
      persistData({ ...state, ...newState })
      return newState
    }),

  addBurial: (burial) =>
    set((state) => {
      const newState = { burials: [...state.burials, burial] }
      persistData({ ...state, ...newState })
      return newState
    }),

  updateBurialStatus: (burialId, status) =>
    set((state) => {
      const newState = { burials: state.burials.map((b) => (b.id === burialId ? { ...b, status } : b)) }
      persistData({ ...state, ...newState })
      return newState
    }),

  updateInscription: (burialId, inscription) =>
    set((state) => {
      const newState = { burials: state.burials.map((b) => (b.id === burialId ? { ...b, inscription: inscription ?? b.inscription } : b)) }
      persistData({ ...state, ...newState })
      return newState
    }),

  addSacrifice: (sacrifice) =>
    set((state) => {
      const newState = { sacrifices: [...state.sacrifices, sacrifice] }
      persistData({ ...state, ...newState })
      return newState
    }),

  updateSacrificeStatus: (sacrificeId, status) =>
    set((state) => {
      const newState = { sacrifices: state.sacrifices.map((s) => (s.id === sacrificeId ? { ...s, status } : s)) }
      persistData({ ...state, ...newState })
      return newState
    }),

  addMaintenanceTask: (task) =>
    set((state) => {
      const newState = { maintenance: [...state.maintenance, task] }
      persistData({ ...state, ...newState })
      return newState
    }),

  updateMaintenanceStatus: (taskId, status) =>
    set((state) => {
      const newState = {
        maintenance: state.maintenance.map((m) =>
          m.id === taskId ? { ...m, status, completedDate: status === 'completed' ? new Date().toISOString().split('T')[0] : m.completedDate } : m
        ),
      }
      persistData({ ...state, ...newState })
      return newState
    }),

  addFollowUp: (customerId, record) =>
    set((state) => {
      const newState = {
        customers: state.customers.map((c) =>
          c.id === customerId ? { ...c, followUpRecords: [...c.followUpRecords, record] } : c
        ),
      }
      persistData({ ...state, ...newState })
      return newState
    }),

  updateRelocationStatus: (customerId, status) =>
    set((state) => {
      const newState = {
        customers: state.customers.map((c) =>
          c.id === customerId && c.relocationRequest
            ? { ...c, relocationRequest: { ...c.relocationRequest, status } }
            : c
        ),
      }
      persistData({ ...state, ...newState })
      return newState
    }),

  addRelocation: (customerId, info) =>
    set((state) => {
      const newState = {
        customers: state.customers.map((c) =>
          c.id === customerId ? { ...c, relocationRequest: info } : c
        ),
      }
      persistData({ ...state, ...newState })
      return newState
    }),

  addFee: (fee) =>
    set((state) => {
      const newState = { fees: [...state.fees, fee] }
      persistData({ ...state, ...newState })
      return newState
    }),

  updateFeeStatus: (feeId, status, paidAmount) =>
    set((state) => {
      const newState = {
        fees: state.fees.map((f) =>
          f.id === feeId
            ? { ...f, status, paidAmount: paidAmount ?? f.paidAmount, paidDate: status === 'paid' ? new Date().toISOString().split('T')[0] : f.paidDate }
            : f
        ),
      }
      persistData({ ...state, ...newState })
      return newState
    }),

  resetData: () => {
    persistData(defaultData)
    set(defaultData)
  },
}))
