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
 * @returns {boolean} - true if it's a combo ticket
 */
export function isComboTicket(priceName) {
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
 * @returns {string[]} - Array of ticket_kind values
 */
export function getComboTicketKinds(priceName) {
  if (!isComboTicket(priceName)) {
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
  
  return kinds.length > 0 ? kinds : ['entry_21_plus', 'drink']
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
    'drink': 'Drink Ticket'
  }
  
  return displayNames[ticketKind] || ticketKind || 'Unknown'
}

