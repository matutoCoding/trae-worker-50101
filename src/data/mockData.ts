import type {
  CemeteryArea,
  CemeteryPlot,
  SalesContract,
  BurialRecord,
  SacrificeBooking,
  MaintenanceTask,
  CustomerRecord,
  FeeRecord,
} from '@/types'

export const cemeteryAreas: CemeteryArea[] = [
  { id: 'area-1', name: '松柏园', description: '主打双穴墓型，环境清幽', totalPlots: 48, soldPlots: 35, rows: 6, columns: 8 },
  { id: 'area-2', name: '梅花园', description: '单穴经济型，性价比高', totalPlots: 36, soldPlots: 28, rows: 6, columns: 6 },
  { id: 'area-3', name: '兰亭园', description: '家族墓型，尊贵典雅', totalPlots: 24, soldPlots: 18, rows: 4, columns: 6 },
  { id: 'area-4', name: '竹韵园', description: '生态节地型，绿色环保', totalPlots: 40, soldPlots: 22, rows: 5, columns: 8 },
  { id: 'area-5', name: '菊花园', description: '艺术墓型，个性化定制', totalPlots: 30, soldPlots: 15, rows: 5, columns: 6 },
]

const statusPool: Array<CemeteryPlot['status']> = ['available', 'reserved', 'sold', 'buried', 'maintenance']
const typePool: Array<CemeteryPlot['type']> = ['single', 'double', 'family']
const orientationPool = ['坐北朝南', '坐西朝东', '坐东朝西', '坐南朝北']
const surnames = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '马', '朱', '胡']

function generatePlots(): CemeteryPlot[] {
  const plots: CemeteryPlot[] = []
  let idCounter = 1
  for (const area of cemeteryAreas) {
    for (let r = 1; r <= area.rows; r++) {
      for (let c = 1; c <= area.columns; c++) {
        const idx = (r - 1) * area.columns + c
        const isSold = idx <= area.soldPlots
        const status: CemeteryPlot['status'] = isSold
          ? (idx % 3 === 0 ? 'buried' : idx % 7 === 0 ? 'reserved' : 'sold')
          : (idx === area.soldPlots + 1 && area.id === 'area-4' ? 'maintenance' : 'available')
        const plotType = area.id === 'area-3' ? 'family' : area.id === 'area-2' ? 'single' : 'double'
        const holderName = isSold ? surnames[idx % surnames.length] + '某' : undefined
        const deceasedName = status === 'buried' ? surnames[(idx + 3) % surnames.length] + '某某' : undefined
        plots.push({
          id: `plot-${idCounter}`,
          areaId: area.id,
          areaName: area.name,
          row: r,
          column: c,
          position: `${area.name}-${r}排${c}号`,
          status,
          type: plotType,
          price: plotType === 'family' ? 128000 : plotType === 'double' ? 68000 : 38000,
          orientation: orientationPool[(r + c) % orientationPool.length],
          area: plotType === 'family' ? 3.6 : plotType === 'double' ? 2.4 : 1.2,
          holderName,
          deceasedName,
          contractId: isSold ? `CT${String(20240000 + idCounter).slice(-8)}` : undefined,
          saleDate: isSold ? `2024-${String((idx % 12) + 1).padStart(2, '0')}-${String((idx % 28) + 1).padStart(2, '0')}` : undefined,
          burialDate: status === 'buried' ? `2025-${String((idx % 12) + 1).padStart(2, '0')}-${String((idx % 28) + 1).padStart(2, '0')}` : undefined,
        })
        idCounter++
      }
    }
  }
  return plots
}

export const cemeteryPlots: CemeteryPlot[] = generatePlots()

