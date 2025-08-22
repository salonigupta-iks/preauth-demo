"use client"

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import ChatInput from '@/components/chat/ChatInput'

export default function Dashboard() {
    const { data: session } = useSession()
    const [isLoading, setIsLoading] = useState(false)

    const handleMainSubmit = async (message: string) => {
        // This is called by ChatInput, but ChatInput handles its own API calls
        // We just need to track loading state if needed
        console.log('Dashboard received message:', message)
    }

    return (
        <div className="h-full p-4 space-y-4">
            <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                <p className="text-gray-600 dark:text-gray-400">Welcome back, {session?.user?.name || session?.user?.email}</p>
            </div>

            <div className="flex-1">
                <ChatInput onSubmit={handleMainSubmit} isLoading={isLoading} />
            </div>
        </div>
    )
}
