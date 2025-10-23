'use client'

import { useState, useEffect } from 'react'

export default function SuccessPage() {
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 从 URL 参数或 localStorage 获取票券信息
    const urlParams = new URLSearchParams(window.location.search)
    const sessionId = urlParams.get('session_id')
    
    if (sessionId) {
      // 模拟从服务器获取票券信息
      const mockTicket = {
        id: `ticket_${Date.now()}`,
        eventName: 'Ridiculous Chicken Night Event',
        ticketType: sessionId.includes('28E4gz5Osd7qgCq0nh4Rq01') ? 'Regular Ticket (21+)' : 'Special Ticket (18-20)',
        price: sessionId.includes('28E4gz5Osd7qgCq0nh4Rq01') ? '15.00' : '30.00',
        purchaseDate: new Date().toLocaleDateString('en-US'),
        status: 'valid',
        sessionId: sessionId
      }
      
      setTicket(mockTicket)
      
      // 保存到 localStorage 以便在账户页面显示
      const existingTickets = JSON.parse(localStorage.getItem('userTickets') || '[]')
      existingTickets.push(mockTicket)
      localStorage.setItem('userTickets', JSON.stringify(existingTickets))
    }
    
    setLoading(false)
  }, [])

  const generateQRCode = (ticket) => {
    const qrData = {
      ticketId: ticket.id,
      eventName: ticket.eventName,
      ticketType: ticket.ticketType,
      purchaseDate: ticket.purchaseDate,
      price: ticket.price
    }
    return JSON.stringify(qrData)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Payment Not Found</h1>
          <p className="text-gray-600 mb-6">We couldn't find your payment information.</p>
          <a
            href="/events"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Browse Events
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600">Your ticket has been generated and saved to your account.</p>
        </div>

        {/* Ticket Display */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-8">
          <div className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">{ticket.eventName}</h2>
                <p className="text-gray-500">{ticket.ticketType}</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-medium border bg-green-100 text-green-800 border-green-200">
                Valid
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-2 text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <span className="text-sm">${ticket.price}</span>
              </div>
              
              <div className="flex items-center gap-2 text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm">{ticket.purchaseDate}</span>
              </div>
            </div>

            {/* QR Code Display */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Entry QR Code</h3>
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <div className="w-48 h-48 bg-white rounded-lg border-2 border-gray-200 mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-32 h-32 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-500 font-mono break-all bg-white p-2 rounded border">
                  {generateQRCode(ticket)}
                </p>
                <p className="text-sm text-gray-600 mt-2">Show this QR code at the event entrance</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <a
                href="/account"
                className="bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors text-center"
              >
                View All Tickets
              </a>
              <button className="bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                Download PDF
              </button>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-medium text-blue-900 mb-2">Important Information</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Your ticket has been saved to your account</li>
            <li>• Bring a valid ID to the event for age verification</li>
            <li>• The QR code is valid for entry at Shanghai Concert Hall</li>
            <li>• Event date: October 25, 2025 at 8:00 PM</li>
          </ul>
        </div>

        {/* Navigation */}
        <div className="text-center">
          <a
            href="/events"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Events
          </a>
        </div>
      </div>
    </div>
  )
}