export const salesContracts: SalesContract[] = [
  { id: 'ct-1', contractNo: 'CT20240001', plotId: 'plot-1', plotPosition: '松柏园-1排1号', buyerName: '张明远', buyerPhone: '13800138001', buyerIdCard: '110101196001011234', deceasedName: '张老先生', price: 68000, paymentMethod: 'full', paidAmount: 68000, status: 'completed', signingDate: '2024-01-15', paymentPlan: [], paymentHistory: [{ id: 'cp-1', amount: 68000, date: '2024-01-15', remainingAfter: 0 }] },
  { id: 'ct-2', contractNo: 'CT20240002', plotId: 'plot-2', plotPosition: '松柏园-1排2号', buyerName: '李文华', buyerPhone: '13900139002', buyerIdCard: '110101196502022345', price: 68000, paymentMethod: 'installment', paidAmount: 34000, status: 'signed', signingDate: '2024-02-20', paymentPlan: [{ id: 'pp-2-1', dueDate: '2024-02-20', amount: 34000, status: 'paid', paidDate: '2024-02-20', paidAmount: 34000 }, { id: 'pp-2-2', dueDate: '2025-02-20', amount: 34000, status: 'unpaid' }], paymentHistory: [{ id: 'cp-2', amount: 34000, date: '2024-02-20', remainingAfter: 34000 }] },
  { id: 'ct-3', contractNo: 'CT20240003', plotId: 'plot-9', plotPosition: '梅花园-1排1号', buyerName: '王建国', buyerPhone: '13700137003', buyerIdCard: '110101197003033456', deceasedName: '王老夫人', price: 38000, paymentMethod: 'full', paidAmount: 38000, status: 'completed', signingDate: '2024-03-10', paymentPlan: [], paymentHistory: [{ id: 'cp-3', amount: 38000, date: '2024-03-10', remainingAfter: 0 }] },
  { id: 'ct-4', contractNo: 'CT20240004', plotId: 'plot-49', plotPosition: '兰亭园-1排1号', buyerName: '陈世杰', buyerPhone: '13600136004', buyerIdCard: '110101195804044567', price: 128000, paymentMethod: 'full', paidAmount: 128000, status: 'completed', signingDate: '2024-04-05', paymentPlan: [], paymentHistory: [{ id: 'cp-4', amount: 128000, date: '2024-04-05', remainingAfter: 0 }] },
  { id: 'ct-5', contractNo: 'CT20240005', plotId: 'plot-3', plotPosition: '松柏园-1排3号', buyerName: '赵德华', buyerPhone: '13500135005', buyerIdCard: '110101197205055678', price: 68000, paymentMethod: 'installment', paidAmount: 20000, status: 'pending', signingDate: '2024-05-18', paymentPlan: [{ id: 'pp-5-1', dueDate: '2024-05-18', amount: 20000, status: 'paid', paidDate: '2024-05-18', paidAmount: 20000 }, { id: 'pp-5-2', dueDate: '2025-05-18', amount: 24000, status: 'unpaid' }, { id: 'pp-5-3', dueDate: '2026-05-18', amount: 24000, status: 'unpaid' }], paymentHistory: [{ id: 'cp-5', amount: 20000, date: '2024-05-18', remainingAfter: 48000 }] },
  { id: 'ct-6', contractNo: 'CT20240006', plotId: 'plot-10', plotPosition: '梅花园-1排2号', buyerName: '刘美玲', buyerPhone: '13400134006', buyerIdCard: '110101197506066789', deceasedName: '刘老先生', price: 38000, paymentMethod: 'full', paidAmount: 38000, status: 'completed', signingDate: '2024-06-22', paymentPlan: [], paymentHistory: [{ id: 'cp-6', amount: 38000, date: '2024-06-22', remainingAfter: 0 }] },
  { id: 'ct-7', contractNo: 'CT20240007', plotId: 'plot-50', plotPosition: '兰亭园-1排2号', buyerName: '黄志强', buyerPhone: '13300133007', buyerIdCard: '110101196807077890', price: 128000, paymentMethod: 'installment', paidAmount: 64000, status: 'signed', signingDate: '2024-07-14', paymentPlan: [{ id: 'pp-7-1', dueDate: '2024-07-14', amount: 64000, status: 'paid', paidDate: '2024-07-14', paidAmount: 64000 }, { id: 'pp-7-2', dueDate: '2025-07-14', amount: 64000, status: 'unpaid' }], paymentHistory: [{ id: 'cp-7', amount: 64000, date: '2024-07-14', remainingAfter: 64000 }] },
  { id: 'ct-8', contractNo: 'CT20240008', plotId: 'plot-85', plotPosition: '竹韵园-1排1号', buyerName: '周秀英', buyerPhone: '13200132008', buyerIdCard: '110101197108088901', price: 68000, paymentMethod: 'full', paidAmount: 68000, status: 'completed', signingDate: '2024-08-30', paymentPlan: [], paymentHistory: [{ id: 'cp-8', amount: 68000, date: '2024-08-30', remainingAfter: 0 }] },
]

