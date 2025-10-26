const request = require('supertest')
const app = require('../../backend/server')

describe('Backend Health Check', () => {
  it('responds to health check endpoint', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200)
    
    expect(response.body.status).toBe('ok')
    expect(response.body.timestamp).toBeDefined()
    expect(response.body.version).toBeDefined()
  })

  it('responds to API health check', async () => {
    const response = await request(app)
      .get('/v1/health')
      .expect(200)
    
    expect(response.body.success).toBe(true)
    expect(response.body.data).toBeDefined()
  })

  it('handles invalid routes gracefully', async () => {
    const response = await request(app)
      .get('/invalid-route')
      .expect(404)
    
    expect(response.body.success).toBe(false)
    expect(response.body.error).toBeDefined()
  })
})
