import { readFileSync } from 'fs'
import FormData from 'form-data'
import fetch from 'node-fetch'

// Test uploading a real image from Downloads
async function testRealImageUpload() {
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

    // Use a real image from Downloads
    const imagePath = '/home/eduardogarcia/Downloads/360_F_114122987_GPHj6mQNO9FdthRaH2SvE46WZpEhLIcS.webp'
    const imageBuffer = readFileSync(imagePath)
    
    console.log(`Image size: ${(imageBuffer.length / 1024).toFixed(2)} KB`)

    // Test uploading to product ID 2
    const productId = 2
    console.log(`Testing upload to product ${productId}...`)

    const formData = new FormData()
    formData.append('image', imageBuffer, {
      filename: 'house-image.webp',
      contentType: 'image/webp'
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

    if (uploadResponse.ok) {
      console.log('✅ Upload successful')
      const result = JSON.parse(uploadData)
      console.log('Image ID:', result.image.id)
      console.log('S3 Path:', result.image.image_url)
      
      // Test downloading the image
      console.log('\nTesting image download...')
      const downloadResponse = await fetch(`http://localhost:3001/api/products/${productId}/images/${result.image.id}`)
      console.log('Download status:', downloadResponse.status)
      
      if (downloadResponse.ok) {
        console.log('✅ Image download works')
        console.log('Content-Type:', downloadResponse.headers.get('content-type'))
        console.log('Content-Length:', downloadResponse.headers.get('content-length'))
      } else {
        console.log('❌ Image download failed')
      }
      
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

testRealImageUpload()