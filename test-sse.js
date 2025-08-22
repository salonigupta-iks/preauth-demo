const { EventSource } = require('eventsource');
const fetch = require('node-fetch').default;

console.log('Testing SSE connection to planner-agent...');
console.log('Connecting to: http://localhost:8002/events');

try {
    const eventSource = new EventSource('http://localhost:8002/events');
    
    eventSource.onopen = function(event) {
        console.log('✅ SSE connection opened');
        console.log('Event:', event);
    };
    
    eventSource.onmessage = function(event) {
        console.log('📨 Message received:', event.data);
        try {
            const data = JSON.parse(event.data);
            console.log('📨 Parsed data:', data);
        } catch (e) {
            console.log('⚠️ Failed to parse as JSON:', e.message);
        }
    };
    
    eventSource.onerror = function(event) {
        console.log('❌ SSE error:', event);
        if (eventSource.readyState === EventSource.CLOSED) {
            console.log('Connection closed');
            process.exit(1);
        }
    };
    
    // Test sending a message after connection
    setTimeout(() => {
        console.log('📤 Sending test message...');
        
        fetch('http://localhost:8002/send-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: 'Test from Node.js',
                type: 'test'
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('✅ Message sent:', data);
        })
        .catch(error => {
            console.log('❌ Send error:', error.message);
        });
    }, 2000);
    
    // Keep the script running
    setTimeout(() => {
        console.log('Test completed');
        eventSource.close();
        process.exit(0);
    }, 10000);
    
} catch (error) {
    console.log('❌ Failed to create EventSource:', error.message);
    process.exit(1);
}
