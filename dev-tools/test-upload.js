import { readFileSync } from 'fs'
import FormData from 'form-data'
import fetch from 'node-fetch'

// Test uploading an image to an existing product
async function testImageUpload() {
  try {
    // First, let's login to get a token
    console.log('Logging in...')
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@brm.com',
        password: 'admin123'
      })
    })

    const loginData = await loginResponse.json()
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginData.error}`)
    }

    const token = loginData.token
    console.log('✅ Login successful')

    // Create a small test image file (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
      0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ])

    // Test uploading to product ID 1
    const productId = 1
    console.log(`Testing upload to product ${productId}...`)

    const formData = new FormData()
    formData.append('image', testImageBuffer, {
      filename: 'test-image.png',
      contentType: 'image/png'
    })

    const uploadResponse = await fetch(`http://localhost:3001/api/products/${productId}/images`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })

    const uploadData = await uploadResponse.text()
    console.log('Upload response status:', uploadResponse.status)
    console.log('Upload response:', uploadData)

    if (uploadResponse.ok) {
      console.log('✅ Upload successful')
      
      // Check if image was saved to database
      console.log('\nChecking database...')
      const { exec } = await import('child_process')
      exec('psql postgresql://brm_user:brm_password@localhost:5432/brm_database -c "SELECT * FROM product_images WHERE product_id = 1;"', 
        (error, stdout, stderr) => {
          if (error) {
            console.error('Database check error:', error)
          } else {
            console.log('Database result:', stdout)
          }
        })
    } else {
      console.error('❌ Upload failed')
      try {
        const errorData = JSON.parse(uploadData)
        console.error('Error:', errorData)
      } catch {
        console.error('Raw response:', uploadData)
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testImageUpload()