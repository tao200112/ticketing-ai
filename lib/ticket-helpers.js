/**
 * Helper functions for ticket operations
 */

/**
 * Determine ticket_kind from price name
 * @param {string} priceName - The name of the price/tier
 * @returns {string|null} - ticket_kind value or null if not recognized
 */
export function getTicketKindFromPriceName(priceName) {
  if (!priceName) return null
  
  const name = priceName.toLowerCase().trim()
  
  // Entry tickets
  if (name.includes('entry') && (name.includes('18') || name.includes('18-20'))) {
    return 'entry_18_20'
  }
  if (name.includes('entry') && (name.includes('21') || name.includes('21+'))) {
    return 'entry_21_plus'
  }
  
  // Queue pass
  if (name.includes('queue') || name.includes('skip') || name.includes('fast')) {
    return 'queue'
  }
  
  // Drink ticket
  if (name.includes('drink') || name.includes('beverage') || name.includes('bar')) {
    return 'drink'
  }
  
  // Default to entry_21_plus if it's a general entry ticket
  if (name.includes('entry') || name.includes('admission') || name.includes('ticket')) {
    return 'entry_21_plus'
  }
  
  return null
}

/**
 * Check if a price is a combo ticket (should generate multiple tickets)
 * @param {string} priceName - The name of the price/tier
 * @param {string} ticketKind - Optional ticket_kind value
 * @returns {boolean} - true if it's a combo ticket
 */
export function isComboTicket(priceName, ticketKind = null) {
  // First check ticket_kind if provided
  if (ticketKind === 'combo') {
    return true
  }
  
  if (!priceName) return false
  
  const name = priceName.toLowerCase().trim()
  
  // Check for combo keywords
  return name.includes('combo') || 
         name.includes('bundle') || 
         (name.includes('entry') && name.includes('drink')) ||
         (name.includes('admission') && name.includes('drink'))
}

/**
 * Get ticket kinds for a combo ticket
 * @param {string} priceName - The name of the price/tier
 * @param {string} ticketKind - Optional ticket_kind value
 * @returns {string[]} - Array of ticket_kind values
 */
export function getComboTicketKinds(priceName, ticketKind = null) {
  // If ticket_kind is explicitly 'combo', return default combo kinds
  if (ticketKind === 'combo') {
    return getComboTicketKindsDefault()
  }
  
  if (!isComboTicket(priceName, ticketKind)) {
    return []
  }
  
  const name = priceName.toLowerCase().trim()
  const kinds = []
  
  // Always include entry ticket for combos
  if (name.includes('18') || name.includes('18-20')) {
    kinds.push('entry_18_20')
  } else {
    kinds.push('entry_21_plus')
  }
  
  // Include drink ticket if combo includes drinks
  if (name.includes('drink') || name.includes('beverage') || name.includes('bar')) {
    kinds.push('drink')
  }
  
  return kinds.length > 0 ? kinds : getComboTicketKindsDefault()
}

/**
 * Get display name for ticket kind
 * @param {string} ticketKind - The ticket_kind value
 * @returns {string} - Human-readable name
 */
export function getTicketKindDisplayName(ticketKind) {
  const displayNames = {
    'entry_18_20': 'Entry (18-20)',
    'entry_21_plus': 'Entry (21+)',
    'queue': 'Queue Pass',
    'drink': 'Drink Ticket',
    'combo': 'Combo (Entry + Drink)'
  }
  
  return displayNames[ticketKind] || ticketKind || 'Unknown'
}

/**
 * Get category name for ticket kind (for grouping)
 * @param {string} ticketKind - The ticket_kind value
 * @returns {string} - Category name
 */
export function getTicketKindCategoryName(ticketKind) {
  if (!ticketKind) return 'Other'
  
  // Entry tickets (both 18-20 and 21+)
  if (ticketKind === 'entry_18_20' || ticketKind === 'entry_21_plus') {
    return 'Entry Tickets'
  }
  
  // Drink ticket
  if (ticketKind === 'drink') {
    return 'Drink Tickets'
  }
  
  // Queue pass
  if (ticketKind === 'queue') {
    return 'Queue Pass'
  }
  
  return 'Other'
}

/**
 * Check if a ticket kind is a combo ticket
 * @param {string} ticketKind - The ticket_kind value
 * @returns {boolean} - true if it's a combo ticket
 */
export function isComboTicketKind(ticketKind) {
  return ticketKind === 'combo'
}

/**
 * Get ticket category for grouping in UI
 * @param {string} ticketKind - The ticket_kind value
 * @returns {string} - Category name: 'entry', 'queue', 'drink', 'combo'
 */
export function getTicketCategory(ticketKind) {
  if (!ticketKind) return 'other'
  
  if (ticketKind === 'entry_18_20' || ticketKind === 'entry_21_plus') {
    return 'entry'
  }
  
  if (ticketKind === 'queue') {
    return 'queue'
  }
  
  if (ticketKind === 'drink') {
    return 'drink'
  }
  
  if (ticketKind === 'combo') {
    return 'combo'
  }
  
  return 'other'
}

/**
 * Check if a ticket requires 21+ age restriction
 * @param {string} ticketKind - The ticket_kind value
 * @returns {boolean} - true if 21+ required
 */
export function requires21Plus(ticketKind) {
  if (!ticketKind) return false
  
  // Combo tickets always require 21+
  if (ticketKind === 'combo') {
    return true
  }
  
  // Entry 21+ requires 21+
  if (ticketKind === 'entry_21_plus') {
    return true
  }
  
  // Drink tickets require 21+
  if (ticketKind === 'drink') {
    return true
  }
  
  return false
}

/**
 * Get combo ticket kinds (entry + drink)
 * @returns {string[]} - Array of ticket_kind values for combo
 */
export function getComboTicketKindsDefault() {
  return ['entry_21_plus', 'drink']
}

