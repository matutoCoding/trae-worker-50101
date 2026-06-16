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
  InscriptionInfo,
  RelocationInfo,
  RelocationStatus,
  FollowUpRecord,
  PaymentHistoryEntry,
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
import { generateUniqueId } from '@/utils/helpers'

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
        const data = parsed as AppData
        // Migrate: fee records need paymentHistory array
        if (data.fees && data.fees.length > 0) {
          data.fees = data.fees.map((f) => ({
            ...f,
            paymentHistory: Array.isArray(f.paymentHistory) ? f.paymentHistory : (f.paidAmount > 0 && f.paidDate ? [{ id: `migrated-${f.id}`, amount: f.paidAmount, date: f.paidDate }] : []),
          }))
        }
        return data
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

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

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
  updatePlotHolder: (plotId: string, patch: Partial<Pick<CemeteryPlot, 'holderName' | 'deceasedName' | 'contractId' | 'saleDate' | 'burialDate' | 'position' | 'areaId' | 'areaName'>>) => void
  addContract: (contract: SalesContract) => void
  updateContractStatus: (contractId: string, status: ContractStatus) => void
  addBurial: (burial: BurialRecord) => void
  updateBurialStatus: (burialId: string, status: BurialStatus) => void
  updateInscription: (burialId: string, inscription: BurialRecord['inscription']) => void
  addSacrifice: (sacrifice: SacrificeBooking) => void
  updateSacrificeStatus: (sacrificeId: string, status: SacrificeStatus) => void
  addMaintenanceTask: (task: MaintenanceTask) => void
  updateMaintenanceStatus: (taskId: string, status: MaintenanceStatus) => void
  addFollowUp: (customerId: string, record: FollowUpRecord) => void
  updateCustomerNextFollowUp: (customerId: string, nextDate: string) => void
  updateCustomerPlot: (customerId: string, plotId: string, plotPosition: string) => void
  updateRelocationStatus: (customerId: string, status: RelocationStatus) => void
  addRelocation: (customerId: string, info: RelocationInfo) => void
  completeRelocation: (customerId: string) => void
  addFee: (fee: FeeRecord) => void
  updateFeeStatus: (feeId: string, status: FeeStatus, paidAmount?: number) => void
  addFeePayment: (feeId: string, amount: number) => void
  resetData: () => void
}

