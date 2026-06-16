export type PlotStatus = 'available' | 'reserved' | 'sold' | 'buried' | 'maintenance'
export type PlotType = 'single' | 'double' | 'family'
export type ContractStatus = 'pending' | 'signed' | 'completed' | 'cancelled'
export type PaymentMethod = 'full' | 'installment'
export type BurialStatus = 'scheduled' | 'preparing' | 'in_progress' | 'completed'
export type InscriptionFontStyle = 'regular' | 'bold' | 'traditional'
export type InscriptionStatus = 'pending' | 'confirmed' | 'engraved'
export type SacrificeType = 'self' | 'proxy'
export type SacrificeStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'
export type ProxyServiceType = 'basic' | 'standard' | 'premium'
export type MaintenanceType = 'greening' | 'cleaning' | 'repair' | 'inspection'
export type MaintenanceStatus = 'pending' | 'in_progress' | 'completed'
export type FollowUpType = 'phone' | 'visit' | 'wechat'
export type RelocationType = 'relocate_out' | 'relocate_in'
export type RelocationStatus = 'pending' | 'approved' | 'in_progress' | 'completed'
export type FeeType = 'management' | 'maintenance' | 'burial' | 'inscription' | 'relocation'
export type FeeStatus = 'unpaid' | 'partial' | 'paid' | 'overdue'

export interface CemeteryArea {
  id: string
  name: string
  description: string
  totalPlots: number
  soldPlots: number
  rows: number
  columns: number
}

export interface CemeteryPlot {
  id: string
  areaId: string
  areaName: string
  row: number
  column: number
  position: string
  status: PlotStatus
  type: PlotType
  price: number
  orientation: string
  area: number
  holderName?: string
  deceasedName?: string
  contractId?: string
  saleDate?: string
  burialDate?: string
}

export interface SalesContract {
  id: string
  contractNo: string
  plotId: string
  plotPosition: string
  buyerName: string
  buyerPhone: string
  buyerIdCard: string
  deceasedName?: string
  price: number
  paymentMethod: PaymentMethod
  paidAmount: number
  status: ContractStatus
  signingDate: string
  notes?: string
}

export interface InscriptionInfo {
  content: string
  fontStyle: InscriptionFontStyle
  specialRequests?: string
  designUrl?: string
  status: InscriptionStatus
}

export interface BurialRecord {
  id: string
  plotId: string
  plotPosition: string
  deceasedName: string
  deceasedIdCard?: string
  deathDate: string
  burialDate: string
  burialTimeSlot: string
  status: BurialStatus
  inscription?: InscriptionInfo
}

export interface ProxyServiceInfo {
  serviceType: ProxyServiceType
  flowerRequired: boolean
  incenseRequired: boolean
  specialRequests?: string
  feedbackPhotos?: string[]
  feedbackVideo?: string
}

export interface SacrificeBooking {
  id: string
  plotId: string
  plotPosition: string
  visitorName: string
  visitorPhone: string
  visitDate: string
  timeSlot: string
  visitorCount: number
  type: SacrificeType
  proxyService?: ProxyServiceInfo
  status: SacrificeStatus
}

export interface MaintenanceTask {
  id: string
  areaId: string
  areaName: string
  type: MaintenanceType
  scheduledDate: string
  assignee: string
  status: MaintenanceStatus
  description: string
  photos?: string[]
  completedDate?: string
}

export interface FollowUpRecord {
  id: string
  date: string
  type: FollowUpType
  content: string
  satisfaction?: number
}

export interface RelocationInfo {
  type: RelocationType
  fromPlot?: string
  toPlot?: string
  reason: string
  status: RelocationStatus
  fee: number
}

export interface CustomerRecord {
  id: string
  buyerName: string
  buyerPhone: string
  plotId: string
  plotPosition: string
  contractNo: string
  lastVisitDate?: string
  nextFollowUpDate?: string
  followUpRecords: FollowUpRecord[]
  relocationRequest?: RelocationInfo
}

export interface PaymentHistoryEntry {
  id: string
  amount: number
  date: string
}

export interface FeeRecord {
  id: string
  plotId: string
  plotPosition: string
  contractNo: string
  feeType: FeeType
  amount: number
  dueDate: string
  paidDate?: string
  paidAmount: number
  status: FeeStatus
  reminderSent: boolean
  paymentHistory: PaymentHistoryEntry[]
}
