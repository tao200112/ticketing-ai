'use client'

import { useState } from 'react'

export default function EventCreationForm({ 
  onSubmit, 
  onCancel, 
  initialData = null, 
  isEditing = false,
  merchantId = null 
}) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    startDate: initialData?.start_date ? initialData.start_date.split('T')[0] : '',
    endDate: initialData?.end_date ? initialData.end_date.split('T')[0] : '',
    startTime: initialData?.start_time || '',
    endTime: initialData?.end_time || '',
    location: initialData?.location || '',
    maxAttendees: initialData?.max_attendees || '',
    ticketTypes: initialData?.ticket_types || [
      { name: 'General Admission', amount_cents: '', inventory: '', limit_per_user: '' }
    ]
  })

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const handleTicketTypeChange = (index, field, value) => {
    const newTicketTypes = [...formData.ticketTypes]
    newTicketTypes[index] = {
      ...newTicketTypes[index],
      [field]: value
    }
    setFormData(prev => ({
      ...prev,
      ticketTypes: newTicketTypes
    }))
  }

  const addTicketType = () => {
    setFormData(prev => ({
      ...prev,
      ticketTypes: [...prev.ticketTypes, { name: '', amount_cents: '', inventory: '', limit_per_user: '' }]
    }))
  }

  const removeTicketType = (index) => {
    if (formData.ticketTypes.length > 1) {
      setFormData(prev => ({
        ...prev,
        ticketTypes: prev.ticketTypes.filter((_, i) => i !== index)
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.title) newErrors.title = 'Event title is required'
    if (!formData.description) newErrors.description = 'Event description is required'
    if (!formData.startDate) newErrors.startDate = 'Start date is required'
    if (!formData.endDate) newErrors.endDate = 'End date is required'
    if (!formData.location) newErrors.location = 'Location is required'

    // Validate ticket types
    formData.ticketTypes.forEach((ticket, index) => {
      if (!ticket.name) newErrors[`ticket_${index}_name`] = 'Ticket name is required'
      if (!ticket.amount_cents || isNaN(ticket.amount_cents)) {
        newErrors[`ticket_${index}_amount`] = 'Valid price is required'
      }
      if (!ticket.inventory || isNaN(ticket.inventory)) {
        newErrors[`ticket_${index}_inventory`] = 'Valid inventory is required'
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const eventData = {
        ...formData,
        merchantId: merchantId,
        ticketTypes: formData.ticketTypes.filter(ticket => ticket.name && ticket.amount_cents)
      }

      await onSubmit(eventData)
    } catch (error) {
      console.error('Event submission error:', error)
      setErrors({ general: 'Failed to save event. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      borderRadius: '20px',
      padding: '30px',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      maxWidth: '600px',
      width: '100%',
      margin: '0 auto'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          color: 'white', 
          marginBottom: '8px' 
        }}>
          {isEditing ? 'Edit Event' : 'Create New Event'}
        </h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '16px' }}>
          {isEditing ? 'Update your event details' : 'Fill in the details for your new event'}
        </p>
      </div>

      {errors.general && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '20px',
          color: '#fca5a5',
          fontSize: '14px'
        }}>
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ color: 'white', fontSize: '18px', marginBottom: '16px' }}>Basic Information</h3>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: 'white', marginBottom: '8px', fontWeight: '500' }}>
              Event Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontSize: '16px',
                outline: 'none'
              }}
              placeholder="Enter event title"
            />
            {errors.title && <div style={{ color: '#fca5a5', fontSize: '14px', marginTop: '4px' }}>{errors.title}</div>}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: 'white', marginBottom: '8px', fontWeight: '500' }}>
              Description *
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={3}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontSize: '16px',
                outline: 'none',
                resize: 'vertical'
              }}
              placeholder="Describe your event"
            />
            {errors.description && <div style={{ color: '#fca5a5', fontSize: '14px', marginTop: '4px' }}>{errors.description}</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', color: 'white', marginBottom: '8px', fontWeight: '500' }}>
                Start Date *
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
              {errors.startDate && <div style={{ color: '#fca5a5', fontSize: '14px', marginTop: '4px' }}>{errors.startDate}</div>}
            </div>

            <div>
              <label style={{ display: 'block', color: 'white', marginBottom: '8px', fontWeight: '500' }}>
                End Date *
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
              {errors.endDate && <div style={{ color: '#fca5a5', fontSize: '14px', marginTop: '4px' }}>{errors.endDate}</div>}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: 'white', marginBottom: '8px', fontWeight: '500' }}>
              Location *
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontSize: '16px',
                outline: 'none'
              }}
              placeholder="Event location"
            />
            {errors.location && <div style={{ color: '#fca5a5', fontSize: '14px', marginTop: '4px' }}>{errors.location}</div>}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: 'white', marginBottom: '8px', fontWeight: '500' }}>
              Max Attendees
            </label>
            <input
              type="number"
              name="maxAttendees"
              value={formData.maxAttendees}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontSize: '16px',
                outline: 'none'
              }}
              placeholder="Leave empty for unlimited"
            />
          </div>
        </div>

        {/* Ticket Types */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ color: 'white', fontSize: '18px', marginBottom: '16px' }}>Ticket Types</h3>
          
          {formData.ticketTypes.map((ticket, index) => (
            <div key={index} style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ color: 'white', fontSize: '16px', margin: 0 }}>Ticket Type {index + 1}</h4>
                {formData.ticketTypes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTicketType(index)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#fca5a5',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', color: 'white', marginBottom: '4px', fontSize: '14px' }}>
                    Name *
                  </label>
                  <input
                    type="text"
                    value={ticket.name}
                    onChange={(e) => handleTicketTypeChange(index, 'name', e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                    placeholder="e.g., General Admission"
                  />
                  {errors[`ticket_${index}_name`] && (
                    <div style={{ color: '#fca5a5', fontSize: '12px', marginTop: '2px' }}>
                      {errors[`ticket_${index}_name`]}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', color: 'white', marginBottom: '4px', fontSize: '14px' }}>
                    Price (cents) *
                  </label>
                  <input
                    type="number"
                    value={ticket.amount_cents}
                    onChange={(e) => handleTicketTypeChange(index, 'amount_cents', e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                    placeholder="e.g., 5000 for $50"
                  />
                  {errors[`ticket_${index}_amount`] && (
                    <div style={{ color: '#fca5a5', fontSize: '12px', marginTop: '2px' }}>
                      {errors[`ticket_${index}_amount`]}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', color: 'white', marginBottom: '4px', fontSize: '14px' }}>
                    Inventory *
                  </label>
                  <input
                    type="number"
                    value={ticket.inventory}
                    onChange={(e) => handleTicketTypeChange(index, 'inventory', e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                    placeholder="Available tickets"
                  />
                  {errors[`ticket_${index}_inventory`] && (
                    <div style={{ color: '#fca5a5', fontSize: '12px', marginTop: '2px' }}>
                      {errors[`ticket_${index}_inventory`]}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', color: 'white', marginBottom: '4px', fontSize: '14px' }}>
                    Limit per User
                  </label>
                  <input
                    type="number"
                    value={ticket.limit_per_user}
                    onChange={(e) => handleTicketTypeChange(index, 'limit_per_user', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                    placeholder="Max per user"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addTicketType}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              padding: '10px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              width: '100%'
            }}
          >
            + Add Another Ticket Type
          </button>
        </div>

        {/* Submit Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              background: isSubmitting 
                ? 'rgba(255, 255, 255, 0.3)' 
                : 'linear-gradient(135deg, #7C3AED 0%, #22D3EE 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {isSubmitting ? 'Saving...' : (isEditing ? 'Update Event' : 'Create Event')}
          </button>
        </div>
      </form>
    </div>
  )
}
