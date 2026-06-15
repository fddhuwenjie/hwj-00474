import { useEffect, useState } from 'react'
import {
  Clock,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  LogIn,
  LogOut,
  Search,
  FileText,
  User,
  Building2,
  Send,
  ThumbsUp,
  ThumbsDown,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  attendanceApi,
  basicApi,
  type AttendanceRecord,
  type MakeupRequest,
  type Employee,
  type Department,
} from '@/lib/api'

const CURRENT_EMPLOYEE_ID = 1
const IS_MANAGER = true

type TabType = 'mine' | 'query' | 'makeup'

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  normal: { label: '正常', className: 'bg-green-100 text-green-700 border-green-200' },
  late: { label: '迟到', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  early_leave: { label: '早退', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  absent: { label: '缺勤', className: 'bg-red-100 text-red-700 border-red-200' },
  leave: { label: '请假', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  pending: { label: '待审批', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  approved: { label: '已通过', className: 'bg-green-100 text-green-700 border-green-200' },
  rejected: { label: '已驳回', className: 'bg-red-100 text-red-700 border-red-200' },
}

function getStatusStyle(status: string) {
  return (
    STATUS_MAP[status] || {
      label: status,
      className: 'bg-gray-100 text-gray-600 border-gray-200',
    }
  )
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0]
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('zh-CN', { hour12: false })
}

function extractTime(s: string | null) {
  if (!s) return '-'
  return s.split(' ')[1]?.slice(0, 5) || '-'
}

export default function Attendance() {
  const [activeTab, setActiveTab] = useState<TabType>('mine')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">打卡管理</h1>

        <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
          {(
            [
              { key: 'mine', label: '我的打卡', icon: LogIn },
              { key: 'query', label: '打卡查询', icon: Search },
              { key: 'makeup', label: '补卡申请', icon: FileText },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition',
                activeTab === key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'mine' && <MyCheckIn />}
        {activeTab === 'query' && <AttendanceQuery />}
        {activeTab === 'makeup' && <MakeupApplication />}
      </div>
    </div>
  )
}

function MyCheckIn() {
  const [now, setNow] = useState(new Date())
  const [isFieldWork, setIsFieldWork] = useState(false)
  const [fieldLocation, setFieldLocation] = useState('')
  const [fieldDescription, setFieldDescription] = useState('')
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkingIn, setCheckingIn] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const loadTodayRecord = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await attendanceApi.getRecords({
        employeeId: CURRENT_EMPLOYEE_ID,
        startDate: getTodayDate(),
        endDate: getTodayDate(),
      })
      if (res.success && res.data && res.data.length > 0) {
        setTodayRecord(res.data[0])
      } else {
        setTodayRecord(null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTodayRecord()
  }, [])

  const handleCheckIn = async () => {
    if (isFieldWork && (!fieldLocation.trim() || !fieldDescription.trim())) {
      setError('外勤打卡请填写地点和说明')
      return
    }
    setCheckingIn(true)
    setError('')
    setMessage('')
    try {
      const res = isFieldWork
        ? await attendanceApi.fieldCheckIn({
            employeeId: CURRENT_EMPLOYEE_ID,
            attendanceDate: getTodayDate(),
            fieldLocation: fieldLocation.trim(),
            fieldDescription: fieldDescription.trim(),
          })
        : await attendanceApi.checkIn({
            employeeId: CURRENT_EMPLOYEE_ID,
            attendanceDate: getTodayDate(),
          })
      if (res.success) {
        setMessage('上班打卡成功！')
        await loadTodayRecord()
      } else {
        setError(res.error || '打卡失败')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '打卡失败')
    } finally {
      setCheckingIn(false)
    }
  }

  const handleCheckOut = async () => {
    setCheckingOut(true)
    setError('')
    setMessage('')
    try {
      const res = await attendanceApi.checkOut({
        employeeId: CURRENT_EMPLOYEE_ID,
        attendanceDate: getTodayDate(),
      })
      if (res.success) {
        setMessage('下班打卡成功！')
        await loadTodayRecord()
      } else {
        setError(res.error || '打卡失败')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '打卡失败')
    } finally {
      setCheckingOut(false)
    }
  }

  const weekday = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()]

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-8 text-white shadow-xl">
        <div className="mb-8 text-center">
          <div className="mb-2 text-6xl font-bold tabular-nums tracking-tight">
            {formatTime(now)}
          </div>
          <div className="text-lg opacity-90">
            {now.getFullYear()}年{now.getMonth() + 1}月{now.getDate()}日 星期{weekday}
          </div>
        </div>

        <div className="mb-8 rounded-xl bg-white/10 p-4 backdrop-blur">
          <div className="mb-1 text-sm opacity-80">今日班次</div>
          <div className="text-lg font-semibold">
            {todayRecord?.shiftName
              ? `${todayRecord.shiftName} (${todayRecord.startTime?.slice(0, 5) || '--'} - ${todayRecord.endTime?.slice(0, 5) || '--'})`
              : '暂无排班'}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleCheckIn}
            disabled={checkingIn || !!todayRecord?.checkIn}
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-2xl p-8 text-white shadow-lg transition',
              todayRecord?.checkIn
                ? 'cursor-not-allowed bg-green-300/80'
                : checkingIn
                ? 'bg-green-600/80'
                : 'bg-green-500 hover:bg-green-600 active:scale-[0.98]'
            )}
          >
            {checkingIn ? (
              <Loader2 className="h-10 w-10 animate-spin" />
            ) : (
              <LogIn className="h-10 w-10" />
            )}
            <div className="text-xl font-bold">
              {todayRecord?.checkIn ? '已打卡' : '上班打卡'}
            </div>
            {todayRecord?.checkIn && (
              <div className="text-sm opacity-90">{extractTime(todayRecord.checkIn)}</div>
            )}
          </button>

          <button
            onClick={handleCheckOut}
            disabled={checkingOut || !todayRecord?.checkIn || !!todayRecord?.checkOut}
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-2xl p-8 text-white shadow-lg transition',
              !todayRecord?.checkIn || todayRecord?.checkOut
                ? 'cursor-not-allowed bg-blue-300/80'
                : checkingOut
                ? 'bg-blue-600/80'
                : 'bg-blue-500 hover:bg-blue-600 active:scale-[0.98]'
            )}
          >
            {checkingOut ? (
              <Loader2 className="h-10 w-10 animate-spin" />
            ) : (
              <LogOut className="h-10 w-10" />
            )}
            <div className="text-xl font-bold">
              {todayRecord?.checkOut
                ? '已打卡'
                : !todayRecord?.checkIn
                ? '请先上班打卡'
                : '下班打卡'}
            </div>
            {todayRecord?.checkOut && (
              <div className="text-sm opacity-90">{extractTime(todayRecord.checkOut)}</div>
            )}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-gray-600" />
            <span className="font-medium text-gray-900">外勤打卡</span>
          </div>
          <button
            onClick={() => setIsFieldWork(!isFieldWork)}
            className={cn(
              'relative h-6 w-11 rounded-full transition',
              isFieldWork ? 'bg-indigo-600' : 'bg-gray-300'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition',
                isFieldWork ? 'left-[22px]' : 'left-0.5'
              )}
            />
          </button>
        </div>

        {isFieldWork && (
          <div className="space-y-4 rounded-lg bg-gray-50 p-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">地点</label>
              <input
                type="text"
                value={fieldLocation}
                onChange={(e) => setFieldLocation(e.target.value)}
                placeholder="请输入外勤地点"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">说明</label>
              <textarea
                value={fieldDescription}
                onChange={(e) => setFieldDescription(e.target.value)}
                placeholder="请输入外勤说明"
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <XCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Calendar className="h-5 w-5 text-indigo-600" />
          今日打卡状态
        </h3>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : todayRecord ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatusCard label="上班时间" value={extractTime(todayRecord.checkIn)} />
            <StatusCard
              label="上班状态"
              value={todayRecord.checkIn ? getStatusStyle(todayRecord.checkInStatus || 'normal').label : '-'}
              badgeClass={todayRecord.checkIn ? getStatusStyle(todayRecord.checkInStatus || 'normal').className : undefined}
            />
            <StatusCard label="下班时间" value={extractTime(todayRecord.checkOut)} />
            <StatusCard
              label="下班状态"
              value={todayRecord.checkOut ? getStatusStyle(todayRecord.checkOutStatus || 'normal').label : '-'}
              badgeClass={todayRecord.checkOut ? getStatusStyle(todayRecord.checkOutStatus || 'normal').className : undefined}
            />
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-gray-400" />
            今日暂无打卡记录
          </div>
        )}
        {todayRecord && (
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
            <span className="text-sm text-gray-600">总状态：</span>
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
                getStatusStyle(todayRecord.status).className
              )}
            >
              {getStatusStyle(todayRecord.status).label}
            </span>
            {todayRecord.isFieldWork && (
              <>
                <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                  <MapPin className="h-3 w-3" />
                  外勤
                </span>
                {todayRecord.fieldLocation && (
                  <span className="text-sm text-gray-600">地点：{todayRecord.fieldLocation}</span>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusCard({
  label,
  value,
  badgeClass,
}: {
  label: string
  value: string
  badgeClass?: string
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <div className="mb-1 text-xs text-gray-500">{label}</div>
      {badgeClass ? (
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-medium',
            badgeClass
          )}
        >
          {value}
        </span>
      ) : (
        <div className="text-lg font-semibold text-gray-900 tabular-nums">{value}</div>
      )}
    </div>
  )
}

function AttendanceQuery() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [filters, setFilters] = useState({
    employeeId: '',
    startDate: '',
    endDate: '',
    departmentId: '',
  })
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const init = async () => {
      try {
        const [eRes, dRes] = await Promise.all([
          basicApi.getEmployees(),
          basicApi.getDepartments(),
        ])
        if (eRes.success) setEmployees(eRes.data || [])
        if (dRes.success) setDepartments(dRes.data || [])
      } finally {
        setInitialLoading(false)
      }
    }
    init()
  }, [])

  useEffect(() => {
    loadRecords()
  }, [])

  const loadRecords = async () => {
    setLoading(true)
    setError('')
    try {
      const params: Parameters<typeof attendanceApi.getRecords>[0] = {}
      if (filters.employeeId) params.employeeId = Number(filters.employeeId)
      if (filters.startDate) params.startDate = filters.startDate
      if (filters.endDate) params.endDate = filters.endDate
      if (filters.departmentId) params.departmentId = Number(filters.departmentId)
      const res = await attendanceApi.getRecords(params)
      if (res.success) {
        setRecords(res.data || [])
      } else {
        setError(res.error || '查询失败')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '查询失败')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-gray-700">
              <User className="h-4 w-4" />
              员工
            </label>
            <select
              value={filters.employeeId}
              onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">全部员工</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-gray-700">
              <Calendar className="h-4 w-4" />
              开始日期
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-gray-700">
              <Calendar className="h-4 w-4" />
              结束日期
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-sm font-medium text-gray-700">
              <Building2 className="h-4 w-4" />
              部门
            </label>
            <select
              value={filters.departmentId}
              onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">全部部门</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={loadRecords}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            查询
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <XCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">员工</th>
                <th className="px-4 py-3 font-medium">日期</th>
                <th className="px-4 py-3 font-medium">班次</th>
                <th className="px-4 py-3 font-medium">上班时间/状态</th>
                <th className="px-4 py-3 font-medium">下班时间/状态</th>
                <th className="px-4 py-3 font-medium">外勤</th>
                <th className="px-4 py-3 font-medium">总状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
                    加载中...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <AlertCircle className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                    暂无记录
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{r.employeeName}</div>
                      <div className="text-xs text-gray-500">{r.employeeNo}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{r.attendanceDate}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {r.shiftName ? (
                        <div>
                          <div>{r.shiftName}</div>
                          <div className="text-xs text-gray-500">
                            {r.startTime?.slice(0, 5)}-{r.endTime?.slice(0, 5)}
                          </div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-700 tabular-nums">
                        {extractTime(r.checkIn)}
                      </div>
                      {r.checkIn && (
                        <span
                          className={cn(
                            'mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
                            getStatusStyle(r.checkInStatus || 'normal').className
                          )}
                        >
                          {getStatusStyle(r.checkInStatus || 'normal').label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-700 tabular-nums">
                        {extractTime(r.checkOut)}
                      </div>
                      {r.checkOut && (
                        <span
                          className={cn(
                            'mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
                            getStatusStyle(r.checkOutStatus || 'normal').className
                          )}
                        >
                          {getStatusStyle(r.checkOutStatus || 'normal').label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.isFieldWork ? (
                        <div>
                          <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                            <MapPin className="h-3 w-3" />
                            是
                          </span>
                          {r.fieldLocation && (
                            <div className="mt-1 text-xs text-gray-500">{r.fieldLocation}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">否</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium',
                          getStatusStyle(r.status).className
                        )}
                      >
                        {getStatusStyle(r.status).label}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function MakeupApplication() {
  const [form, setForm] = useState({
    attendanceDate: getTodayDate(),
    makeupType: 'checkin' as 'checkin' | 'checkout',
    makeupTime: '09:00',
    reason: '',
  })
  const [myRequests, setMyRequests] = useState<MakeupRequest[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<MakeupRequest[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [approvingId, setApprovingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const [mine, pending] = await Promise.all([
        attendanceApi.getMakeupRequests({ employeeId: CURRENT_EMPLOYEE_ID }),
        IS_MANAGER ? attendanceApi.getMakeupRequests({ status: 'pending' }) : null,
      ])
      if (mine.success) setMyRequests(mine.data || [])
      if (pending?.success) setPendingApprovals(pending.data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSubmit = async () => {
    if (!form.reason.trim()) {
      setError('请填写补卡原因')
      return
    }
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const res = await attendanceApi.applyMakeup({
        employeeId: CURRENT_EMPLOYEE_ID,
        attendanceDate: form.attendanceDate,
        makeupType: form.makeupType,
        makeupTime: `${form.attendanceDate} ${form.makeupTime}:00`,
        reason: form.reason.trim(),
      })
      if (res.success) {
        setMessage('补卡申请已提交')
        setForm({ attendanceDate: getTodayDate(), makeupType: 'checkin', makeupTime: '09:00', reason: '' })
        await loadData()
      } else {
        setError(res.error || '提交失败')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async (id: number, status: 'approved' | 'rejected') => {
    setApprovingId(id)
    setError('')
    setMessage('')
    try {
      const res = await attendanceApi.approveMakeup({
        requestId: id,
        status,
        approverId: CURRENT_EMPLOYEE_ID,
      })
      if (res.success) {
        setMessage(status === 'approved' ? '已通过' : '已驳回')
        await loadData()
      } else {
        setError(res.error || '操作失败')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败')
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Send className="h-5 w-5 text-indigo-600" />
          申请补卡
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">补卡日期</label>
            <input
              type="date"
              value={form.attendanceDate}
              onChange={(e) => setForm({ ...form, attendanceDate: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">补卡类型</label>
            <select
              value={form.makeupType}
              onChange={(e) =>
                setForm({ ...form, makeupType: e.target.value as 'checkin' | 'checkout' })
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="checkin">上班补卡</option>
              <option value="checkout">下班补卡</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">补卡时间</label>
            <input
              type="time"
              value={form.makeupTime}
              onChange={(e) => setForm({ ...form, makeupTime: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">补卡原因</label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="请详细说明补卡原因..."
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            提交申请
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <XCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <FileText className="h-5 w-5 text-indigo-600" />
            我的补卡申请
          </h3>
        </div>
        <RequestList
          requests={myRequests}
          loading={loading}
          emptyText="暂无补卡申请记录"
          showActions={false}
        />
      </div>

      {IS_MANAGER && (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              待审批补卡申请
            </h3>
          </div>
          <RequestList
            requests={pendingApprovals}
            loading={loading}
            emptyText="暂无待审批申请"
            showActions
            approvingId={approvingId}
            onApprove={handleApprove}
          />
        </div>
      )}
    </div>
  )
}

function RequestList({
  requests,
  loading,
  emptyText,
  showActions,
  approvingId,
  onApprove,
}: {
  requests: MakeupRequest[]
  loading: boolean
  emptyText: string
  showActions: boolean
  approvingId?: number | null
  onApprove?: (id: number, status: 'approved' | 'rejected') => void
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }
  if (requests.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        <AlertCircle className="mx-auto mb-2 h-8 w-8 text-gray-400" />
        {emptyText}
      </div>
    )
  }
  return (
    <div className="divide-y divide-gray-100">
      {requests.map((r) => (
        <div key={r.id} className="px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium text-gray-900">{r.employeeName}</span>
                <span className="text-sm text-gray-500">{r.attendanceDate}</span>
                <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                  {r.makeupType === 'checkin' ? '上班补卡' : '下班补卡'}
                </span>
                <span className="text-sm text-gray-600">补卡时间：{r.makeupTime.slice(0, 16)}</span>
                <span
                  className={cn(
                    'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium',
                    getStatusStyle(r.status).className
                  )}
                >
                  {getStatusStyle(r.status).label}
                </span>
              </div>
              <div className="text-sm text-gray-600">原因：{r.reason}</div>
              {r.approverName && (
                <div className="text-xs text-gray-500">
                  审批人：{r.approverName}
                  {r.approvedAt && ` · ${r.approvedAt.slice(0, 16)}`}
                </div>
              )}
            </div>
            {showActions && r.status === 'pending' && onApprove && (
              <div className="flex gap-2">
                <button
                  onClick={() => onApprove(r.id, 'approved')}
                  disabled={approvingId === r.id}
                  className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-60"
                >
                  {approvingId === r.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ThumbsUp className="h-4 w-4" />
                  )}
                  通过
                </button>
                <button
                  onClick={() => onApprove(r.id, 'rejected')}
                  disabled={approvingId === r.id}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
                >
                  {approvingId === r.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ThumbsDown className="h-4 w-4" />
                  )}
                  驳回
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
