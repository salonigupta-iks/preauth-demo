"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import toast from 'react-hot-toast'

interface DashboardStats {
    total_requests: number
    pending_requests: number
    completed_requests: number
    failed_requests: number
    user_action_required: number
    success_rate: number
}

interface RequestSummary {
    request_id: string
    patient_name: string
    payer_id: string
    status: string
    created_at: string
    last_updated: string
    current_step?: string
    user_actions_pending: number
}

interface UserActionSummary {
    action_id: string
    request_id: string
    patient_name: string
    action_type: string
    action_status: string
    requested_at: string
    metadata?: string
}

// Legacy Session interface for backward compatibility
interface Session {
    id: string
    sessionId: string
    status: 'running' | 'completed' | 'human-interaction-required' | 'paused' | 'failed'
    createdAt: string
    lastActivity: string
    patientName?: string
    providerName?: string
    serviceType?: string
    agentType: 'preauthorization' | 'onboarding' | 'hr-leave' | 'finance' | 'general'
}

export default function HistoryPage() {
    const { data: session } = useSession()
    const [requests, setRequests] = useState<RequestSummary[]>([])
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [userActions, setUserActions] = useState<UserActionSummary[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [connectingSession, setConnectingSession] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [daysFilter, setDaysFilter] = useState<number>(7)
    const toastShownRef = useRef(false)

    // API configuration - adjust this to your backend URL
    const API_BASE_URL = process.env.NEXT_PUBLIC_PLANNER_AGENT_URL || 'http://localhost:8002'

    // Map backend statuses to frontend statuses
    const mapStatus = (backendStatus: string): 'running' | 'completed' | 'human-interaction-required' | 'paused' | 'failed' => {
        switch (backendStatus) {
            case 'IN_PROGRESS':
            case 'PROCESSING':
                return 'running'
            case 'COMPLETED':
                return 'completed'
            case 'USER_ACTION_REQUIRED':
                return 'human-interaction-required'
            case 'PAUSED':
                return 'paused'
            case 'FAILED':
                return 'failed'
            default:
                return 'paused'
        }
    }

    // Fetch dashboard statistics
    const fetchStats = async () => {
        try {
            const backendUrl = process.env.PLANNER_BACKEND_URL || 'http://localhost:8001'
            const response = await fetch(`${backendUrl}/api/dashboard/stats?days=${daysFilter}`)
            if (!response.ok) throw new Error('Failed to fetch stats')
            const data: DashboardStats = await response.json()
            setStats(data)
        } catch (error) {
            console.error('Error fetching stats:', error)
            toast.error('Failed to load dashboard statistics')
        }
    }

    // Fetch recent requests
    const fetchRequests = async () => {
        try {
            const statusParam = statusFilter === 'all' ? '' : `&status=${statusFilter}`
            const userIdParam = session?.user?.id ? `&user_id=${session.user.id}` : ''

            const backendUrl = process.env.PLANNER_BACKEND_URL   || 'http://localhost:8001'
            const response = await fetch(`${backendUrl}/api/dashboard/requests`)
            if (!response.ok) throw new Error('Failed to fetch requests')
            const data: RequestSummary[] = await response.json()
            setRequests(data)
        } catch (error) {
            console.error('Error fetching requests:', error)
            toast.error('Failed to load requests')
        }
    }

    // Fetch pending user actions
    const fetchUserActions = async () => {
        try {
            const backendUrl = process.env.NEXT_PUBLIC_PLANNER_BACKEND_URL || 'http://localhost:8001'
            const userIdParam = session?.user?.id ? `&user_id=${session.user.id}` : ''
            const response = await fetch(`${backendUrl}/api/dashboard/user-actions?limit=10${userIdParam}`)
            if (!response.ok) throw new Error('Failed to fetch user actions')
            const data: UserActionSummary[] = await response.json()
            setUserActions(data)
        } catch (error) {
            console.error('Error fetching user actions:', error)
            toast.error('Failed to load user actions')
        }
    }

    // Load all data
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true)

            await Promise.all([
                fetchStats(),
                fetchRequests(),
                fetchUserActions()
            ])

            setIsLoading(false)

            // Show success message when data is loaded (only once)
            if (!toastShownRef.current) {
                toast.success(`📊 Dashboard data loaded successfully`, {
                    duration: 3000,
                    id: 'dashboard-loaded'
                })
                toastShownRef.current = true
            }
        }

        if (session) {
            loadData()
        }
    }, [session, statusFilter, daysFilter])

    // Mark user action as completed
    const markActionCompleted = async (actionId: string, responseData: any = {}) => {
        try {
            const backendUrl = process.env.NEXT_PUBLIC_PLANNER_BACKEND_URL || 'http://localhost:8001'
            const response = await fetch(`${backendUrl}/api/dashboard/mark-action-completed/${actionId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(responseData),
            })

            if (!response.ok) throw new Error('Failed to mark action as completed')

            toast.success('Action marked as completed')
            await fetchUserActions() // Refresh user actions
            await fetchRequests() // Refresh requests to update counts
        } catch (error) {
            console.error('Error marking action as completed:', error)
            toast.error('Failed to mark action as completed')
        }
    }

    const getStatusColor = (status: string) => {
        const mappedStatus = mapStatus(status)
        switch (mappedStatus) {
            case 'running':
                return 'bg-green-100 text-green-800'
            case 'completed':
                return 'bg-green-100 text-green-800'
            case 'human-interaction-required':
                return 'bg-yellow-100 text-yellow-800'
            case 'paused':
                return 'bg-yellow-100 text-yellow-800'
            case 'failed':
                return 'bg-red-100 text-red-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    const getRowBackgroundColor = (status: string) => {
        const mappedStatus = mapStatus(status)
        switch (mappedStatus) {
            case 'running':
                return 'bg-green-50 hover:bg-green-100'
            case 'completed':
                return 'bg-green-50 hover:bg-green-100'
            case 'human-interaction-required':
                return 'bg-yellow-50 hover:bg-yellow-100'
            case 'paused':
                return 'bg-yellow-50 hover:bg-yellow-100'
            case 'failed':
                return 'bg-red-50 hover:bg-red-100'
            default:
                return 'bg-gray-50 hover:bg-gray-100'
        }
    }

    const getStatusIcon = (status: string) => {
        const mappedStatus = mapStatus(status)
        switch (mappedStatus) {
            case 'running':
                return (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                )
            case 'completed':
                return (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                )
            case 'human-interaction-required':
                return (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-5.5-2.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM10 12a5.99 5.99 0 00-4.793 2.39A6.483 6.483 0 0010 16.5a6.483 6.483 0 004.793-2.11A5.99 5.99 0 0010 12z" clipRule="evenodd" />
                    </svg>
                )
            case 'paused':
                return (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                )
            case 'failed':
                return (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                )
            default:
                return null
        }
    }

    const handleRequestAction = (request: RequestSummary) => {
        const mappedStatus = mapStatus(request.status)

        if (mappedStatus === 'completed') {
            toast.error(`Cannot take action on completed request`)
            return
        }

        if (mappedStatus === 'failed') {
            toast.error(`Cannot take action on failed request`)
            return
        }

        if (mappedStatus === 'human-interaction-required') {
            toast(`⚠️ Request requires human interaction - opening details`, {
                icon: '👨‍💼',
                duration: 4000,
                style: {
                    background: '#FEF3C7',
                    color: '#92400E',
                }
            })
        }

        setConnectingSession(request.request_id)
        toast.loading(`Opening request details for ${request.patient_name}...`, {
            id: `action-${request.request_id}`,
            duration: 2000
        })

        // Simulate opening request details
        setTimeout(() => {
            // In a real application, this would navigate to request details page
            const detailsUrl = `/dashboard/request-details/${request.request_id}`

            try {
                // For now, we'll just show a success message
                // In production, you'd navigate to the details page
                toast.success(`Request details opened for ${request.patient_name}`, {
                    id: `action-${request.request_id}`,
                    duration: 3000
                })
            } catch (_error) {
                toast.error(`Failed to open request details`, {
                    id: `action-${request.request_id}`,
                    duration: 4000
                })
            }

            setConnectingSession(null)
        }, 2000)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString()
    }

    const filteredRequests = requests.filter(request => {
        if (statusFilter === 'all') return true
        return request.status === statusFilter
    })

    const getFilterButtonClass = (filterStatus: string) => {
        const isActive = statusFilter === filterStatus
        const baseClass = "px-4 py-2 text-sm font-medium rounded-md transition-colors"

        if (isActive) {
            switch (filterStatus) {
                case 'all':
                    return `${baseClass} bg-indigo-600 text-white`
                case 'IN_PROGRESS':
                case 'PROCESSING':
                case 'COMPLETED':
                    return `${baseClass} bg-green-600 text-white`
                case 'USER_ACTION_REQUIRED':
                case 'PAUSED':
                    return `${baseClass} bg-yellow-600 text-white`
                case 'FAILED':
                    return `${baseClass} bg-red-600 text-white`
                default:
                    return `${baseClass} bg-gray-600 text-white`
            }
        } else {
            return `${baseClass} bg-white text-gray-700 border border-gray-300 hover:bg-gray-50`
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-600 dark:text-gray-300">Loading sessions...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Preauthorization Dashboard</h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-2">
                        Monitor and manage preauthorization requests across all payers
                    </p>
                </div>
                <div className="flex items-center space-x-4">
                    <select
                        value={daysFilter}
                        onChange={(e) => setDaysFilter(Number(e.target.value))}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                        <option value={7}>Last 7 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={90}>Last 90 days</option>
                    </select>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Total: {requests.length} | Filtered: {filteredRequests.length}
                    </div>
                </div>
            </div>

            {/* Statistics Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-md flex items-center justify-center">
                                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total</p>
                                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    {stats.total_requests}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-md flex items-center justify-center">
                                    <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending</p>
                                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    {stats.pending_requests}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-md flex items-center justify-center">
                                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed</p>
                                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    {stats.completed_requests}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-md flex items-center justify-center">
                                    <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Failed</p>
                                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    {stats.failed_requests}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-md flex items-center justify-center">
                                    <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-5.5-2.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM10 12a5.99 5.99 0 00-4.793 2.39A6.483 6.483 0 0010 16.5a6.483 6.483 0 004.793-2.11A5.99 5.99 0 0010 12z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Action Required</p>
                                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    {stats.user_action_required}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-md flex items-center justify-center">
                                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Success Rate</p>
                                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    {stats.success_rate}%
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Pending User Actions */}
            {userActions.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pending Actions</h3>
                    <div className="space-y-3">
                        {userActions.map((action) => (
                            <div key={action.action_id} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">
                                        {action.action_type} - {action.patient_name}
                                    </p>
                                    <p className="text-sm text-gray-500">Request ID: {action.request_id}</p>
                                    <p className="text-xs text-gray-400">
                                        Requested: {formatDate(action.requested_at)}
                                    </p>
                                </div>
                                <button
                                    onClick={() => markActionCompleted(action.action_id)}
                                    className="px-3 py-1 text-xs font-medium text-white bg-yellow-600 hover:bg-yellow-700 rounded-md transition-colors"
                                >
                                    Mark Complete
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Requests Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Preauthorization Requests
                        </h2>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setStatusFilter('all')}
                                className={getFilterButtonClass('all')}
                            >
                                All ({filteredRequests.length})
                            </button>
                            <button
                                onClick={() => setStatusFilter('IN_PROGRESS')}
                                className={getFilterButtonClass('IN_PROGRESS')}
                            >
                                In Progress ({filteredRequests.filter(req => req.status === 'IN_PROGRESS').length})
                            </button>
                            <button
                                onClick={() => setStatusFilter('COMPLETED')}
                                className={getFilterButtonClass('COMPLETED')}
                            >
                                Completed ({filteredRequests.filter(req => req.status === 'COMPLETED').length})
                            </button>
                            <button
                                onClick={() => setStatusFilter('USER_ACTION_REQUIRED')}
                                className={getFilterButtonClass('USER_ACTION_REQUIRED')}
                            >
                                Action Required ({filteredRequests.filter(req => req.status === 'USER_ACTION_REQUIRED').length})
                            </button>
                            <button
                                onClick={() => setStatusFilter('FAILED')}
                                className={getFilterButtonClass('FAILED')}
                            >
                                Failed ({filteredRequests.filter(req => req.status === 'FAILED').length})
                            </button>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Request ID
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Patient Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Payer ID
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Current Step
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions Pending
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Created
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Last Updated
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center">
                                        <div className="text-gray-500">
                                            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <h3 className="mt-2 text-sm font-medium text-gray-900">No requests found</h3>
                                            <p className="mt-1 text-sm text-gray-500">
                                                {statusFilter === 'all'
                                                    ? 'No preauthorization requests are currently available.'
                                                    : `No requests found with status: ${statusFilter}`}
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map((request) => (
                                    <tr key={request.request_id} className={`${getRowBackgroundColor(request.status)}`}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-mono text-gray-900">
                                                {request.request_id}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {request.patient_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {request.payer_id}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                                {getStatusIcon(request.status)}
                                                <span className="ml-1">
                                                    {request.status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                                                </span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {request.current_step || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {request.user_actions_pending > 0 ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                    {request.user_actions_pending} pending
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">None</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(request.created_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(request.last_updated)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => handleRequestAction(request)}
                                                disabled={connectingSession === request.request_id}
                                                className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md ${mapStatus(request.status) === 'running' || mapStatus(request.status) === 'paused' || mapStatus(request.status) === 'human-interaction-required'
                                                    ? 'text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                                                    : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                                                    } disabled:opacity-50 transition-colors`}
                                            >
                                                {connectingSession === request.request_id ? (
                                                    <>
                                                        <svg className="w-4 h-4 mr-2 animate-spin" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                        </svg>
                                                        Opening...
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                                                        </svg>
                                                        View Details
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                )))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