export const burialRecords: BurialRecord[] = [
  { id: 'br-1', plotId: 'plot-1', plotPosition: '松柏园-1排1号', deceasedName: '张老先生', deceasedIdCard: '110101193501011111', deathDate: '2025-01-05', burialDate: '2025-01-20', burialTimeSlot: '08:00-10:00', status: 'completed', inscription: { content: '张公讳德厚之墓\n生于一九三五年\n卒于二〇二五年', fontStyle: 'traditional', status: 'engraved' } },
  { id: 'br-2', plotId: 'plot-9', plotPosition: '梅花园-1排1号', deceasedName: '王老夫人', deceasedIdCard: '110101194003032222', deathDate: '2025-02-18', burialDate: '2025-03-05', burialTimeSlot: '10:00-12:00', status: 'completed', inscription: { content: '王母李氏秀兰之墓\n生于一九四〇年\n卒于二〇二五年', fontStyle: 'regular', status: 'engraved' } },
  { id: 'br-3', plotId: 'plot-49', plotPosition: '兰亭园-1排1号', deceasedName: '陈老先生', deathDate: '2025-04-10', burialDate: '2025-06-18', burialTimeSlot: '08:00-10:00', status: 'scheduled', inscription: { content: '陈公讳世昌之墓\n生于一九三二年\n卒于二〇二五年', fontStyle: 'bold', specialRequests: '请使用繁体字刻制', status: 'confirmed' } },
  { id: 'br-4', plotId: 'plot-10', plotPosition: '梅花园-1排2号', deceasedName: '刘老先生', deathDate: '2025-05-22', burialDate: '2025-06-20', burialTimeSlot: '14:00-16:00', status: 'preparing', inscription: { content: '刘公讳国栋之墓\n生于一九四五年\n卒于二〇二五年', fontStyle: 'regular', status: 'pending' } },
  { id: 'br-5', plotId: 'plot-85', plotPosition: '竹韵园-1排1号', deceasedName: '周老夫人', deathDate: '2025-06-01', burialDate: '2025-06-25', burialTimeSlot: '10:00-12:00', status: 'scheduled', inscription: { content: '周母吴氏玉兰之墓', fontStyle: 'traditional', status: 'pending' } },
]

export const sacrificeBookings: SacrificeBooking[] = [
  { id: 'sb-1', plotId: 'plot-1', plotPosition: '松柏园-1排1号', visitorName: '张明远', visitorPhone: '13800138001', visitDate: '2025-06-18', timeSlot: '08:00-10:00', visitorCount: 4, type: 'self', status: 'confirmed' },
  { id: 'sb-2', plotId: 'plot-9', plotPosition: '梅花园-1排1号', visitorName: '王建国', visitorPhone: '13700137003', visitDate: '2025-06-18', timeSlot: '10:00-12:00', visitorCount: 3, type: 'self', status: 'confirmed' },
  { id: 'sb-3', plotId: 'plot-49', plotPosition: '兰亭园-1排1号', visitorName: '陈世杰', visitorPhone: '13600136004', visitDate: '2025-06-19', timeSlot: '08:00-10:00', visitorCount: 2, type: 'proxy', proxyService: { serviceType: 'standard', flowerRequired: true, incenseRequired: true, specialRequests: '请摆放白色菊花' }, status: 'pending' },
  { id: 'sb-4', plotId: 'plot-2', plotPosition: '松柏园-1排2号', visitorName: '李文华', visitorPhone: '13900139002', visitDate: '2025-06-20', timeSlot: '14:00-16:00', visitorCount: 5, type: 'self', status: 'pending' },
  { id: 'sb-5', plotId: 'plot-50', plotPosition: '兰亭园-1排2号', visitorName: '黄志强', visitorPhone: '13300133007', visitDate: '2025-06-20', timeSlot: '10:00-12:00', visitorCount: 1, type: 'proxy', proxyService: { serviceType: 'premium', flowerRequired: true, incenseRequired: true, specialRequests: '全套祭扫服务，录像反馈' }, status: 'pending' },
  { id: 'sb-6', plotId: 'plot-85', plotPosition: '竹韵园-1排1号', visitorName: '周秀英', visitorPhone: '13200132008', visitDate: '2025-04-04', timeSlot: '08:00-10:00', visitorCount: 6, type: 'self', status: 'completed' },
  { id: 'sb-7', plotId: 'plot-3', plotPosition: '松柏园-1排3号', visitorName: '赵德华', visitorPhone: '13500135005', visitDate: '2025-04-04', timeSlot: '10:00-12:00', visitorCount: 1, type: 'proxy', proxyService: { serviceType: 'basic', flowerRequired: true, incenseRequired: false }, status: 'completed' },
]

