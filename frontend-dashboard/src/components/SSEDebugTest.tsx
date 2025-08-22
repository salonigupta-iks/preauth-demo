'use client';

import { useState, useEffect } from 'react';

const SSEDebugTest = () => {
    const [status, setStatus] = useState('disconnected');
    const [logs, setLogs] = useState<string[]>([]);
    const [eventSource, setEventSource] = useState<EventSource | null>(null);

    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] ${message}`;
        setLogs(prev => [...prev, logMessage]);
        console.log(logMessage);
    };

    const connectSSE = () => {
        if (eventSource) {
            addLog('Already connected or connecting...');
            return;
        }

        setStatus('connecting');
        addLog('Attempting to connect to http://localhost:8002/events');

        try {
            const es = new EventSource('http://localhost:8002/events');
            setEventSource(es);

            es.onopen = (event) => {
                setStatus('connected');
                addLog('✅ SSE connection opened successfully');
                addLog(`Event type: ${event.type}`);
            };

            es.onmessage = (event) => {
                addLog(`📨 Default message received: ${event.data}`);
                try {
                    const data = JSON.parse(event.data);
                    addLog(`📨 Parsed data: ${JSON.stringify(data, null, 2)}`);
                } catch (e) {
                    addLog(`⚠️ Failed to parse message as JSON: ${(e as Error).message}`);
                }
            };

            es.onerror = (event) => {
                setStatus('error');
                addLog('❌ SSE connection error occurred');
                addLog(`ReadyState: ${es.readyState}`);
                
                if (es.readyState === EventSource.CLOSED) {
                    addLog('Connection was closed');
                    setEventSource(null);
                    setStatus('disconnected');
                }
            };

            // Test listening for a specific user event
            es.addEventListener('test_user', (event) => {
                addLog(`👤 User-specific event received: ${event.data}`);
            });

        } catch (error) {
            setStatus('error');
            addLog(`❌ Failed to create EventSource: ${(error as Error).message}`);
            setEventSource(null);
        }
    };

    const disconnectSSE = () => {
        if (eventSource) {
            eventSource.close();
            setEventSource(null);
            setStatus('disconnected');
            addLog('🔌 SSE connection closed');
        }
    };

    const sendTestMessage = async () => {
        addLog('📤 Sending test message to planner-agent...');

        try {
            const response = await fetch('http://localhost:8002/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: 'Test message from frontend',
                    type: 'test'
                })
            });

            if (response.ok) {
                const data = await response.json();
                addLog(`✅ Message sent successfully: ${JSON.stringify(data, null, 2)}`);
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            addLog(`❌ Failed to send message: ${(error as Error).message}`);
        }
    };

    const clearLogs = () => {
        setLogs([]);
    };

    const getStatusColor = () => {
        switch (status) {
            case 'connected': return 'text-green-600 bg-green-100';
            case 'connecting': return 'text-yellow-600 bg-yellow-100';
            case 'error': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    useEffect(() => {
        addLog('🔄 Component loaded. Click Connect to test SSE connection.');
        addLog('Testing connection to planner-agent at http://localhost:8002');
        
        return () => {
            if (eventSource) {
                eventSource.close();
            }
        };
    }, []);

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">SSE Connection Test for Planner Agent</h1>
            
            <div className={`p-3 rounded mb-4 ${getStatusColor()}`}>
                Status: {status.charAt(0).toUpperCase() + status.slice(1)}
            </div>
            
            <div className="space-x-2 mb-4">
                <button 
                    onClick={connectSSE}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Connect
                </button>
                <button 
                    onClick={disconnectSSE}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                    Disconnect
                </button>
                <button 
                    onClick={sendTestMessage}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                    Send Test Message
                </button>
                <button 
                    onClick={clearLogs}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                    Clear Logs
                </button>
            </div>
            
            <h3 className="text-lg font-semibold mb-2">Event Logs:</h3>
            <div className="bg-gray-50 border border-gray-300 rounded p-4 h-96 overflow-y-auto">
                {logs.map((log, index) => (
                    <div key={index} className="text-sm font-mono mb-1">
                        {log}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SSEDebugTest;