const persisted = loadPersistedData()
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

  updatePlotHolder: (plotId, patch) =>
    set((state) => {
      const newState = { plots: state.plots.map((p) => (p.id === plotId ? { ...p, ...patch } : p)) }
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
      const contract = state.contracts.find((c) => c.id === contractId)
      if (!contract) return state
      const newContracts = state.contracts.map((c) => (c.id === contractId ? { ...c, status } : c))
      let newPlots = state.plots
      let plotStatus: PlotStatus | null = null
      if (status === 'pending') plotStatus = 'reserved'
      if (status === 'signed') plotStatus = 'reserved'
      if (status === 'completed') plotStatus = 'sold'
      if (status === 'cancelled') plotStatus = 'available'
      if (plotStatus) {
        newPlots = state.plots.map((p) => (p.id === contract.plotId ? { ...p, status: plotStatus!, saleDate: status === 'completed' ? new Date().toISOString().split('T')[0] : undefined } : p))
      }
      const newState = { contracts: newContracts, plots: newPlots }
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
      const burial = state.burials.find((b) => b.id === burialId)
      if (!burial) return state
      const newBurials = state.burials.map((b) => (b.id === burialId ? { ...b, status } : b))
      let newPlots = state.plots
      if (status === 'completed') {
        newPlots = state.plots.map((p) => (p.id === burial.plotId ? { ...p, status: 'buried' as PlotStatus, burialDate: burial.burialDate, deceasedName: burial.deceasedName } : p))
      }
      const newState = { burials: newBurials, plots: newPlots }
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
      const today = new Date().toISOString().split('T')[0]
      let nextDate: string
      switch (record.type) {
        case 'phone': nextDate = addDays(today, 30); break
        case 'visit': nextDate = addDays(today, 90); break
        case 'wechat': nextDate = addDays(today, 14); break
        default: nextDate = addDays(today, 30)
      }
      const newState = {
        customers: state.customers.map((c) =>
          c.id === customerId ? { ...c, followUpRecords: [...c.followUpRecords, record], lastVisitDate: today, nextFollowUpDate: nextDate } : c
        ),
      }
      persistData({ ...state, ...newState })
      return newState
    }),

  updateCustomerNextFollowUp: (customerId, nextDate) =>
    set((state) => {
      const newState = { customers: state.customers.map((c) => (c.id === customerId ? { ...c, nextFollowUpDate: nextDate } : c)) }
      persistData({ ...state, ...newState })
      return newState
    }),

  updateCustomerPlot: (customerId, plotId, plotPosition) =>
    set((state) => {
      const newState = { customers: state.customers.map((c) => (c.id === customerId ? { ...c, plotId, plotPosition } : c)) }
      persistData({ ...state, ...newState })
      return newState
    }),

  updateRelocationStatus: (customerId, status) =>
    set((state) => {
      const customer = state.customers.find((c) => c.id === customerId)
      if (!customer || !customer.relocationRequest) return state
      const partialState: Partial<AppData> = {
        customers: state.customers.map((c) =>
          c.id === customerId && c.relocationRequest
            ? { ...c, relocationRequest: { ...c.relocationRequest, status } }
            : c
        ),
      }
      if (status === 'completed') {
        const req = customer.relocationRequest
        const { plots } = get()
        const oldPlot = plots.find((p) => p.position === req.fromPlot)
        const newPlot = plots.find((p) => p.position === req.toPlot)
        let updatedPlots = state.plots
        if (oldPlot) {
          updatedPlots = updatedPlots.map((p) =>
            p.id === oldPlot.id
              ? { ...p, status: 'available' as PlotStatus, holderName: undefined, deceasedName: undefined, contractId: undefined, saleDate: undefined, burialDate: undefined }
              : p
          )
        }
        if (newPlot) {
          updatedPlots = updatedPlots.map((p) =>
            p.id === newPlot.id
              ? { ...p, status: oldPlot?.status === 'buried' ? 'buried' : 'sold', holderName: customer.buyerName, deceasedName: oldPlot?.deceasedName, contractId: customer.contractNo, saleDate: new Date().toISOString().split('T')[0], burialDate: oldPlot?.burialDate }
              : p
          )
        }
        const updatedCustomers = partialState.customers!.map((c) =>
          c.id === customerId && newPlot ? { ...c, plotId: newPlot.id, plotPosition: newPlot.position } : c
        )
        partialState.customers = updatedCustomers
        partialState.plots = updatedPlots
      }
      const newState = { ...state, ...partialState }
      persistData(newState)
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

  completeRelocation: (customerId) => {
    const { customers } = get()
    const customer = customers.find((c) => c.id === customerId)
    if (customer?.relocationRequest) {
      get().updateRelocationStatus(customerId, 'completed')
    }
  },

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

  addFeePayment: (feeId, amount) =>
    set((state) => {
      const today = new Date().toISOString().split('T')[0]
      const entry: PaymentHistoryEntry = { id: generateUniqueId(), amount, date: today }
      const newState = {
        fees: state.fees.map((f) => {
          if (f.id !== feeId) return f
          const newPaid = f.paidAmount + amount
          const isFullyPaid = newPaid >= f.amount
          let newStatus: FeeStatus = f.status
          if (isFullyPaid) {
            newStatus = 'paid'
          } else if (f.status === 'overdue') {
            newStatus = 'overdue'
          } else if (newPaid > 0) {
            newStatus = 'partial'
          }
          return {
            ...f,
            paidAmount: newPaid,
            status: newStatus,
            paidDate: isFullyPaid ? today : f.paidDate,
            paymentHistory: [...(f.paymentHistory || []), entry],
          }
        }),
      }
      persistData({ ...state, ...newState })
      return newState
    }),

  resetData: () => {
    persistData(defaultData)
    set(defaultData)
  },
}))