export const maintenanceTasks: MaintenanceTask[] = [
  { id: 'mt-1', areaId: 'area-1', areaName: '松柏园', type: 'greening', scheduledDate: '2025-06-18', assignee: '李园丁', status: 'in_progress', description: '松柏园绿化修剪及草坪养护' },
  { id: 'mt-2', areaId: 'area-2', areaName: '梅花园', type: 'cleaning', scheduledDate: '2025-06-19', assignee: '王保洁', status: 'pending', description: '梅花园墓碑清洁及道路清扫' },
  { id: 'mt-3', areaId: 'area-3', areaName: '兰亭园', type: 'repair', scheduledDate: '2025-06-20', assignee: '张师傅', status: 'pending', description: '兰亭园3排2号墓碑底座维修' },
  { id: 'mt-4', areaId: 'area-4', areaName: '竹韵园', type: 'inspection', scheduledDate: '2025-06-21', assignee: '刘主管', status: 'pending', description: '竹韵园全园安全巡查' },
  { id: 'mt-5', areaId: 'area-5', areaName: '菊花园', type: 'greening', scheduledDate: '2025-06-22', assignee: '李园丁', status: 'pending', description: '菊花园花卉更换及绿化养护' },
  { id: 'mt-6', areaId: 'area-1', areaName: '松柏园', type: 'greening', scheduledDate: '2025-06-10', assignee: '李园丁', status: 'completed', description: '松柏园春季绿化养护', completedDate: '2025-06-10' },
  { id: 'mt-7', areaId: 'area-2', areaName: '梅花园', type: 'cleaning', scheduledDate: '2025-06-11', assignee: '王保洁', status: 'completed', description: '梅花园清明后大扫除', completedDate: '2025-06-11' },
]

export const customerRecords: CustomerRecord[] = [
  {
    id: 'cr-1', buyerName: '张明远', buyerPhone: '13800138001', plotId: 'plot-1', plotPosition: '松柏园-1排1号', contractNo: 'CT20240001',
    lastVisitDate: '2025-06-18', nextFollowUpDate: '2025-07-18',
    followUpRecords: [
      { id: 'fr-1', date: '2025-01-15', type: 'visit', content: '购墓签约，家属满意', satisfaction: 5 },
      { id: 'fr-2', date: '2025-04-04', type: 'phone', content: '清明节祭扫回访，服务满意', satisfaction: 4 },
    ],
  },
  {
    id: 'cr-2', buyerName: '李文华', buyerPhone: '13900139002', plotId: 'plot-2', plotPosition: '松柏园-1排2号', contractNo: 'CT20240002',
    nextFollowUpDate: '2025-06-25',
    followUpRecords: [
      { id: 'fr-3', date: '2025-02-20', type: 'visit', content: '购墓签约，分期付款', satisfaction: 4 },
    ],
  },
  {
    id: 'cr-3', buyerName: '王建国', buyerPhone: '13700137003', plotId: 'plot-9', plotPosition: '梅花园-1排1号', contractNo: 'CT20240003',
    lastVisitDate: '2025-06-18',
    followUpRecords: [
      { id: 'fr-4', date: '2025-03-10', type: 'wechat', content: '安葬完成，家属反馈良好', satisfaction: 5 },
    ],
  },
  {
    id: 'cr-4', buyerName: '陈世杰', buyerPhone: '13600136004', plotId: 'plot-49', plotPosition: '兰亭园-1排1号', contractNo: 'CT20240004',
    nextFollowUpDate: '2025-06-20',
    followUpRecords: [
      { id: 'fr-5', date: '2025-04-05', type: 'visit', content: '家族墓签约，客户要求高标准服务', satisfaction: 5 },
    ],
    relocationRequest: { type: 'relocate_in', fromPlot: '旧墓位置A区', toPlot: '兰亭园-1排1号', reason: '家族合葬需要', status: 'completed', fee: 5000, requestDate: '2024-03-20', completedDate: '2024-04-05', remark: '家属要求加急处理' },
  },
  {
    id: 'cr-5', buyerName: '赵德华', buyerPhone: '13500135005', plotId: 'plot-3', plotPosition: '松柏园-1排3号', contractNo: 'CT20240005',
    nextFollowUpDate: '2025-06-30',
    followUpRecords: [
      { id: 'fr-6', date: '2025-05-18', type: 'phone', content: '分期付款催缴', satisfaction: 3 },
    ],
  },
]

