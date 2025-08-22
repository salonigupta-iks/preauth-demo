import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    try {
        const { message } = await request.json()

        if (!message || typeof message !== 'string') {
            return NextResponse.json(
                { error: 'Message is required and must be a string' },
                { status: 400 }
            )
        }

        // Call external intent detection API
        const response = await fetch('http://planner-agent:8002/detect_intent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                query: message,
                user_id: "user-123" // Default user ID for now
            }),
        })
        console.log(response)

        if (!response.ok) {
            console.error(`External API error: ${response.status}`)
            return NextResponse.json({
                status: "error",
                message: "Failed to process intent detection. Please try again.",
                Intent: null,
                patient_id: null,
                payer: null,
                data: null
            })
        }

        const data = await response.json()

        // Return the response from the external API
        return NextResponse.json(data)

    } catch (error) {
        console.error('Intent detection API error:', error)
        return NextResponse.json({
            status: "error",
            message: "An error occurred while processing your request. Please try again.",
            Intent: null,
            patient_id: null,
            payer: null,
            data: null
        })
    }
}
