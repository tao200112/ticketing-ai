/**
 * Helper functions for ticket operations
 */

/**
 * Determine ticket_kind from price name
 * @param {string} priceName - The name of the price/tier
 * @returns {string|null} - ticket_kind value or null if not recognized
 * Returns new format: ENTRY_18_20, ENTRY_21_PLUS, ENTRY_LINE_SKIP, etc.
 */
export function getTicketKindFromPriceName(priceName) {
  if (!priceName) return null
  
  const name = priceName.toLowerCase().trim()
  
  // Entry tickets - new format
  if (name.includes('entry') && (name.includes('18') || name.includes('18-20'))) {
    return 'ENTRY_18_20'
  }
  if (name.includes('entry') && (name.includes('21') || name.includes('21+'))) {
    return 'ENTRY_21_PLUS'
  }
  
  // Line skip / Queue pass - new format
  if (name.includes('queue') || name.includes('skip') || name.includes('fast') || name.includes('line')) {
    return 'ENTRY_LINE_SKIP'
  }
  
  // Drink ticket - standalone drink tickets (not combo)
  if ((name.includes('drink') || name.includes('beverage') || name.includes('bar')) && !name.includes('combo')) {
    return 'DRINK_COMBO' // Standalone drink tickets use DRINK_COMBO kind
  }
  
  // Default to ENTRY_21_PLUS if it's a general entry ticket
  if (name.includes('entry') || name.includes('admission') || name.includes('ticket')) {
    return 'ENTRY_21_PLUS'
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
  // First check ticket_kind if provided (support both old and new formats)
  if (ticketKind === 'combo' || ticketKind === 'ENTRY_COMBO' || ticketKind === 'DRINK_COMBO') {
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
 * Combo tickets MUST create two separate tickets: ENTRY_COMBO and DRINK_COMBO
 * @param {string} priceName - The name of the price/tier
 * @param {string} ticketKind - Optional ticket_kind value
 * @returns {string[]} - Array of ticket_kind values [ENTRY_COMBO, DRINK_COMBO]
 */
export function getComboTicketKinds(priceName, ticketKind = null) {
  // If ticket_kind is explicitly 'combo' or combo-related, return default combo kinds
  if (ticketKind === 'combo' || ticketKind === 'ENTRY_COMBO' || ticketKind === 'DRINK_COMBO') {
    return getComboTicketKindsDefault()
  }
  
  if (!isComboTicket(priceName, ticketKind)) {
    return []
  }
  
  // Combo tickets ALWAYS create two tickets:
  // 1. ENTRY_COMBO (for door/security redemption)
  // 2. DRINK_COMBO (for bar redemption)
  // The entry type (18-20 vs 21+) is determined by the price name
  const name = priceName.toLowerCase().trim()
  const kinds = []
  
  // Determine entry type based on age restriction in price name
  if (name.includes('18') || name.includes('18-20')) {
    // For 18-20 combos, we still use ENTRY_COMBO (the age check happens at door)
    kinds.push('ENTRY_COMBO')
  } else {
    // Default to ENTRY_COMBO for 21+ combos
    kinds.push('ENTRY_COMBO')
  }
  
  // Always include drink ticket for combos
  kinds.push('DRINK_COMBO')
  
  return kinds.length > 0 ? kinds : getComboTicketKindsDefault()
}

/**
 * Get display name for ticket kind
 * @param {string} ticketKind - The ticket_kind value
 * @returns {string} - Human-readable name
 */
export function getTicketKindDisplayName(ticketKind) {
  if (!ticketKind) return 'Unknown'
  
  // Normalize to uppercase for new format
  const kind = ticketKind.toUpperCase()
  
  const displayNames = {
    // New format (uppercase)
    'ENTRY_18_20': '18–20 Entry',
    'ENTRY_21_PLUS': '21+ Entry',
    'ENTRY_LINE_SKIP': 'Line Skip',
    'ENTRY_COMBO': 'Combo – Entry',
    'DRINK_COMBO': 'Combo – Drink (Beer)',
    'OTHER': 'Other',
    // Legacy format (backward compatibility)
    'QUEUE': 'Line Skip',
    'DRINK': 'Drink Ticket',
    'COMBO': 'Combo (Entry + Drink)',
    'entry_18_20': '18–20 Entry',
    'entry_21_plus': '21+ Entry',
    'queue': 'Line Skip',
    'drink': 'Drink Ticket',
    'combo': 'Combo (Entry + Drink)'
  }
  
  return displayNames[kind] || displayNames[ticketKind] || ticketKind || 'Unknown'
}

/**
 * Get category name for ticket kind (for grouping)
 * @param {string} ticketKind - The ticket_kind value
 * @returns {string} - Category name: 'Entry Tickets', 'Drink Tickets', or 'Other'
 */
export function getTicketKindCategoryName(ticketKind) {
  if (!ticketKind) return 'Other'
  
  // Normalize to uppercase for comparison
  const kind = ticketKind.toUpperCase()
  
  // Entry tickets (all entry types including combo entry)
  if (kind === 'ENTRY_18_20' || kind === 'ENTRY_21_PLUS' || kind === 'ENTRY_LINE_SKIP' || kind === 'ENTRY_COMBO' ||
      kind === 'QUEUE' || kind === 'COMBO') {
    return 'Entry Tickets'
  }
  
  // Legacy format support
  if (ticketKind === 'entry_18_20' || ticketKind === 'entry_21_plus' || ticketKind === 'queue') {
    return 'Entry Tickets'
  }
  
  // Drink tickets (combo drink tickets)
  if (kind === 'DRINK_COMBO' || kind === 'DRINK' || ticketKind === 'drink') {
    return 'Drink Tickets'
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
 * Combo tickets MUST create two separate tickets
 * @returns {string[]} - Array of ticket_kind values [ENTRY_COMBO, DRINK_COMBO]
 */
export function getComboTicketKindsDefault() {
  return ['ENTRY_COMBO', 'DRINK_COMBO']
}

/**
 * Get redemption location for a ticket kind
 * @param {string} ticketKind - The ticket_kind value
 * @returns {string} - 'door' for entry tickets, 'bar' for drink tickets, 'other' otherwise
 */
export function getTicketRedemptionLocation(ticketKind) {
  if (!ticketKind) return 'other'
  
  const kind = ticketKind.toUpperCase()
  
  // All entry tickets are redeemed at door
  if (kind === 'ENTRY_18_20' || kind === 'ENTRY_21_PLUS' || kind === 'ENTRY_LINE_SKIP' || kind === 'ENTRY_COMBO' ||
      kind === 'QUEUE') {
    return 'door'
  }
  
  // Legacy format
  if (ticketKind === 'entry_18_20' || ticketKind === 'entry_21_plus' || ticketKind === 'queue') {
    return 'door'
  }
  
  // Drink tickets are redeemed at bar
  if (kind === 'DRINK_COMBO' || kind === 'DRINK' || ticketKind === 'drink') {
    return 'bar'
  }
  
  return 'other'
}

/**
 * Check if ticket is active (not used)
 * @param {Object} ticket - Ticket object
 * @returns {boolean} - true if ticket is active
 */
export function isTicketActive(ticket) {
  if (!ticket) return false
  return !ticket.used && ticket.status !== 'used'
}