export const feeRecords: FeeRecord[] = [
  { id: 'fee-1', plotId: 'plot-1', plotPosition: '松柏园-1排1号', contractNo: 'CT20240001', buyerName: '张明远', feeType: 'management', amount: 1200, dueDate: '2025-07-15', paidAmount: 0, status: 'unpaid', reminderSent: false, paymentHistory: [] },
  { id: 'fee-2', plotId: 'plot-2', plotPosition: '松柏园-1排2号', contractNo: 'CT20240002', buyerName: '李文华', feeType: 'management', amount: 1200, dueDate: '2025-06-20', paidAmount: 0, status: 'overdue', reminderSent: true, paymentHistory: [] },
  { id: 'fee-3', plotId: 'plot-9', plotPosition: '梅花园-1排1号', contractNo: 'CT20240003', buyerName: '王建国', feeType: 'management', amount: 800, dueDate: '2025-08-10', paidAmount: 800, status: 'paid', paidDate: '2025-06-01', reminderSent: true, paymentHistory: [{ id: 'ph-3', amount: 800, date: '2025-06-01', remainingAfter: 0 }] },
  { id: 'fee-4', plotId: 'plot-49', plotPosition: '兰亭园-1排1号', contractNo: 'CT20240004', buyerName: '陈世杰', feeType: 'management', amount: 2400, dueDate: '2025-07-05', paidAmount: 0, status: 'unpaid', reminderSent: false, paymentHistory: [] },
  { id: 'fee-5', plotId: 'plot-3', plotPosition: '松柏园-1排3号', contractNo: 'CT20240005', buyerName: '赵德华', feeType: 'management', amount: 1200, dueDate: '2025-06-30', paidAmount: 600, status: 'partial', reminderSent: true, paymentHistory: [{ id: 'ph-5', amount: 600, date: '2025-06-05', remainingAfter: 600 }] },
  { id: 'fee-6', plotId: 'plot-50', plotPosition: '兰亭园-1排2号', contractNo: 'CT20240007', buyerName: '黄志强', feeType: 'management', amount: 2400, dueDate: '2025-07-14', paidAmount: 0, status: 'unpaid', reminderSent: false, paymentHistory: [] },
  { id: 'fee-7', plotId: 'plot-85', plotPosition: '竹韵园-1排1号', contractNo: 'CT20240008', buyerName: '周秀英', feeType: 'management', amount: 1200, dueDate: '2025-08-30', paidAmount: 1200, status: 'paid', paidDate: '2025-06-10', reminderSent: true, paymentHistory: [{ id: 'ph-7', amount: 1200, date: '2025-06-10', remainingAfter: 0 }] },
  { id: 'fee-8', plotId: 'plot-1', plotPosition: '松柏园-1排1号', contractNo: 'CT20240001', buyerName: '张明远', feeType: 'burial', amount: 3000, dueDate: '2025-01-20', paidAmount: 3000, status: 'paid', paidDate: '2025-01-18', reminderSent: false, paymentHistory: [{ id: 'ph-8', amount: 3000, date: '2025-01-18', remainingAfter: 0 }] },
  { id: 'fee-9', plotId: 'plot-9', plotPosition: '梅花园-1排1号', contractNo: 'CT20240003', buyerName: '王建国', feeType: 'inscription', amount: 1500, dueDate: '2025-02-28', paidAmount: 1500, status: 'paid', paidDate: '2025-02-25', reminderSent: false, paymentHistory: [{ id: 'ph-9', amount: 1500, date: '2025-02-25', remainingAfter: 0 }] },
  { id: 'fee-10', plotId: 'plot-49', plotPosition: '兰亭园-1排1号', contractNo: 'CT20240004', buyerName: '陈世杰', feeType: 'relocation', amount: 5000, dueDate: '2025-04-05', paidAmount: 5000, status: 'paid', paidDate: '2025-04-03', reminderSent: false, paymentHistory: [{ id: 'ph-10', amount: 5000, date: '2025-04-03', remainingAfter: 0 }] },
]
